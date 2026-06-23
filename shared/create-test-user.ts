import { createClient } from "@supabase/supabase-js";

const getEnv = (name: string) => {
  if (typeof Deno !== "undefined") {
    return Deno.env.get(name);
  }
  return process.env[name];
};

const supabaseUrl = getEnv("SUPABASE_URL")!;
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = getEnv("TEST_USER_EMAIL") || "admin@onproduction.com";
  const password = getEnv("TEST_USER_PASSWORD") || "OnProduction2026!";

  console.log(`👤 Creando usuario de prueba: ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // Confirmar automáticamente el correo electrónico
  });

  if (error) {
    console.error("❌ Error al crear el usuario (objeto completo):", error);
    if (error.message && (error.message.includes("already registered") || error.message.includes("already exists"))) {
      console.log(`✅ El usuario ${email} ya estaba registrado previamente. ¡Puedes usarlo directamente!`);
    } else {
      console.error("❌ Error al crear el usuario:", error.message);
    }
  } else {
    console.log(`🎉 ¡Usuario creado exitosamente!`);
    console.log(`📧 Correo: ${email}`);
    console.log(`🔑 Contraseña: ${password}`);
  }
}

main();
