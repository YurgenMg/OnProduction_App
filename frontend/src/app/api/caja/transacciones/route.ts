import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { CreateTransaccionDto, TransaccionCaja } from '@/../../shared/types';

// ── Singleton: evitar crear un cliente nuevo en cada request ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/caja/transacciones
 * Lista transacciones con filtros opcionales por fecha, tipo o cliente.
 * Paginado a 200 registros por defecto para evitar payloads gigantes.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fechaDesde = searchParams.get('fecha_desde');
  const fechaHasta = searchParams.get('fecha_hasta');
  const clienteId = searchParams.get('cliente_id');
  const eventoId = searchParams.get('evento_id');
  const limit = Math.min(Number(searchParams.get('limit') ?? 200), 500);

  let query = supabase
    .from('transacciones_caja')
    .select(`
      *,
      metodo_pago:metodos_pago(id, nombre),
      cliente:clientes(id, nombre_razon_social, documento_identidad),
      evento:eventos(id, direccion_evento, estado)
    `)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (fechaDesde) query = query.gte('fecha', fechaDesde);
  if (fechaHasta) query = query.lte('fecha', fechaHasta);
  if (clienteId) query = query.eq('cliente_id', Number(clienteId));
  if (eventoId) query = query.eq('evento_id', Number(eventoId));

  const { data, error } = await query;

  if (error) {
    console.error('[GET /api/caja/transacciones]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' }, // datos financieros — nunca cachear
  });
}

/**
 * POST /api/caja/transacciones
 * Registra una nueva transacción de caja.
 * Las transacciones son INMUTABLES: no existe PATCH ni DELETE.
 * Las correcciones se realizan mediante contra-asientos (tipo REVERSION).
 */
export async function POST(req: NextRequest) {
  let body: CreateTransaccionDto;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!body.tipo || !body.monto || !body.metodo_pago_id || !body.descripcion) {
    return NextResponse.json(
      { error: 'Campos requeridos: tipo, monto, metodo_pago_id, descripcion.' },
      { status: 422 }
    );
  }

  if (body.monto <= 0) {
    return NextResponse.json(
      { error: 'El monto debe ser mayor a cero.' },
      { status: 422 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // ── OPTIMIZACIÓN: verificar usuario con service_role usando el JWT directamente ──
  // Evita crear un segundo cliente Supabase por request
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }

  // Verificar que el usuario existe en la tabla local (query directa con UUID)
  const { data: userProfile } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!userProfile) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 401 });
  }

  const payload: Omit<TransaccionCaja, 'id' | 'created_at'> = {
    tipo: body.tipo,
    monto: body.monto,
    fecha: body.fecha || new Date().toISOString().split('T')[0],
    metodo_pago_id: body.metodo_pago_id,
    evento_id: body.evento_id ?? null,
    cliente_id: body.cliente_id ?? null,
    descripcion: body.descripcion.trim(),
    referencia_externa: body.referencia_externa ?? null,
    reversion_de_id: body.reversion_de_id ?? null,
    usuario_registro_id: userProfile.id,
  };

  const { data, error } = await supabase
    .from('transacciones_caja')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[POST /api/caja/transacciones]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

