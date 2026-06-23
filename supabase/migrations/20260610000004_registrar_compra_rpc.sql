-- Migración para la función transaccional de registro de compras masivas (protocolo anti-duplicados)

-- Crear función PL/pgSQL transaccional con control de concurrencia mediante row locks
CREATE OR REPLACE FUNCTION registrar_compra_lote(
    p_catalogo_id INT,
    p_cantidad INT,
    p_costo_compra_total NUMERIC(12, 2),
    p_proveedor VARCHAR(150),
    p_fecha_compra TIMESTAMP
)
RETURNS JSONB AS $$
DECLARE
    v_sku VARCHAR(50);
    v_max_index INT := 0;
    v_next_index INT;
    v_serial_tag VARCHAR(100);
    v_purchase_id INT;
    v_instances_created INT := 0;
    v_serial_inicial VARCHAR(100);
    v_serial_final VARCHAR(100);
    v_response JSONB;
BEGIN
    -- 1. BLOQUEO DE CONCURRENCIA: Obtener SKU y bloquear fila del catálogo padre
    -- Cualquier transacción concurrente para el mismo catalogo_id esperará aquí
    SELECT sku INTO v_sku
    FROM catalogo_equipos
    WHERE id = p_catalogo_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El equipo de catálogo especificado no existe o fue eliminado.' USING ERRCODE = 'P0002';
    END IF;

    -- 2. CALCULO SEGURO DEL ÍNDICE: Buscar el sufijo numérico más alto para ese SKU
    -- Filtramos usando expresiones regulares para evitar emparejar formatos incorrectos
    SELECT COALESCE(MAX(
        CASE 
            WHEN serial_tag ~ ( '^' || v_sku || '-\d+$' ) THEN
                (substring(serial_tag from (length(v_sku) + 2)))::integer
            ELSE 0
        END
    ), 0) INTO v_max_index
    FROM inventario_instancias
    WHERE catalogo_id = p_catalogo_id;

    -- 3. REGISTRAR COMPRA: Insertar en compras_inventario
    INSERT INTO compras_inventario (
        catalogo_id,
        cantidad,
        costo_compra_total,
        proveedor,
        fecha_compra
    ) VALUES (
        p_catalogo_id,
        p_cantidad,
        p_costo_compra_total,
        p_proveedor,
        p_fecha_compra
    ) RETURNING id INTO v_purchase_id;

    -- 4. BUCLE DE INSERCIÓN: Generar e insertar las instancias físicas de forma secuencial
    FOR i IN 1..p_cantidad LOOP
        v_next_index := v_max_index + i;
        -- Formatear con ceros a la izquierda a tres dígitos (ej: BEAM-230-001)
        v_serial_tag := UPPER(v_sku || '-' || LPAD(v_next_index::text, 3, '0'));
        
        -- Guardar el rango de seriales para la respuesta
        IF i = 1 THEN
            v_serial_inicial := v_serial_tag;
        END IF;
        IF i = p_cantidad THEN
            v_serial_final := v_serial_tag;
        END IF;

        INSERT INTO inventario_instancias (
            catalogo_id,
            serial_tag,
            estado_operativo,
            notes_condicion
        ) VALUES (
            p_catalogo_id,
            v_serial_tag,
            'DISPONIBLE',
            'Ingresado por compra de lote #' || v_purchase_id || ' - Proveedor: ' || p_proveedor
        );
        v_instances_created := v_instances_created + 1;
    END LOOP;

    -- 5. CONSTRUIR RESPUESTA JSONB
    v_response := jsonb_build_object(
        'success', TRUE,
        'compra_id', v_purchase_id,
        'unidades_creadas', v_instances_created,
        'serial_inicial', v_serial_inicial,
        'serial_final', v_serial_final
    );

    RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Conceder permisos de ejecución para roles autenticados
GRANT EXECUTE ON FUNCTION registrar_compra_lote(INT, INT, NUMERIC, VARCHAR, TIMESTAMP) TO authenticated;
