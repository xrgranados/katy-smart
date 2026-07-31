-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    telefono TEXT,
    rol TEXT NOT NULL CHECK (rol IN ('administrador', 'dependiente', 'cliente')),
    activo BOOLEAN NOT NULL DEFAULT true,
    tienda_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    pin_kiosco VARCHAR(4) CHECK (pin_kiosco ~ '^\d{4}$'), -- short numeric PIN for Kiosco
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. cajas_fisicas
CREATE TABLE cajas_fisicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    tienda_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. rubros_caja
CREATE TABLE rubros_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('general', 'caja_aparte')),
    activo BOOLEAN NOT NULL DEFAULT true,
    orden INTEGER DEFAULT 0,
    tienda_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. cortes_caja
CREATE TABLE cortes_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caja_fisica_id UUID NOT NULL REFERENCES cajas_fisicas(id),
    dependiente_id UUID NOT NULL REFERENCES usuarios(id),
    turno TEXT NOT NULL CHECK (turno IN ('manana', 'tarde')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
    hora_fin TIMESTAMPTZ,
    estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    notas TEXT,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unico_caja_turno_fecha UNIQUE (caja_fisica_id, turno, fecha)
);

-- 5. cortes_caja_detalle
CREATE TABLE cortes_caja_detalle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corte_id UUID NOT NULL REFERENCES cortes_caja(id) ON DELETE CASCADE,
    rubro_id UUID NOT NULL REFERENCES rubros_caja(id),
    monto_contado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. pagos_proveedores
CREATE TABLE pagos_proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corte_id UUID NOT NULL REFERENCES cortes_caja(id) ON DELETE CASCADE,
    proveedor TEXT NOT NULL,
    monto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    descripcion TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creado_por UUID NOT NULL REFERENCES usuarios(id),
    fecha_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_entrega_estimada DATE,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'recibido_parcial', 'recibido_completo', 'pagado')),
    proveedor_nombre TEXT NOT NULL,
    tienda_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. pedido_items
CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    codigo_barras TEXT,
    cantidad NUMERIC(12,2) NOT NULL DEFAULT 1.00,
    unidad TEXT DEFAULT 'unidades',
    precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. recepciones_pedido
