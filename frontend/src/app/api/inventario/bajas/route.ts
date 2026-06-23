import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente temporal para validar el token del usuario
const getClientForToken = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Cliente administrador para realizar operaciones sin restricciones RLS
const getAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Verificar si el token corresponde a un Administrador
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

  const { data: profile, error: dbError } = await supabaseClient
    .from('usuarios')
    .select('id, rol:roles(nombre)')
    .eq('email', user.email)
    .is('deleted_at', null)
    .single();

  if (dbError || !profile) {
    return { error: 'Acceso denegado: Usuario no registrado o inactivo', status: 403 };
  }

  const userRole = (profile.rol as any)?.nombre;
  if (userRole !== 'Administrador') {
    return { error: 'Acceso denegado: Se requieren privilegios de Administrador', status: 403 };
  }

  return { authorized: true };
}

// GET: Obtener historial de bajas
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseClient = getClientForToken(token);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado: Token inválido' }, { status: 401 });
    }

    const adminClient = getAdminClient();
    const { data: bajas, error } = await adminClient
      .from('bajas_inventario')
      .select(`
        id,
        inventario_id,
        motivo_baja,
        fecha_baja,
        created_at,
        instancia:inventario_instancias(
          serial_tag,
          catalogo:catalogo_equipos(
            nombre_equipo,
            sku,
            categoria
          )
        )
      `)
      .is('deleted_at', null)
      .order('fecha_baja', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(bajas);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}

// POST: Registrar la baja de una unidad física (daño/pérdida)
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAdministrador(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { inventario_id, motivo_baja, fecha_baja } = body;

    if (!inventario_id || !motivo_baja) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (inventario_id, motivo_baja)' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Obtener la unidad física para validar su existencia y estado actual
    const { data: instance, error: fetchError } = await adminClient
      .from('inventario_instancias')
      .select('id, estado_operativo, serial_tag, notes_condicion')
      .eq('id', inventario_id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !instance) {
      return NextResponse.json({ error: 'La unidad física especificada no existe o fue desactivada.' }, { status: 404 });
    }

    if (instance.estado_operativo === 'DADO_DE_BAJA') {
      return NextResponse.json({ error: 'Esta unidad física ya fue dada de baja anteriormente.' }, { status: 400 });
    }

    // 2. Registrar la baja en bajas_inventario
    const { data: bajaRecord, error: insertBajaError } = await adminClient
      .from('bajas_inventario')
      .insert({
        inventario_id,
        motivo_baja,
        fecha_baja: fecha_baja || new Date().toISOString()
      })
      .select()
      .single();

    if (insertBajaError) {
      return NextResponse.json({ error: `Error al registrar la baja: ${insertBajaError.message}` }, { status: 400 });
    }

    // 3. Cambiar el estado operativo de la instancia a DADO_DE_BAJA
    const dateStr = new Date().toLocaleDateString('es-CO');
    const newNotes = instance.notes_condicion 
      ? `${instance.notes_condicion} | RETIRADO DEL SERVICIO: ${motivo_baja} (${dateStr})`
      : `RETIRADO DEL SERVICIO: ${motivo_baja} (${dateStr})`;

    const { error: updateError } = await adminClient
      .from('inventario_instancias')
      .update({
        estado_operativo: 'DADO_DE_BAJA',
        notes_condicion: newNotes
      })
      .eq('id', inventario_id);

    if (updateError) {
      console.error('Error al actualizar unidad física. Revirtiendo registro de baja:', updateError);
      
      // Rollback
      await adminClient
        .from('bajas_inventario')
        .delete()
        .eq('id', bajaRecord.id);

      return NextResponse.json({ error: `Error al actualizar la unidad a estado retirado: ${updateError.message}` }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      baja: bajaRecord,
      serial_tag: instance.serial_tag
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}
