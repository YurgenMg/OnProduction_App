import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Cliente, CreateEventoDto } from '@/../../shared/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/clientes
 * Lista clientes activos con su saldo de cartera.
 * Soporta búsqueda por ?q=nombre_o_nit
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  let query = supabase
    .from('clientes')
    .select(`
      *,
      cartera:carteras_cliente(saldo_pendiente, ultima_transaccion_at)
    `)
    .is('deleted_at', null)
    .order('nombre_razon_social');

  if (q) {
    query = query.or(
      `nombre_razon_social.ilike.%${q}%,documento_identidad.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('[GET /api/clientes]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/**
 * POST /api/clientes
 * Crea un nuevo cliente validando unicidad del documento.
 */
export async function POST(req: NextRequest) {
  let body: Partial<Cliente>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const required = ['tipo_cliente', 'documento_identidad', 'nombre_razon_social', 'email', 'telefono'];
  for (const field of required) {
    if (!body[field as keyof Cliente]) {
      return NextResponse.json(
        { error: `Campo requerido: ${field}.` },
        { status: 422 }
      );
    }
  }

  // Verificar duplicidad de documento
  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .eq('documento_identidad', body.documento_identidad!)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Ya existe un cliente con el documento "${body.documento_identidad}".` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      tipo_cliente: body.tipo_cliente,
      documento_identidad: body.documento_identidad!.trim(),
      nombre_razon_social: body.nombre_razon_social!.trim(),
      nombres_contacto: body.nombres_contacto ?? null,
      apellidos_contacto: body.apellidos_contacto ?? null,
      email: body.email!.trim().toLowerCase(),
      telefono: body.telefono!.trim(),
      direccion: body.direccion ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/clientes]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
