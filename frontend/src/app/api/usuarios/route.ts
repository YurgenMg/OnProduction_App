import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente temporal de cliente para validar el token del usuario
const getClientForToken = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Cliente administrador para realizar operaciones privilegiadas
const getAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Función helper para validar si el token corresponde a un Administrador
async function verificarAdministrador(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No autorizado: Token ausente o inválido', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const supabaseClient = getClientForToken(token);

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    return { error: 'No autorizado: Token expirado o inválido', status: 401 };
  }

  // Buscar el perfil y rol del usuario en la tabla pública usuarios
  const { data: profile, error: dbError } = await supabaseClient
    .from('usuarios')
    .select('id, email, rol:roles(nombre)')
    .eq('email', user.email)
    .is('deleted_at', null)
    .single();

  if (dbError || !profile) {
    return { error: 'Acceso denegado: Usuario no registrado o inactivo en el sistema', status: 403 };
  }

  const userRole = (profile.rol as any)?.nombre;
  if (userRole !== 'Administrador') {
    return { error: 'Acceso denegado: Se requieren privilegios de Administrador', status: 403 };
  }

  return { authorized: true, userEmail: user.email };
}

// GET: Listar todos los usuarios activos
export async function GET(request: NextRequest) {
  try {
    const authCheck = await verificarAdministrador(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const adminClient = getAdminClient();
    const { data: users, error } = await adminClient
      .from('usuarios')
      .select('id, nombre_completo, email, created_at, rol:roles(id, nombre)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}

// POST: Crear un nuevo usuario en Supabase Auth y la tabla pública usuarios
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAdministrador(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { email, password, nombre_completo, rol_id } = body;

    if (!email || !password || !nombre_completo || !rol_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (email, password, nombre_completo, rol_id)' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Crear el usuario en Supabase Auth usando el API de Administración
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo }
    });

    if (authError) {
      return NextResponse.json({ error: `Error en Auth: ${authError.message}` }, { status: 400 });
    }

    const newAuthUser = authData.user;

    // 2. Insertar el perfil del usuario en la tabla pública de usuarios
    const { data: publicUser, error: dbError } = await adminClient
      .from('usuarios')
      .insert({
        nombre_completo,
        email,
        password_hash: '$2a$10$AuthAdminUserMockHash', // Mock para cumplir la restricción schema DDL
        rol_id: parseInt(rol_id),
      })
      .select('id, nombre_completo, email, created_at, rol:roles(id, nombre)')
      .single();

    // Si falla la base de datos pública, hacemos rollback borrando el usuario de Auth para evitar inconsistencias
    if (dbError) {
      console.error('Error insertando en la tabla usuarios de la app, revirtiendo Auth:', dbError);
      await adminClient.auth.admin.deleteUser(newAuthUser.id);
      return NextResponse.json({ error: `Error en Base de Datos: ${dbError.message}` }, { status: 400 });
    }

    return NextResponse.json(publicUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}

// DELETE: Desactivar un usuario (Soft Delete)
export async function DELETE(request: NextRequest) {
  try {
    const authCheck = await verificarAdministrador(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get('id');

    if (!userIdStr) {
      return NextResponse.json({ error: 'Se requiere el parámetro ID del usuario a desactivar' }, { status: 400 });
    }

    const userId = parseInt(userIdStr);
    const adminClient = getAdminClient();

    // 1. Obtener la información del usuario antes de desactivar para auditoría/rollback de Auth si se requiere
    const { data: userProfile, error: getError } = await adminClient
      .from('usuarios')
      .select('email')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (getError || !userProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado o ya desactivado' }, { status: 404 });
    }

    // 2. Realizar soft delete en la tabla usuarios de la app
    const { error: deleteError } = await adminClient
      .from('usuarios')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (deleteError) {
      return NextResponse.json({ error: `Error al desactivar en DB: ${deleteError.message}` }, { status: 400 });
    }

    // Nota: Dejamos el usuario en Supabase Auth intacto para mantener consistencia de auditoría histórica,
    // pero al estar en deleted_at en la tabla de perfiles de usuarios de la app, su get_current_user_role()
    // devolverá null y el sistema denegará su acceso inmediatamente.

    return NextResponse.json({ success: true, message: 'Usuario desactivado exitosamente del sistema' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}
