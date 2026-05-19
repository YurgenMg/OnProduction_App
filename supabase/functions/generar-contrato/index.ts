import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 1. Validar presencia del JWT del usuario
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Falta la cabecera de Autorización (JWT requerido)" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Extraer parámetros del body
    const { evento_id } = await req.json()
    if (!evento_id) {
      return new Response(
        JSON.stringify({ error: "El parámetro evento_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Crear cliente de Supabase con el JWT del usuario autenticado (hereda políticas RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // 4. Consultar datos relacionales del evento
    const { data: evento, error: queryError } = await supabaseClient
      .from("eventos")
      .select(`
        id,
        estado,
        fecha_inicio_evento,
        fecha_fin_evento,
        direccion_evento,
        total_equipos,
        total_adicionales,
        gran_total,
        clientes (
          tipo_cliente,
          documento_identidad,
          nombre_razon_social,
          nombres_contacto,
          apellidos_contacto,
          email,
          telefono,
          direccion
        ),
        evento_detalles_equipos (
          id,
          tarifa_dia_congelada,
          dias_cobrados,
          subtotal,
          inventario_instancias (
            serial_tag,
            catalogo_equipos (
              sku,
              nombre_equipo,
              categoria
            )
          )
        ),
        evento_adicionales (
          id,
          tipo_adicional,
          descripcion,
          costo_facturado
        )
      `)
      .eq("id", evento_id)
      .single()

    if (queryError || !evento) {
      return new Response(
        JSON.stringify({ error: "Evento no encontrado o acceso denegado por políticas RLS", details: queryError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 5. Validar estado del evento para la firma de contratos
    if (evento.estado === "COTIZACION") {
      return new Response(
        JSON.stringify({ error: "No es posible generar un contrato legal para eventos en estado COTIZACION." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 6. Generar el stream del contrato de alquiler en formato texto simulado (Buffer final PDF)
    const encoder = new TextEncoder()
    const pdfStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`%PDF-1.4\n`))
        controller.enqueue(encoder.encode(`% CONTRATO DE ARRENDAMIENTO DE EQUIPOS Y LOGÍSTICA\n`))
        controller.enqueue(encoder.encode(`% EVENTO ID: ${evento.id}\n`))
        controller.enqueue(encoder.encode(`=====================================================\n`))
        controller.enqueue(encoder.encode(`CLIENTE ARRENDATARIO: ${evento.clientes.nombre_razon_social} (${evento.clientes.tipo_cliente}: ${evento.clientes.documento_identidad})\n`))
        controller.enqueue(encoder.encode(`REPRESENTANTE: ${evento.clientes.nombres_contacto ?? ''} ${evento.clientes.apellidos_contacto ?? ''}\n`))
        controller.enqueue(encoder.encode(`FECHA INICIO: ${evento.fecha_inicio_evento} | FECHA FIN: ${evento.fecha_fin_evento}\n`))
        controller.enqueue(encoder.encode(`DIRECCIÓN OPERACIÓN: ${evento.direccion_evento}\n`))
        controller.enqueue(encoder.encode(`=====================================================\n\n`))
        
        controller.enqueue(encoder.encode(`1. DETALLES DE EQUIPOS SERIALIZADOS ASIGNADOS:\n`))
        evento.evento_detalles_equipos.forEach((det: any) => {
          const eq = det.inventario_instancias.catalogo_equipos
          controller.enqueue(encoder.encode(`   - [${eq.sku}] ${eq.nombre_equipo} (Serial: ${det.inventario_instancias.serial_tag}) x ${det.dias_cobrados} días @ $${det.tarifa_dia_congelada}/día = $${det.subtotal}\n`))
        })

        if (evento.evento_adicionales && evento.evento_adicionales.length > 0) {
          controller.enqueue(encoder.encode(`\n2. COSTOS ADICIONALES Y LOGÍSTICA:\n`))
          evento.evento_adicionales.forEach((adi: any) => {
            controller.enqueue(encoder.encode(`   - [${adi.tipo_adicional}] ${adi.descripcion}: $${adi.costo_facturado}\n`))
          })
        }

        controller.enqueue(encoder.encode(`\n3. RESUMEN FINANCIERO CONSOLIDADO:\n`))
        controller.enqueue(encoder.encode(`   - Subtotal Equipos: $${evento.total_equipos}\n`))
        controller.enqueue(encoder.encode(`   - Adicionales/Servicios: $${evento.total_adicionales}\n`))
        controller.enqueue(encoder.encode(`   - VALOR TOTAL DEL CONTRATO: $${evento.gran_total}\n`))
        controller.enqueue(encoder.encode(`\n=====================================================\n`))
        controller.enqueue(encoder.encode(`Firma digital generada en la fecha del sistema.\n`))
        controller.enqueue(encoder.encode(`%%EOF`))
        controller.close()
      }
    })

    // Leer el stream de salida completo para cargarlo como Blob a Supabase Storage
    const chunks: Uint8Array[] = []
    const reader = pdfStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const pdfBlob = new Blob(chunks, { type: "application/pdf" })

    // 7. Almacenar el documento PDF generado en Supabase Storage
    // Usamos el cliente administrativo (Service Role Key) para guardar los contratos en una carpeta restringida
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const path = `evento_${evento.id}/contrato_firmado_${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await adminSupabase
      .storage
      .from("contratos")
      .upload(path, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    // 8. Crear una URL firmada de descarga segura válida por 1 hora (3600 segundos)
    const { data: signedData, error: signError } = await adminSupabase
      .storage
      .from("contratos")
      .createSignedUrl(path, 3600)

    if (signError) {
      throw signError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contrato firmado y almacenado.",
        storage_path: uploadData.path,
        url_descarga: signedData.signedUrl
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Fallo interno al procesar contrato", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
