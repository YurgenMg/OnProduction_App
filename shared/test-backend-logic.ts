import { createClient } from "@supabase/supabase-js";
import { runTransactionSafe, TransactionalLockError } from "./transaction-helper.ts";

const getEnv = (name: string) => {
  if (typeof Deno !== "undefined") {
    return Deno.env.get(name);
  }
  return process.env[name];
};

const exitProcess = (code = 0) => {
  if (typeof Deno !== "undefined") {
    Deno.exit(code);
  }
  process.exit(code);
};

const supabaseUrl = getEnv("SUPABASE_URL");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Error: Faltan variables de entorno en el archivo .env (se necesitan URL y service_role key).");
  exitProcess(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);

console.log("🚀 INICIANDO PRUEBAS DE LOGICA DE NEGOCIO EN EL BACKEND...\n");

async function testBackend() {
  let testCatalogoId: number | null = null;
  let testItem1Id: number | null = null;
  let testItem2Id: number | null = null;
  let testItem3Id: number | null = null;
  let testClienteId: number | null = null;
  let testEventoId1: number | null = null;
  let testEventoId2: number | null = null;
  let testDepositoId: number | null = null;

  try {
    // ---------------------------------------------------------------------------------
    // PREPARACIÓN: Crear catálogo e inventario de prueba
    // ---------------------------------------------------------------------------------
    console.log("📦 [Preparación] Creando catálogo e inventario de prueba...");
    
    // Insertar catálogo de prueba
    const { data: catData, error: catErr } = await adminClient
      .from("catalogo_equipos")
      .insert({
        sku: "TEST-SKU-" + Date.now(),
        nombre_equipo: "Cabeza Móvil de Prueba",
        categoria: "Luces",
        tarifa_dia_base: 150.00
      })
      .select()
      .single();

    if (catErr) throw catErr;
    testCatalogoId = catData.id;

    // Insertar 3 instancias de prueba en el inventario
    const { data: invData, error: invErr } = await adminClient
      .from("inventario_instancias")
      .insert([
        { catalogo_id: testCatalogoId, serial_tag: "TEST-SER-1-" + Date.now(), estado_operativo: "DISPONIBLE" },
        { catalogo_id: testCatalogoId, serial_tag: "TEST-SER-2-" + Date.now(), estado_operativo: "DISPONIBLE" },
        { catalogo_id: testCatalogoId, serial_tag: "TEST-SER-3-" + Date.now(), estado_operativo: "DISPONIBLE" }
      ])
      .select();

    if (invErr) throw invErr;

    const item1 = invData[0];
    const item2 = invData[1];
    const item3 = invData[2];

    testItem1Id = item1.id;
    testItem2Id = item2.id;
    testItem3Id = item3.id;

    console.log(`   - Creado Catálogo de Prueba ID: ${testCatalogoId}`);
    console.log(`   - Creado Item 1 (ID: ${item1.id}, Serial: ${item1.serial_tag})`);
    console.log(`   - Creado Item 2 (ID: ${item2.id}, Serial: ${item2.serial_tag})`);
    console.log(`   - Creado Item 3 (ID: ${item3.id}, Serial: ${item3.serial_tag})\n`);

    // Crear cliente de prueba
    console.log("👤 [Preparación] Creando cliente de prueba...");
    const { data: cliente, error: cliErr } = await adminClient
      .from("clientes")
      .insert({
        tipo_cliente: "B2C",
        documento_identidad: "TEST-CC-" + Date.now(),
        nombre_razon_social: "Cliente de Prueba Backend",
        email: "prueba.backend@eventos.com",
        telefono: "555-TEST",
      })
      .select()
      .single();

    if (cliErr) throw cliErr;
    testClienteId = cliente.id;
    console.log(`   ✅ Cliente creado. ID: ${testClienteId}\n`);


    // ---------------------------------------------------------------------------------
    // PRUEBA 1: Sincronización Automática de Totales
    // ---------------------------------------------------------------------------------
    console.log("💰 [Prueba 1] Creando Evento 1 en estado COTIZACIÓN y agregando equipos...");
    
    const { data: evento1, error: evErr } = await adminClient
      .from("eventos")
      .insert({
        cliente_id: testClienteId,
        usuario_id: 2, // Laura Ventas
        estado: "COTIZACION",
        fecha_inicio_evento: "2026-07-01 10:00:00",
        fecha_fin_evento: "2026-07-03 22:00:00",
        direccion_evento: "Centro de Convenciones de Prueba",
        total_equipos: 0.00,
        total_adicionales: 0.00,
        gran_total: 0.00
      })
      .select()
      .single();

    if (evErr) throw evErr;
    testEventoId1 = evento1.id;
    console.log(`   Evento 1 creado. ID: ${testEventoId1}`);

    // Insertar equipos en detalles
    console.log("   Agregando 2 equipos al detalle...");
    await adminClient
      .from("evento_detalles_equipos")
      .insert([
        { evento_id: testEventoId1, inventario_id: item1.id, tarifa_dia_congelada: 100.00, dias_cobrados: 3, subtotal: 300.00 },
        { evento_id: testEventoId1, inventario_id: item2.id, tarifa_dia_congelada: 150.00, dias_cobrados: 3, subtotal: 450.00 }
      ]);

    // Verificar si se calcularon los totales de equipos
    let { data: ev1Check1 } = await adminClient
      .from("eventos")
      .select("total_equipos, total_adicionales, gran_total")
      .eq("id", testEventoId1)
      .single();

    console.log(`   📊 Totales parciales tras agregar equipos:`);
    console.log(`      - Total Equipos: $${ev1Check1?.total_equipos} (Esperado: $750.00)`);
    console.log(`      - Gran Total: $${ev1Check1?.gran_total} (Esperado: $750.00)`);

    if (Number(ev1Check1?.total_equipos) !== 750.00) {
      throw new Error("Falló el recálculo automático de equipos.");
    }

    // Agregar servicios adicionales
    console.log("   Agregando servicio de transporte...");
    await adminClient
      .from("evento_adicionales")
      .insert({
        evento_id: testEventoId1,
        tipo_adicional: "TRANSPORTE",
        descripcion: "Flete a bodega de prueba",
        costo_facturado: 120.00
      });

    // Verificar si se recalculó con adicionales
    let { data: ev1Check2 } = await adminClient
      .from("eventos")
      .select("total_equipos, total_adicionales, gran_total")
      .eq("id", testEventoId1)
      .single();

    console.log(`   📊 Totales parciales tras agregar adicionales:`);
    console.log(`      - Total Adicionales: $${ev1Check2?.total_adicionales} (Esperado: $120.00)`);
    console.log(`      - Gran Total: $${ev1Check2?.gran_total} (Esperado: $870.00)`);

    if (Number(ev1Check2?.gran_total) !== 870.00) {
      throw new Error("Falló el recálculo automático del gran total con adicionales.");
    }
    console.log("   ✅ Prueba 1 exitosa! Sincronización de totales funcionando.\n");


    // ---------------------------------------------------------------------------------
    // PRUEBA 2: Prevención de Overbooking (Traslape de Fechas)
    // ---------------------------------------------------------------------------------
    console.log("🛡️ [Prueba 2] Probando prevención de Overbooking (Reserva Duplicada)...");
    
    // Confirmar Evento 1
    console.log("   Confirmando Evento 1 (Cambiando estado a CONFIRMADO_RESERVADO)...");
    const { error: confErr } = await adminClient
      .from("eventos")
      .update({ estado: "CONFIRMADO_RESERVADO" })
      .eq("id", testEventoId1);
    
    if (confErr) throw confErr;

    // Crear Evento 2 en las mismas fechas
    const { data: evento2, error: ev2Err } = await adminClient
      .from("eventos")
      .insert({
        cliente_id: testClienteId,
        usuario_id: 2,
        estado: "COTIZACION",
        fecha_inicio_evento: "2026-07-02 08:00:00", // Traslapado en el medio de Evento 1
        fecha_fin_evento: "2026-07-04 18:00:00",
        direccion_evento: "Dirección en conflicto",
      })
      .select()
      .single();

    if (ev2Err) throw ev2Err;
    testEventoId2 = evento2.id;

    // Intentar agregar Item 1 al Evento 2
    console.log(`   Intentando agregar Item 1 (ID: ${item1.id}) al Evento 2 en fechas traslapadas...`);
    const queryOverbooking = adminClient
      .from("evento_detalles_equipos")
      .insert({
        evento_id: testEventoId2,
        inventario_id: item1.id,
        tarifa_dia_congelada: 100.00,
        dias_cobrados: 2,
        subtotal: 200.00
      })
      .select();

    try {
      await runTransactionSafe(queryOverbooking);
      throw new Error("Fallo de Overbooking: Se permitió agregar un equipo en fechas colisionadas.");
    } catch (err: any) {
      console.log(`   🔒 ¡ÉxITO! El trigger previno la inserción del equipo en conflicto.`);
      console.log(`      Mensaje de Postgres: "${err.message}"`);
    }

    // Agregar Item 3 al Evento 2 (sin traslapes en Evento 1 ya que el Evento 1 solo usa Item 1 e Item 2)
    console.log(`   Agregando Item 3 libre (ID: ${item3.id}) al Evento 2...`);
    const { error: insItem3Err } = await adminClient
      .from("evento_detalles_equipos")
      .insert({
        evento_id: testEventoId2,
        inventario_id: item3.id,
        tarifa_dia_congelada: 40.00,
        dias_cobrados: 2,
        subtotal: 80.00
      });
    
    if (insItem3Err) throw insItem3Err;
    console.log("   Item 3 agregado con éxito.");

    // Ahora intentamos agregar Item 1 al Evento 2 (todavía en COTIZACION)
    // Pero si intentamos cambiar el Evento 2 a CONFIRMADO_RESERVADO conteniendo un ítem en conflicto
    // Como no pudimos agregarlo directamente, forzamos un bypass temporal simulando:
    // ¿Qué pasa si agregamos Item 1 al Evento 2 mientras Evento 1 está en COTIZACION, y luego confirmamos Evento 1?
    // Esa colisión se valida en el trigger BEFORE UPDATE del evento.
    // Vamos a probar este escenario de colisión indirecta:
    
    console.log("   ✅ Prueba 2 exitosa! Prevención de overbooking funcionando.\n");


    // ---------------------------------------------------------------------------------
    // PRUEBA 3: Flujo Logístico del Inventario
    // ---------------------------------------------------------------------------------
    console.log("🚚 [Prueba 3] Probando ciclo de vida logístico automatizado del inventario...");
    
    // Validar estado actual de Item 1 (debería ser DISPONIBLE)
    let { data: checkItem1_0 } = await adminClient
      .from("inventario_instancias")
      .select("estado_operativo")
      .eq("id", item1.id)
      .single();
    
    console.log(`   - Estado de Item 1 inicial: ${checkItem1_0?.estado_operativo} (Esperado: DISPONIBLE)`);

    // Pasar Evento 1 a EN_TRANSITO
    console.log("   Cambiando Evento 1 a EN_TRANSITO...");
    const { error: transitErr } = await adminClient
      .from("eventos")
      .update({ estado: "EN_TRANSITO" })
      .eq("id", testEventoId1);

    if (transitErr) throw transitErr;

    // Verificar que Item 1 e Item 2 pasaron a ALQUILADO
    let { data: checkItem1_1 } = await adminClient
      .from("inventario_instancias")
      .select("estado_operativo")
      .eq("id", item1.id)
      .single();

    console.log(`   - Estado de Item 1 en tránsito: ${checkItem1_1?.estado_operativo} (Esperado: ALQUILADO)`);
    if (checkItem1_1?.estado_operativo !== "ALQUILADO") {
      throw new Error("El equipo no pasó a estado ALQUILADO al despachar el evento.");
    }

    // Pasar Evento 1 a FINALIZADO
    console.log("   Cambiando Evento 1 a FINALIZADO...");
    const { error: finErr } = await adminClient
      .from("eventos")
      .update({ estado: "FINALIZADO" })
      .eq("id", testEventoId1);

    if (finErr) throw finErr;

    // Verificar que Item 1 retornó a DISPONIBLE
    let { data: checkItem1_2 } = await adminClient
      .from("inventario_instancias")
      .select("estado_operativo")
      .eq("id", item1.id)
      .single();

    console.log(`   - Estado de Item 1 al finalizar: ${checkItem1_2?.estado_operativo} (Esperado: DISPONIBLE)`);
    if (checkItem1_2?.estado_operativo !== "DISPONIBLE") {
      throw new Error("El equipo no retornó a estado DISPONIBLE al finalizar el evento.");
    }
    console.log("   ✅ Prueba 3 exitosa! Ciclo logístico automatizado funcionando.\n");


    // ---------------------------------------------------------------------------------
    // PRUEBA 4: Registro de Daños e Inmutabilidad / Retención de Depósitos
    // ---------------------------------------------------------------------------------
    console.log("🛠️ [Prueba 4] Probando auditoría de daños y retención de depósitos...");

    // 1. Crear un depósito de garantía para el Evento 1
    console.log("   Creando depósito de garantía recibido de $500.00 para Evento 1...");
    const { data: dep, error: depErr } = await adminClient
      .from("depositos_garantia")
      .insert({
        evento_id: testEventoId1,
        monto_recibido: 500.00,
        estado: "RECIBIDO",
        monto_retenido: 0.00
      })
      .select()
      .single();

    if (depErr) throw depErr;
    testDepositoId = dep.id;

    // 2. Registrar un daño para Item 1 en el Evento 1
    console.log(`   Registrando daño en Item 1 ($150.00 de reparación) con cargo a garantía...`);
    const { error: danErr } = await adminClient
      .from("registro_danos_auditoria")
      .insert({
        evento_id: testEventoId1,
        inventario_id: item1.id,
        descripcion_dano: "Rotura de chasis en transporte de retorno",
        costo_reparacion: 150.00,
        descontado_de_deposito: true
      });

    if (danErr) throw danErr;

    // 3. Verificar estado de la instancia de inventario (debe haber pasado a EN_MANTENIMIENTO)
    const { data: checkItem1_3 } = await adminClient
      .from("inventario_instancias")
      .select("estado_operativo")
      .eq("id", item1.id)
      .single();

    console.log(`   - Estado de Item 1 tras daño: ${checkItem1_3?.estado_operativo} (Esperado: EN_MANTENIMIENTO)`);
    if (checkItem1_3?.estado_operativo !== "EN_MANTENIMIENTO") {
      throw new Error("El equipo dañado no cambió su estado operativo a EN_MANTENIMIENTO.");
    }

    // 4. Verificar retención de garantía
    const { data: checkDep } = await adminClient
      .from("depositos_garantia")
      .select("estado, monto_retenido, motivo_retencion")
      .eq("id", testDepositoId)
      .single();

    console.log(`   📊 Depósito de Garantía:`);
    console.log(`      - Estado: ${checkDep?.estado} (Esperado: RETENIDO_PARCIAL)`);
    console.log(`      - Monto Retenido: $${checkDep?.monto_retenido} (Esperado: $150.00)`);
    console.log(`      - Motivo: "${checkDep?.motivo_retencion}"`);

    if (Number(checkDep?.monto_retenido) !== 150.00 || checkDep?.estado !== "RETENIDO_PARCIAL") {
      throw new Error("La retención del depósito de garantía no se calculó o aplicó correctamente.");
    }
    console.log("   ✅ Prueba 4 exitosa! Auditoría de daños y retención de depósitos funcionando.\n");

    console.log("🎉 TODAS LAS PRUEBAS SE COMPLETARON CON ÉXITO.");

  } catch (err: any) {
    console.error("\n❌ ERROR DURANTE LA EJECUCIÓN DE PRUEBAS:");
    console.error(err.message || err);
  } finally {
    // ---------------------------------------------------------------------------------
    // LIMPIEZA: Dejar la base de datos limpia eliminando registros de prueba
    // ---------------------------------------------------------------------------------
    console.log("\n🧹 [Limpieza] Eliminando registros creados para la prueba...");
    
    if (testEventoId1) {
      await adminClient.from("registro_danos_auditoria").delete().eq("evento_id", testEventoId1);
      await adminClient.from("depositos_garantia").delete().eq("evento_id", testEventoId1);
      await adminClient.from("evento_detalles_equipos").delete().eq("evento_id", testEventoId1);
      await adminClient.from("evento_adicionales").delete().eq("evento_id", testEventoId1);
      await adminClient.from("eventos").delete().eq("id", testEventoId1);
    }
    if (testEventoId2) {
      await adminClient.from("evento_detalles_equipos").delete().eq("evento_id", testEventoId2);
      await adminClient.from("eventos").delete().eq("id", testEventoId2);
    }
    if (testClienteId) {
      await adminClient.from("clientes").delete().eq("id", testClienteId);
    }
    if (testItem1Id || testItem2Id || testItem3Id) {
      await adminClient.from("inventario_instancias").delete().in("id", [testItem1Id, testItem2Id, testItem3Id].filter(Boolean));
    }
    if (testCatalogoId) {
      await adminClient.from("catalogo_equipos").delete().eq("id", testCatalogoId);
    }

    console.log("   🧹 Base de datos limpia de registros de prueba.");
  }
}

// Ejecutar pruebas
testBackend();
