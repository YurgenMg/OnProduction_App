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

// GET: Obtener historial de compras
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
    const { data: compras, error } = await adminClient
      .from('compras_inventario')
      .select(`
        id,
        catalogo_id,
        cantidad,
        costo_compra_total,
        proveedor,
        fecha_compra,
        created_at,
        catalogo:catalogo_equipos(
          nombre_equipo,
          sku,
          categoria
        )
      `)
      .is('deleted_at', null)
      .order('fecha_compra', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(compras);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}

// POST: Registrar compra e ingresar lote de unidades físicas con serial incremental
export async function POST(request: NextRequest) {
  try {
    const authCheck = await verificarAdministrador(request);
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { catalogo_id, cantidad, costo_compra_total, proveedor, fecha_compra } = body;

    if (!catalogo_id || !cantidad || costo_compra_total === undefined || !proveedor) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (catalogo_id, cantidad, costo_compra_total, proveedor)' }, { status: 400 });
    }

    const numCantidad = parseInt(cantidad, 10);
    const numCosto = parseFloat(costo_compra_total);

    if (isNaN(numCantidad) || numCantidad <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser un número entero mayor a 0' }, { status: 400 });
    }

    if (isNaN(numCosto) || numCosto < 0) {
      return NextResponse.json({ error: 'El costo de compra debe ser un número mayor o igual a 0' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // Llamar a la función transaccional de base de datos que maneja bloqueos de concurrencia y seriales
    const { data, error: rpcError } = await adminClient.rpc('registrar_compra_lote', {
      p_catalogo_id: parseInt(catalogo_id, 10),
      p_cantidad: numCantidad,
      p_costo_compra_total: numCosto,
      p_proveedor: proveedor,
      p_fecha_compra: fecha_compra ? new Date(fecha_compra).toISOString() : new Date().toISOString()
    });

    if (rpcError) {
      return NextResponse.json({ error: `Error en la transacción de base de datos: ${rpcError.message}` }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      compra: {
        id: data.compra_id,
        catalogo_id,
        cantidad: data.unidades_creadas,
        costo_compra_total: numCosto,
        proveedor,
        fecha_compra: fecha_compra || new Date().toISOString()
      },
      unidades_creadas: data.unidades_creadas,
      serial_inicial: data.serial_inicial,
      serial_final: data.serial_final
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor', details: err.message }, { status: 500 });
  }
}
