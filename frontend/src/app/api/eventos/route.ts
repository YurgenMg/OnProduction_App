import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { CreateEventoDto, Evento } from '@/../../shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/eventos
 * Lista de eventos con cliente y totales.
 * Filtros opcionales: ?estado=COTIZACION&cliente_id=1
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado');
  const clienteId = searchParams.get('cliente_id');

  let query = supabase
    .from('eventos')
    .select(`
      *,
      cliente:clientes(id, nombre_razon_social, documento_identidad, telefono, email),
      detalles_equipos:evento_detalles_equipos(
        id, inventario_id, tarifa_dia_congelada, dias_cobrados, subtotal,
        instancia:inventario_instancias(serial_tag, catalogo:catalogo_equipos(sku, nombre_equipo))
      ),
      adicionales:evento_adicionales(id, tipo_adicional, descripcion, costo_facturado),
      operarios:evento_operarios(
        id, operario_id, horas_asignadas, subtotal, notas,
        operario:operarios(nombre_completo, especialidad)
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (estado) query = query.eq('estado', estado);
  if (clienteId) query = query.eq('cliente_id', Number(clienteId));

  const { data, error } = await query;

  if (error) {
    console.error('[GET /api/eventos]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/**
 * POST /api/eventos
 * Crea un evento en estado COTIZACION con sus ítems, adicionales y operarios.
 * La validación de overbooking ocurre SOLO al confirmar (trigger en DB).
 * En COTIZACION los ítems se guardan sin bloqueo físico.
 */
export async function POST(req: NextRequest) {
  let body: CreateEventoDto;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  // Validaciones
  if (!body.cliente_id || !body.fecha_inicio_evento || !body.fecha_fin_evento || !body.direccion_evento) {
    return NextResponse.json(
      { error: 'Campos requeridos: cliente_id, fecha_inicio_evento, fecha_fin_evento, direccion_evento.' },
      { status: 422 }
    );
  }

  if (new Date(body.fecha_fin_evento) <= new Date(body.fecha_inicio_evento)) {
    return NextResponse.json(
      { error: 'fecha_fin_evento debe ser posterior a fecha_inicio_evento.' },
      { status: 422 }
    );
  }

  // Obtener usuario autenticado
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userProfile } = await userClient
    .from('usuarios')
    .select('id')
    .is('deleted_at', null)
    .single();

  if (!userProfile) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 401 });
  }

  // Crear evento en COTIZACION
  const { data: evento, error: eventoError } = await supabase
    .from('eventos')
    .insert({
      cliente_id: body.cliente_id,
      usuario_id: userProfile.id,
      estado: 'COTIZACION',
      fecha_inicio_evento: body.fecha_inicio_evento,
      fecha_fin_evento: body.fecha_fin_evento,
      direccion_evento: body.direccion_evento.trim(),
    })
    .select()
    .single();

  if (eventoError) {
    console.error('[POST /api/eventos] Error creando evento:', eventoError);
    return NextResponse.json({ error: eventoError.message }, { status: 500 });
  }

  const eventoId = (evento as Evento).id;

  // Insertar ítems de inventario (sin validación de overbooking en COTIZACION)
  if (body.items && body.items.length > 0) {
    const detalles = body.items.map((item) => ({
      evento_id: eventoId,
      inventario_id: item.inventario_id,
      tarifa_dia_congelada: item.tarifa_dia_congelada,
      dias_cobrados: item.dias_cobrados,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('evento_detalles_equipos')
      .insert(detalles);

    if (itemsError) {
      console.error('[POST /api/eventos] Error insertando ítems:', itemsError);
      // Soft-rollback: eliminar el evento creado
      await supabase.from('eventos').delete().eq('id', eventoId);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
  }

  // Insertar adicionales (opcionales)
  if (body.adicionales && body.adicionales.length > 0) {
    const adicionales = body.adicionales.map((a) => ({
      evento_id: eventoId,
      tipo_adicional: a.tipo_adicional,
      descripcion: a.descripcion,
      costo_facturado: a.costo_facturado,
    }));

    const { error: adicionalesError } = await supabase
      .from('evento_adicionales')
      .insert(adicionales);

    if (adicionalesError) {
      console.error('[POST /api/eventos] Error insertando adicionales:', adicionalesError);
    }
  }

  // Insertar operarios (opcionales)
  if (body.operarios && body.operarios.length > 0) {
    const operarios = body.operarios.map((o) => ({
      evento_id: eventoId,
      operario_id: o.operario_id,
      horas_asignadas: o.horas_asignadas,
      subtotal: o.subtotal,
    }));

    const { error: operariosError } = await supabase
      .from('evento_operarios')
      .insert(operarios);

    if (operariosError) {
      console.error('[POST /api/eventos] Error insertando operarios:', operariosError);
    }
  }

  // Retornar el evento completo recién creado
  const { data: eventoCompleto, error: fetchError } = await supabase
    .from('eventos')
    .select(`
      *,
      cliente:clientes(id, nombre_razon_social, documento_identidad),
      detalles_equipos:evento_detalles_equipos(*),
      adicionales:evento_adicionales(*),
      operarios:evento_operarios(*, operario:operarios(nombre_completo, especialidad))
    `)
    .eq('id', eventoId)
    .single();

  if (fetchError) {
    return NextResponse.json({ id: eventoId, message: 'Evento creado.' }, { status: 201 });
  }

  return NextResponse.json(eventoCompleto, { status: 201 });
}
