import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { UpdateEventoEstadoDto } from '@/../../shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Transiciones de estado válidas */
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  COTIZACION:            ['CONFIRMADO_RESERVADO'],
  CONFIRMADO_RESERVADO:  ['EN_TRANSITO', 'COTIZACION'],
  EN_TRANSITO:           ['FINALIZADO'],
  FINALIZADO:            ['PAGADO_CERRADO'],
  PAGADO_CERRADO:        [],
};

/**
 * GET /api/eventos/[id]
 * Retorna el detalle completo de un evento.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('eventos')
    .select(`
      *,
      cliente:clientes(id, nombre_razon_social, documento_identidad, email, telefono, direccion),
      detalles_equipos:evento_detalles_equipos(
        id, inventario_id, tarifa_dia_congelada, dias_cobrados, subtotal, deleted_at,
        instancia:inventario_instancias(serial_tag, estado_operativo,
          catalogo:catalogo_equipos(sku, nombre_equipo, tarifa_dia_base))
      ),
      adicionales:evento_adicionales(id, tipo_adicional, descripcion, costo_facturado, deleted_at),
      operarios:evento_operarios(
        id, operario_id, horas_asignadas, subtotal, notas, deleted_at,
        operario:operarios(nombre_completo, especialidad, telefono)
      ),
      transacciones:transacciones_caja(id, tipo, monto, fecha, descripcion,
        metodo_pago:metodos_pago(nombre))
    `)
    .eq('id', Number(id))
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }
    console.error(`[GET /api/eventos/${id}]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/**
 * PATCH /api/eventos/[id]
 * Cambia el estado de un evento validando la máquina de estados.
 * El trigger de la BD valida el overbooking al confirmar.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: UpdateEventoEstadoDto;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!body.estado) {
    return NextResponse.json({ error: 'Campo requerido: estado.' }, { status: 422 });
  }

  // Obtener estado actual
  const { data: eventoActual, error: fetchError } = await supabase
    .from('eventos')
    .select('id, estado')
    .eq('id', Number(id))
    .is('deleted_at', null)
    .single();

  if (fetchError || !eventoActual) {
    return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
  }

  const estadosPermitidos = TRANSICIONES_VALIDAS[eventoActual.estado] ?? [];
  if (!estadosPermitidos.includes(body.estado)) {
    return NextResponse.json(
      {
        error: `Transición inválida: ${eventoActual.estado} → ${body.estado}. Transiciones permitidas: [${estadosPermitidos.join(', ')}].`,
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from('eventos')
    .update({ estado: body.estado, updated_at: new Date().toISOString() })
    .eq('id', Number(id))
    .select()
    .single();

  if (error) {
    // Capturar errores de overbooking desde el trigger de BD (código P0001)
    if (error.code === 'P0001') {
      return NextResponse.json(
        { error: error.message, tipo: 'CONFLICTO_OVERBOOKING' },
        { status: 409 }
      );
    }
    console.error(`[PATCH /api/eventos/${id}]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/**
 * DELETE /api/eventos/[id]
 * Soft delete de un evento — solo si está en estado COTIZACION.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: eventoActual } = await supabase
    .from('eventos')
    .select('id, estado')
    .eq('id', Number(id))
    .is('deleted_at', null)
    .single();

  if (!eventoActual) {
    return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
  }

  if (eventoActual.estado !== 'COTIZACION') {
    return NextResponse.json(
      { error: `No se puede eliminar un evento en estado "${eventoActual.estado}". Solo es posible en COTIZACION.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('eventos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', Number(id));

  if (error) {
    console.error(`[DELETE /api/eventos/${id}]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Evento eliminado.' }, { status: 200 });
}