CREATE TABLE recepciones_pedido (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    cantidad_recibida NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fecha_recepcion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_pago DATE,
    monto_pagado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    empresa_despacho TEXT,
    registrado_por UUID NOT NULL REFERENCES usuarios(id),
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. clientes_cuenta_corriente
CREATE TABLE clientes_cuenta_corriente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_principal TEXT NOT NULL,
    telefono TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    tienda_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    periodo_dias_corte INTEGER NOT NULL DEFAULT 15,
    dia_corte_fijo INTEGER,
    saldo_actual NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    usuario_id_vinculado UUID REFERENCES usuarios(id),
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. personas_autorizadas
CREATE TABLE personas_autorizadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes_cuenta_corriente(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    relacion TEXT,
    usuario_id_app_opcional UUID REFERENCES usuarios(id),
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. movimientos_cuenta_corriente
CREATE TABLE movimientos_cuenta_corriente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes_cuenta_corriente(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES personas_autorizadas(id) ON DELETE SET NULL,
    monto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    registrado_por UUID NOT NULL REFERENCES usuarios(id),
    descripcion_items TEXT NOT NULL,
    saldo_resultante NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. cortes_estado_cuenta
CREATE TABLE cortes_estado_cuenta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes_cuenta_corriente(id) ON DELETE CASCADE,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    monto_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
    fecha_pago DATE,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. push_subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. notificaciones
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo TEXT NOT NULL CHECK (tipo IN ('fiado', 'oferta', 'recordatorio_pago', 'sistema')),
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    destinatario_usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    destinatario_rol TEXT CHECK (destinatario_rol IN ('administrador', 'dependiente', 'cliente')),
    enviada_por UUID REFERENCES usuarios(id),
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    leida BOOLEAN NOT NULL DEFAULT false,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- TRIGGERS ---

-- Trigger to automatically calculate subtotal in items
CREATE OR REPLACE FUNCTION calcular_subtotal_item()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.cantidad * NEW.precio_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_subtotal_item
BEFORE INSERT OR UPDATE ON pedido_items
FOR EACH ROW
EXECUTE FUNCTION calcular_subtotal_item();


-- Trigger to automatically update cached customer balance when a new movement is registered
CREATE OR REPLACE FUNCTION actualizar_saldo_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_nuevo_saldo NUMERIC(12,2);
BEGIN
    -- Update the balance in clientes_cuenta_corriente
    UPDATE clientes_cuenta_corriente
    SET saldo_actual = saldo_actual + NEW.monto
    WHERE id = NEW.cliente_id
    RETURNING saldo_actual INTO v_nuevo_saldo;
    
    -- Cache the resulting balance on the movement row
    NEW.saldo_resultante := v_nuevo_saldo;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_saldo_cliente
BEFORE INSERT ON movimientos_cuenta_corriente
FOR EACH ROW
EXECUTE FUNCTION actualizar_saldo_cliente();


-- --- RPC FUNCTIONS ---

-- RPC for Kiosco Mode to check current balance and recent history with a short numeric PIN
CREATE OR REPLACE FUNCTION consultar_saldo_kiosco(p_pin VARCHAR)
RETURNS JSON AS $$
DECLARE
    v_cliente_id UUID;
    v_cliente_nombre TEXT;
    v_saldo NUMERIC(12,2);
    v_movimientos JSON;
    v_resultado JSON;
BEGIN
    -- Find the linked client for the user that has this PIN
    SELECT c.id, c.nombre_principal, c.saldo_actual
    INTO v_cliente_id, v_cliente_nombre, v_saldo
    FROM clientes_cuenta_corriente c
    JOIN usuarios u ON c.usuario_id_vinculado = u.id
    WHERE u.pin_kiosco = p_pin AND u.activo = true AND c.activo = true
    LIMIT 1;

    -- If not found directly, check if the PIN belongs to an authorized family member (persona autorizada) linked to a user
    IF v_cliente_id IS NULL THEN
        SELECT c.id, c.nombre_principal, c.saldo_actual
        INTO v_cliente_id, v_cliente_nombre, v_saldo
        FROM clientes_cuenta_corriente c
        JOIN personas_autorizadas p ON p.cliente_id = c.id
        JOIN usuarios u ON p.usuario_id_app_opcional = u.id
        WHERE u.pin_kiosco = p_pin AND u.activo = true AND c.activo = true
        LIMIT 1;
    END IF;

    IF v_cliente_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'PIN inválido o cuenta inactiva');
    END IF;

    -- Fetch 5 most recent movements
    SELECT json_agg(t)
    INTO v_movimientos
    FROM (
        SELECT m.id, m.monto, m.fecha_hora, m.descripcion_items, m.saldo_resultante, COALESCE(p.nombre, 'Titular') as registrado_por_nombre
        FROM movimientos_cuenta_corriente m
        LEFT JOIN personas_autorizadas p ON m.persona_id = p.id
        WHERE m.cliente_id = v_cliente_id
        ORDER BY m.fecha_hora DESC
        LIMIT 5
    ) t;

    IF v_movimientos IS NULL THEN
        v_movimientos := '[]'::json;
    END IF;

    v_resultado := json_build_object(
        'success', true,
        'cliente_id', v_cliente_id,
        'cliente_nombre', v_cliente_nombre,
        'saldo_actual', v_saldo,
        'movimientos', v_movimientos
    );

    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Helper function to identify authenticated user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT rol FROM public.usuarios WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- --- ROW LEVEL SECURITY (RLS) POLICIES ---

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajas_fisicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubros_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_caja_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepciones_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_cuenta_corriente ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas_autorizadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_cuenta_corriente ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_estado_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- 1. Policies for usuarios
CREATE POLICY "Admins have full access to usuarios" ON usuarios 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "All users can view active users" ON usuarios 
    FOR SELECT TO authenticated USING (activo = true);

-- 2. Policies for cajas_fisicas
CREATE POLICY "Admins have full access to cajas_fisicas" ON cajas_fisicas 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes and Admins can view cajas_fisicas" ON cajas_fisicas 
    FOR SELECT TO authenticated USING (get_user_role() IN ('administrador', 'dependiente'));

-- 3. Policies for rubros_caja
CREATE POLICY "Admins have full access to rubros_caja" ON rubros_caja 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes and Admins can view rubros_caja" ON rubros_caja 
    FOR SELECT TO authenticated USING (get_user_role() IN ('administrador', 'dependiente'));

-- 4. Policies for cortes_caja
CREATE POLICY "Admins have full access to cortes_caja" ON cortes_caja 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can view and insert their own/any shift" ON cortes_caja 
    FOR SELECT TO authenticated USING (get_user_role() = 'dependiente');

CREATE POLICY "Dependientes can insert new shifts" ON cortes_caja 
    FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'dependiente');

CREATE POLICY "Dependientes can update their own open shifts" ON cortes_caja 
    FOR UPDATE TO authenticated USING (get_user_role() = 'dependiente' AND estado = 'abierto');

-- 5. Policies for cortes_caja_detalle
CREATE POLICY "Admins have full access to cortes_caja_detalle" ON cortes_caja_detalle 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can manage details for open shifts" ON cortes_caja_detalle 
    FOR ALL TO authenticated USING (
        get_user_role() = 'dependiente' AND 
        EXISTS (SELECT 1 FROM cortes_caja WHERE id = corte_id AND estado = 'abierto')
    );

-- 6. Policies for pagos_proveedores
CREATE POLICY "Admins have full access to pagos_proveedores" ON pagos_proveedores 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can manage pagos for open shifts" ON pagos_proveedores 
    FOR ALL TO authenticated USING (
        get_user_role() = 'dependiente' AND 
        EXISTS (SELECT 1 FROM cortes_caja WHERE id = corte_id AND estado = 'abierto')
    );

-- 7. Policies for pedidos
CREATE POLICY "Admins have full access to pedidos" ON pedidos 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can view and manage pedidos" ON pedidos 
    FOR ALL TO authenticated USING (get_user_role() = 'dependiente');

-- 8. Policies for pedido_items
CREATE POLICY "Admins have full access to pedido_items" ON pedido_items 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can manage items of active orders" ON pedido_items 
    FOR ALL TO authenticated USING (get_user_role() = 'dependiente');

-- 9. Policies for recepciones_pedido
CREATE POLICY "Admins have full access to recepciones_pedido" ON recepciones_pedido 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can manage recepciones" ON recepciones_pedido 
    FOR ALL TO authenticated USING (get_user_role() = 'dependiente');

-- 10. Policies for clientes_cuenta_corriente
CREATE POLICY "Admins have full access to clientes_cuenta_corriente" ON clientes_cuenta_corriente 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can view clientes_cuenta_corriente" ON clientes_cuenta_corriente 
    FOR SELECT TO authenticated USING (get_user_role() = 'dependiente');

CREATE POLICY "Clientes can view their own accounts" ON clientes_cuenta_corriente 
    FOR SELECT TO authenticated USING (usuario_id_vinculado = auth.uid());

-- 11. Policies for personas_autorizadas
CREATE POLICY "Admins have full access to personas_autorizadas" ON personas_autorizadas 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can view personas_autorizadas" ON personas_autorizadas 
    FOR SELECT TO authenticated USING (get_user_role() = 'dependiente');

CREATE POLICY "Clientes can view their authorized family members" ON personas_autorizadas 
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM clientes_cuenta_corriente WHERE id = cliente_id AND usuario_id_vinculado = auth.uid())
    );

