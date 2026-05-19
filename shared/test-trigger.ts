import { createClient } from "@supabase/supabase-js";
import { runTransactionSafe, TransactionalLockError } from "./transaction-helper.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Faltan credenciales en el archivo .env.");
  Deno.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);

console.log("⚙️ Intentando actualizar una tarifa congelada de un evento finalizado (ID: 2)...");
console.log("Esta acción debería ser denegada por el trigger transaccional de PostgreSQL.\n");

// Intentamos actualizar la tarifa del detalle de equipos del evento 2 (que está en PAGADO_CERRADO)
const query = adminClient
  .from("evento_detalles_equipos")
  .update({ tarifa_dia_congelada: 500.00 })
  .eq("evento_id", 2)
  .select();

try {
  const result = await runTransactionSafe(query);
  console.log("⚠️ Inconsistencia: Se permitió modificar la tarifa congelada:", result);
} catch (err: any) {
  if (err instanceof TransactionalLockError) {
    console.log("🛡️ ¡ÉXITO! El trigger bloqueó la transacción correctamente:");
    console.log(`🔴 Mensaje amigable al usuario: "${err.message}"`);
    console.log(`🔍 Código de Error Postgres: ${err.code}`);
  } else {
    console.error("❌ Error inesperado:", err.message);
  }
}
