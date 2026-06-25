import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ItemDisponible } from '@/../../shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/inventario/disponibilidad
 * Llama al RPC obtener_items_disponibles para retornar ítems con su estado
 * de disponibilidad en un rango de fechas.
 *
 * Query params:
 *   - fecha_inicio: ISO datetime (requerido)
 *   - fecha_fin:    ISO datetime (requerido)
 *   - evento_id:    número (opcional, para excluir el evento actual en edición)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fechaInicio = searchParams.get('fecha_inicio');
  const fechaFin = searchParams.get('fecha_fin');
  const eventoId = searchParams.get('evento_id');

  if (!fechaInicio || !fechaFin) {
    return NextResponse.json(
      { error: 'Parámetros requeridos: fecha_inicio y fecha_fin.' },
      { status: 400 }
    );
  }

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return NextResponse.json({ error: 'Fechas inválidas.' }, { status: 400 });
  }

  if (fin <= inicio) {
    return NextResponse.json(
      { error: 'fecha_fin debe ser posterior a fecha_inicio.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc('obtener_items_disponibles', {
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin,
    p_evento_id: eventoId ? Number(eventoId) : null,
  });

  if (error) {
    console.error('[GET /api/inventario/disponibilidad]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as ItemDisponible[], { status: 200 });
}
