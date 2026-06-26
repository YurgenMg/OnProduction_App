import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { MetodoPago } from '@/../../shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/caja/metodos-pago
 * Retorna el catálogo de métodos de pago activos.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('metodos_pago')
    .select('id, nombre, descripcion, activo')
    .eq('activo', true)
    .is('deleted_at', null)
    .order('nombre');

  if (error) {
    console.error('[GET /api/caja/metodos-pago]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Catálogo estático — cachear 5 minutos en el cliente, revalidar en background
  return NextResponse.json(data as MetodoPago[], {
    status: 200,
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  });
}
