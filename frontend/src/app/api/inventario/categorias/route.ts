import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { CategoriaConSubcategorias } from '@/../../shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/inventario/categorias
 * Retorna árbol de categorías (nivel 1 con subcategorías nivel 2 anidadas).
 */
export async function GET() {
  // Obtener todas las categorías activas
  const { data: todas, error } = await supabase
    .from('categorias_inventario')
    .select('id, nombre, descripcion, parent_id, nivel, prefijo_sku, created_at, updated_at, deleted_at')
    .is('deleted_at', null)
    .order('nombre');

  if (error) {
    console.error('[GET /api/inventario/categorias]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Construir árbol: raíces con subcategorías anidadas
  const raices = (todas ?? []).filter((c) => c.nivel === 1);
  const arbol: CategoriaConSubcategorias[] = raices.map((raiz) => ({
    ...raiz,
    subcategorias: (todas ?? []).filter((c) => c.parent_id === raiz.id),
  }));

  // Árbol de categorías — cambia rarísimo, cachear 2 minutos
  return NextResponse.json(arbol, {
    status: 200,
    headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' },
  });
}
