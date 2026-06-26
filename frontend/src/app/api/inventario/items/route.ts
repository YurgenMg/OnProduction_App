import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/inventario/items
 * Lista catálogo de equipos con instancias activas y categoría.
 * Filtros: ?categoria_id=1&estado=DISPONIBLE&q=amplificador
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoriaId = searchParams.get('categoria_id');
  const estado = searchParams.get('estado');
  const q = searchParams.get('q')?.trim();

  // ── OPTIMIZACIÓN: filtrar instancias activas directamente en la query ──
  // Evita traer todos los registros de instancias para filtrarlos en JS
  let catalogoQuery = supabase
    .from('catalogo_equipos')
    .select(`
      id, sku, nombre_equipo, categoria, categoria_id, tarifa_dia_base,
      categoria_detalle:categorias_inventario!catalogo_equipos_categoria_id_fkey(
        id, nombre, parent_id, nivel, prefijo_sku,
        padre:categorias_inventario!categorias_inventario_parent_id_fkey(id, nombre)
      ),
      instancias:inventario_instancias!inner(id, serial_tag, estado_operativo, notas_condicion)
    `)
    .is('deleted_at', null)
    .is('instancias.deleted_at', null)
    .order('nombre_equipo');

  if (categoriaId) catalogoQuery = catalogoQuery.eq('categoria_id', Number(categoriaId));
  if (q) catalogoQuery = catalogoQuery.ilike('nombre_equipo', `%${q}%`);
  if (estado) catalogoQuery = catalogoQuery.eq('instancias.estado_operativo', estado);

  const { data, error } = await catalogoQuery;

  if (error) {
    console.error('[GET /api/inventario/items]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    status: 200,
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
  });
}

/**
 * POST /api/inventario/items
 * Crea un nuevo ítem en el catálogo (CatalogoEquipo) y opcionalmente
 * una instancia física (InventarioInstancia).
 */
export async function POST(req: NextRequest) {
  let body: {
    sku: string;
    nombre_equipo: string;
    categoria_id: number;
    tarifa_dia_base: number;
    serial_tag?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!body.sku || !body.nombre_equipo || !body.categoria_id || !body.tarifa_dia_base) {
    return NextResponse.json(
      { error: 'Campos requeridos: sku, nombre_equipo, categoria_id, tarifa_dia_base.' },
      { status: 422 }
    );
  }

  // ── OPTIMIZACIÓN: verificar SKU y obtener categoría en paralelo ──
  const skuNorm = body.sku.toUpperCase().trim();
  const [{ data: existente }, { data: categoria }] = await Promise.all([
    supabase
      .from('catalogo_equipos')
      .select('id')
      .eq('sku', skuNorm)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('categorias_inventario')
      .select('nombre, parent_id, nivel')
      .eq('id', body.categoria_id)
      .single(),
  ]);

  if (existente) {
    return NextResponse.json(
      { error: `Ya existe un ítem con el SKU "${body.sku}".` },
      { status: 409 }
    );
  }

  const { data: catalogo, error: catalogoError } = await supabase
    .from('catalogo_equipos')
    .insert({
      sku: skuNorm,
      nombre_equipo: body.nombre_equipo.trim(),
      categoria: categoria?.nombre ?? 'Sin categoría',
      categoria_id: body.categoria_id,
      tarifa_dia_base: body.tarifa_dia_base,
    })
    .select()
    .single();

  if (catalogoError) {
    console.error('[POST /api/inventario/items]', catalogoError);
    return NextResponse.json({ error: catalogoError.message }, { status: 500 });
  }

  // Si se provee serial_tag, crear instancia física inmediatamente
  if (body.serial_tag) {
    const { error: instanciaError } = await supabase
      .from('inventario_instancias')
      .insert({
        catalogo_id: catalogo.id,
        serial_tag: body.serial_tag.trim().toUpperCase(),
        estado_operativo: 'DISPONIBLE',
      });

    if (instanciaError) {
      console.error('[POST /api/inventario/items] Error creando instancia:', instanciaError);
      // El catálogo se crea aunque falle la instancia — no es bloqueante
    }
  }

  return NextResponse.json(catalogo, { status: 201 });
}
