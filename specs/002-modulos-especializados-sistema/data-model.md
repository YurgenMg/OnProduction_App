# Data Model: Módulos Especializados del Sistema (OnProduction)

Este documento detalla el esquema físico de base de datos PostgreSQL en Supabase, aplicando las mejores prácticas de la constitución (3NF, Soft Deletes, RLS e Inmutabilidad Financiera).

## Esquema de Tablas

### 1. roles
Catálogo de roles del sistema.
```sql
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. usuarios
Perfiles de usuario enlazados a Supabase Auth.
```sql
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol_id INT NOT NULL REFERENCES public.roles(id),
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nulo para usuarios de Google OAuth
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_deleted_at ON public.usuarios(id) WHERE deleted_at IS NULL;
```

### 3. empresa_config
Configuración empresarial global (registro único con ID = 1).
```sql
CREATE TABLE public.empresa_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    razon_social VARCHAR(150) NOT NULL,
    nit VARCHAR(50) NOT NULL,
    direccion VARCHAR(200),
    telefono VARCHAR(50),
    email VARCHAR(150),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. categorias
Jerarquía recursiva de categorías de inventario.
```sql
CREATE TABLE public.categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    parent_id INT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categorias_deleted_at ON public.categorias(id) WHERE deleted_at IS NULL;
```

### 5. items_inventario
Activos físicos del negocio.
```sql
CREATE TABLE public.items_inventario (
    id SERIAL PRIMARY KEY,
    categoria_id INT NOT NULL REFERENCES public.categorias(id),
    nombre VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    estado_operativo VARCHAR(50) NOT NULL CHECK (estado_operativo IN ('EXCELENTE', 'REGULAR', 'MANTENIMIENTO', 'DADO_DE_BAJA')),
    precio_alquiler_base DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_deleted_at ON public.items_inventario(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_sku ON public.items_inventario(sku);
```

### 6. clientes
Base de datos unificada de clientes.
```sql
CREATE TABLE public.clientes (
    id SERIAL PRIMARY KEY,
    nombre_razon_social VARCHAR(150) NOT NULL,
    nit_identificacion VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    direccion VARCHAR(200),
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clientes_deleted_at ON public.clientes(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_nit ON public.clientes(nit_identificacion);
```

### 7. eventos
Servicios de alquiler de eventos contratados.
```sql
CREATE TABLE public.eventos (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES public.clientes(id),
    nombre_evento VARCHAR(150) NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('COTIZACION', 'EN_PROCESO', 'FINALIZADO', 'CANCELADO')),
    costo_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eventos_deleted_at ON public.eventos(id) WHERE deleted_at IS NULL;
```

### 8. evento_items
Tabla pivote de asignación de inventario por evento.
```sql
CREATE TABLE public.evento_items (
    id SERIAL PRIMARY KEY,
    evento_id INT NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES public.items_inventario(id),
    precio_alquiler DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9. metodos_pago
Catálogo de métodos de pago.
```sql
CREATE TABLE public.metodos_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);
```

### 10. transacciones_caja
Historial de flujo de caja (solo inserción).
```sql
CREATE TABLE public.transacciones_caja (
    id SERIAL PRIMARY KEY,
    evento_id INT NULL REFERENCES public.eventos(id) ON DELETE SET NULL,
    metodo_pago_id INT NOT NULL REFERENCES public.metodos_pago(id),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO')),
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT NOT NULL
);
```

## Reglas de Negocio en Base de Datos (PL/pgSQL Triggers)

### Validación de Reservas Coincidentes (Inventario)
Un trigger en `evento_items` bloquea la operación si el ítem ya está asignado a otro evento coincidente en fechas en estado `EN_PROCESO` o `COTIZACION`.
```sql
CREATE OR REPLACE FUNCTION public.fn_verificar_disponibilidad_item()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.evento_items ei
        JOIN public.eventos e ON ei.evento_id = e.id
        JOIN public.eventos e_nuevo ON e_nuevo.id = NEW.evento_id
        WHERE ei.item_id = NEW.item_id
          AND e.estado IN ('COTIZACION', 'EN_PROCESO')
          AND e.id != NEW.evento_id
          AND (e_nuevo.fecha_inicio, e_nuevo.fecha_fin) OVERLAPS (e.fecha_inicio, e.fecha_fin)
    ) THEN
        RAISE EXCEPTION 'Conflicto de stock: El item % ya está reservado en las fechas seleccionadas.', NEW.item_id
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_items_disponibilidad
    BEFORE INSERT OR UPDATE ON public.evento_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_verificar_disponibilidad_item();
```
