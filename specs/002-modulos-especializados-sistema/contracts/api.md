# API Endpoints Contract (Next.js Routes)

El cliente Next.js expone las siguientes rutas de API para interactuar con la base de datos de Supabase.

## 1. Módulo Administrativo: Configuración de Empresa
- **Route**: `POST /api/empresa`
  - **Body**:
    ```json
    {
      "razon_social": "OnProduction SAS",
      "nit": "900987654-2",
      "telefono": "+57 3001234567",
      "email": "contacto@onproduction.com",
      "logo_url": "https://igqhhaosqguobtzfcbcu.supabase.co/storage/v1/object/public/configuracion/logo.png"
    }
    ```
  - **Response**: `200 OK` con el registro de configuración guardado.

## 2. Módulo de Caja: Registro de Transacciones
- **Route**: `POST /api/caja/transaccion`
  - **Body**:
    ```json
    {
      "evento_id": 1,
      "metodo_pago_id": 2,
      "tipo": "INGRESO",
      "monto": 250000.00,
      "descripcion": "Abono parcial de cliente"
    }
    ```
  - **Response**: `201 Created` con el registro de transacción.

## 3. Módulo de Inventario: Crear Ítem
- **Route**: `POST /api/inventario/items`
  - **Body**:
    ```json
    {
      "categoria_id": 2,
      "nombre": "Micrófono Shure SM58",
      "sku": "MIC-SHR-SM58-01",
      "estado_operativo": "EXCELENTE",
      "precio_alquiler_base": 25000.00
    }
    ```
  - **Response**: `201 Created`.
