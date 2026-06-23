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

// Cliente administrador para realizar operaciones de storage y DB sin restricciones RLS
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

// GET: Obtener la configuración actual de la empresa (Público para usuarios autenticados)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseClient = getClientForToken(token);

    const { data: config, error } = await supabaseClient
      .from('configuracion_empresa')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}

// POST: Actualizar configuración y subir logotipo
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAdministrador(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { 
      nombre_empresa, 
      eslogan, 
      nit, 
      telefono, 
      email, 
      direccion, 
      logo_base64, 
      logo_filename, 
      logo_mime 
    } = body;

    if (!nombre_empresa || !nit || !telefono || !email) {
      return NextResponse.json({ error: 'Nombre de empresa, NIT, teléfono y email son obligatorios' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    let logoUrl = body.logo_url || null;

    // Procesar carga de logotipo si viene en formato base64
    if (logo_base64 && logo_filename && logo_mime) {
      try {
        // 1. Asegurar existencia del bucket público "empresa_assets"
        const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();
        if (bucketsError) throw bucketsError;

        const bucketExists = buckets.some(b => b.name === 'empresa_assets');
        if (!bucketExists) {
          console.log('Creando bucket público "empresa_assets"...');
          const { error: createBucketError } = await adminClient.storage.createBucket('empresa_assets', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
          });
          if (createBucketError) throw createBucketError;
        }

        // 2. Decodificar la imagen base64
        const buffer = Buffer.from(logo_base64, 'base64');
        const fileExt = logo_filename.split('.').pop();
        const filePath = `logo_empresa_${Date.now()}.${fileExt}`;

        // 3. Subir el archivo al Storage
        const { error: uploadError } = await adminClient.storage
          .from('empresa_assets')
          .upload(filePath, buffer, {
            contentType: logo_mime,
            upsert: true
          });

        if (uploadError) throw uploadError;

        // 4. Obtener la URL pública del archivo
        const { data: { publicUrl } } = adminClient.storage
          .from('empresa_assets')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
        console.log('Logotipo subido y disponible en:', logoUrl);
      } catch (uploadErr: any) {
        console.error('Error durante la subida del logotipo:', uploadErr);
        return NextResponse.json({ error: 'Error al subir el logotipo al Storage: ' + uploadErr.message }, { status: 400 });
      }
    }

    // Guardar los cambios en la base de datos (id = 1)
    const { data: updatedConfig, error: dbError } = await adminClient
      .from('configuracion_empresa')
      .upsert({
        id: 1,
        nombre_empresa,
        eslogan,
        nit,
        telefono,
        email,
        direccion,
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: 'Error al actualizar configuración en DB: ' + dbError.message }, { status: 400 });
    }

    return NextResponse.json(updatedConfig);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}
