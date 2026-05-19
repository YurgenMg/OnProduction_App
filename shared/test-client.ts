import { createClient } from "@supabase/supabase-js";

// Leer variables de entorno
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Faltan las variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY en el archivo .env.");
  Deno.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("📡 Conectando al proyecto de Supabase en la nube...");
console.log(`🔗 URL: ${supabaseUrl}`);

try {
  // Consultar eventos de prueba
  const { data, error } = await supabase
    .from("eventos")
    .select(`
      id,
      estado,
      gran_total,
      clientes (
        nombre_razon_social
      )
    `);

  if (error) {
    throw error;
  }

  console.log("\n✅ ¡Conexión exitosa a la base de datos!");
  console.log("📊 Datos cargados (Semilla):");
  console.table(data);
} catch (err: any) {
  console.error("\n❌ Error en la consulta a la base de datos:");
  console.error(err.message || err);
}