-- 12. Policies for movimientos_cuenta_corriente
CREATE POLICY "Admins have full access to movimientos" ON movimientos_cuenta_corriente 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Dependientes can view and log movements" ON movimientos_cuenta_corriente 
    FOR SELECT TO authenticated USING (get_user_role() = 'dependiente');

CREATE POLICY "Dependientes can insert movements" ON movimientos_cuenta_corriente 
    FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'dependiente');

CREATE POLICY "Clientes can view their own movements" ON movimientos_cuenta_corriente 
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM clientes_cuenta_corriente WHERE id = cliente_id AND usuario_id_vinculado = auth.uid())
    );

-- 13. Policies for cortes_estado_cuenta
CREATE POLICY "Admins have full access to cortes_estado_cuenta" ON cortes_estado_cuenta 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Clientes can view their own period statements" ON cortes_estado_cuenta 
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM clientes_cuenta_corriente WHERE id = cliente_id AND usuario_id_vinculado = auth.uid())
    );

-- 14. Policies for push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions 
    FOR ALL TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

-- 15. Policies for notificaciones
CREATE POLICY "Admins can manage all notifications" ON notificaciones 
    FOR ALL TO authenticated USING (get_user_role() = 'administrador');

CREATE POLICY "Users can see notifications addressed to them or their role" ON notificaciones 
    FOR SELECT TO authenticated USING (
        destinatario_usuario_id = auth.uid() OR 
        destinatario_rol = get_user_role()
    );

CREATE POLICY "Users can mark their notifications as read" ON notificaciones 
    FOR UPDATE TO authenticated USING (destinatario_usuario_id = auth.uid()) WITH CHECK (destinatario_usuario_id = auth.uid());
