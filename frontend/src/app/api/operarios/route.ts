import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Operario } from '@/../../shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/operarios
 * Lista operarios activos ordenados por nombre.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('operarios')
    .select('id, nombre_completo, telefono, especialidad, tarifa_dia, activo, created_at, updated_at, deleted_at')
    .is('deleted_at', null)
    .eq('activo', true)
    .order('nombre_completo');

  if (error) {
    console.error('[GET /api/operarios]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Operario[], { status: 200 });
}
