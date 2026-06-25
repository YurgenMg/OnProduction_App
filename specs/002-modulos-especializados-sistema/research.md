# Research: Módulos Especializados del Sistema (OnProduction)

En esta fase de investigación se analizan y justifican las decisiones técnicas tomadas para la arquitectura de datos, API y almacenamiento del sistema OnProduction.

## Decisiones Técnicas y Arquitectura

### 1. Almacenamiento del Logotipo Empresarial
- **Decisión**: Utilizar **Supabase Storage** con un bucket público llamado `configuracion` y guardar la URL resultante en la tabla de base de datos.
- **Razón**: Almacenar imágenes en base de datos como Base64 impacta negativamente el rendimiento de las consultas y sobrecarga el tráfico transaccional. El almacenamiento en objetos de Supabase está optimizado para servir imágenes de forma estática con baja latencia y alta concurrencia.
- **Alternativas Consideradas**: Base64 en un campo TEXT de la base de datos (rechazado por ineficiencia en consultas y desperdicio de almacenamiento).

### 2. Estructura de Categorías de Inventario (Jerárquica/Árbol)
- **Decisión**: Tabla relacional auto-referenciada `categorias` con clave foránea `parent_id` apuntando a `categorias(id) ON DELETE CASCADE`.
- **Razón**: Permite subcategorías anidadas ilimitadas (ej. Audio -> Consolas -> Digitales). Para consultas de disponibilidad jerárquica recursiva, se utilizarán consultas recursivas (WITH RECURSIVE) en PostgreSQL o triggers PL/pgSQL eficientes.
- **Alternativas Consideradas**: Categorías planas simples (rechazado por solicitud del usuario de jerarquías de árbol), modelo de conjuntos anidados (Nested Sets) (rechazado por complejidad innecesaria en escrituras).

### 3. Soporte de Caja y Divisa Local Única
- **Decisión**: Operar todas las transacciones financieras en una única divisa local parametrizada (ej. COP). La tabla `TransaccionCaja` será estrictamente de solo inserción (*insert-only*) para garantizar la inmutabilidad financiera.
- **Razón**: Evita la complejidad matemática e imprecisiones asociadas a la conversión de tasas de cambio dinámicas en transacciones e históricos de cartera. Cumple con el principio constitucional de inmutabilidad financiera.
- **Alternativas Consideradas**: Soporte multi-divisa dinámico (rechazado por complejidad innecesaria para el MVP y para garantizar rapidez de desarrollo).

### 4. Seguridad de Acceso a Nivel de Fila (RLS)
- **Decisión**: Habilitar RLS en todas las tablas transaccionales de Supabase. Definir funciones `SECURITY DEFINER` específicas para comprobar permisos de usuario basadas en su rol (Administrador, Bodeguero, Asistente Comercial), evitando llamadas directas a uniones en la política RLS.
- **Razón**: Evita la recursión de políticas RLS y mejora significativamente el rendimiento de PostgREST al consultar tablas.
