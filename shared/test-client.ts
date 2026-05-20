import { createClient } from "@supabase/supabase-js";

// Helper para obtener variables de entorno de forma compatible con Deno y Node
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

// Leer variables de entorno
const supabaseUrl = getEnv("SUPABASE_URL");
const anonKey = getEnv("SUPABASE_ANON_KEY");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error("❌ Error: Faltan variables de entorno en el archivo .env (se necesitan URL, anon key y service_role key).");
  exitProcess(1);
}

console.log("📡 Conectando al proyecto de Supabase en la nube...");
console.log(`🔗 URL: ${supabaseUrl}\n`);

// 1. PRUEBA CON CLIENTE ANÓNIMO (Aplica RLS)
const anonClient = createClient(supabaseUrl, anonKey);
console.log("🛡️ [Prueba 1] Consultando con clave pública 'anon' (Aplica RLS):");

try {
  const { data, error } = await anonClient
    .from("eventos")
    .select(`
      id,
      estado,
      gran_total,
      clientes (
        nombre_razon_social
      )
    `);

  if (error) throw error;
  
  if (data.length === 0) {
    console.log("🔒 Resultado: 0 filas devueltas (El RLS bloqueó el acceso anónimo con éxito. ¡Seguro!).\n");
  } else {
    console.log(`⚠️ Advertencia: Se encontraron ${data.length} filas públicas sin autenticación.`);
    console.table(data);
    console.log("");
  }
} catch (err: any) {
  console.error("❌ Error en la prueba RLS:", err.message);
}

// 2. PRUEBA CON CLIENTE DE SERVICIO (Bypassea RLS)
const adminClient = createClient(supabaseUrl, serviceKey);
console.log("🔑 [Prueba 2] Consultando con clave administrativa 'service_role' (Evade RLS):");

try {
  const { data, error } = await adminClient
    .from("eventos")
    .select(`
      id,
      estado,
      gran_total,
      clientes (
        nombre_razon_social
      )
    `);

  if (error) throw error;

  console.log(`✅ ¡Conexión exitosa! Se encontraron ${data.length} registros semilla en la base de datos:`);
  console.table(data.map(item => ({
    ID: item.id,
    Estado: item.estado,
    Total: `$${item.gran_total}`,
    Cliente: item.clientes?.nombre_razon_social || "N/A"
  })));
} catch (err: any) {
  console.error("\n❌ Error usando service_role_key:");
  console.error(err.message || err);
  console.log("\n💡 Nota: Si el error es de firma JWT ('invalid jwt signature' / 'JWT expired'),");
  console.log("   significa que la clave 'SUPABASE_SERVICE_ROLE_KEY' del archivo .env es inválida.");
  console.log("   Debes reemplazarla por la clave 'service_role' (secret) del dashboard web de Supabase.");
}
