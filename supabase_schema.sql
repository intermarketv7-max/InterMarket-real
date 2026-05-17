-- =============================================
-- 0. PREPARACIÓN Y EXTENSIONES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. TABLAS MAESTRAS
-- =============================================

-- Tabla usuarios: Ahora vinculada a auth.users de Supabase
CREATE TABLE IF NOT EXISTS public.usuarios (
  id_usuario UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'comprador' CHECK (rol IN ('comprador', 'vendedor', 'admin')),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tiendas (
  id_tienda UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_tienda VARCHAR(150) NOT NULL,
  imagen_url TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categorias (
  id_categoria SERIAL PRIMARY KEY,
  nombre_categoria VARCHAR(100) NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estados (
  id_estado SERIAL PRIMARY KEY,
  nombre_estado VARCHAR(50) NOT NULL -- Ej: 1: 'Pendiente', 2: 'Pagado/Aceptado', 3: 'Cancelado/Rechazado', 4: 'Entregado/Completado'
);

-- =============================================
-- 2. TABLAS CON RELACIONES DE SEGUNDO NIVEL
-- =============================================

CREATE TABLE IF NOT EXISTS public.perfiles (
  perfil_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_usuario UUID REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  foto_perfil TEXT,
  id_tienda UUID REFERENCES public.tiendas(id_tienda) ON DELETE SET NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.productos (
  id_producto UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_producto VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio_compra NUMERIC(12,2),
  precio_venta NUMERIC(12,2) NOT NULL,
  categoria_id INTEGER REFERENCES public.categorias(id_categoria) ON DELETE SET NULL,
  imagen_url TEXT[], -- Array de URLs
  id_estado INTEGER REFERENCES public.estados(id_estado) DEFAULT 1,
  id_tienda UUID REFERENCES public.tiendas(id_tienda) ON DELETE CASCADE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.direcciones (
  id_direccion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_usuario UUID REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  nombre_calle TEXT,
  descripcion TEXT,
  codigo_postal VARCHAR(20),
  numero_telefono VARCHAR(20),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. PAGOS Y VENTAS
-- =============================================

CREATE TABLE IF NOT EXISTS public.metodos_pago (
  id_metodo_pago UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_usuario UUID REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_stripe_customer TEXT,
  id_stripe_payment_method TEXT,
  ultimo4 VARCHAR(4),
  tipo_metodo VARCHAR(50),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ventas (
  venta_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_usuario UUID REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  monto_total NUMERIC(12,2) NOT NULL,
  monto_neto NUMERIC(12,2),
  id_estado INTEGER REFERENCES public.estados(id_estado) DEFAULT 1,
  id_metodo_pago UUID REFERENCES public.metodos_pago(id_metodo_pago),
  id_stripe_intent TEXT,
  fecha_venta TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. OPERACIÓN Y SOCIAL
-- =============================================

CREATE TABLE IF NOT EXISTS public.pedidos (
  id_pedido UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
  venta_id UUID REFERENCES public.ventas(venta_id) ON DELETE CASCADE,
  id_producto UUID REFERENCES public.productos(id_producto) ON DELETE SET NULL,
  id_tienda UUID REFERENCES public.tiendas(id_tienda) ON DELETE SET NULL, -- Agregado para facilitar filtrado
  nombre_categoria VARCHAR(100), -- Agregado para reportes y DW
  id_estado INTEGER REFERENCES public.estados(id_estado) DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL,
  cantidad INTEGER DEFAULT 1, -- Agregado column que faltaba
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favoritos (
  id_favorito UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id_producto) ON DELETE CASCADE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(perfil_id, producto_id)
);

CREATE TABLE IF NOT EXISTS public.calificaciones (
  id_calificacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comprador_id UUID REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
  vendedor_id UUID REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
  pedido_id UUID REFERENCES public.pedidos(id_pedido) ON DELETE SET NULL,
  puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5) NOT NULL,
  comentario TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chats (
  id_chat UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comprador_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id_producto) ON DELETE CASCADE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comprador_id, vendedor_id, producto_id)
);

-- =============================================
-- 5. AUTOMATIZACIÓN (TRIGGERS)
-- =============================================

-- Función para insertar automáticamente en 'usuarios' y 'perfiles' al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Insertar en la tabla usuarios
  INSERT INTO public.usuarios (id_usuario, username, email, rol)
  VALUES (new.id, split_part(new.email, '@', 1), new.email, 'comprador');

  -- 2. Insertar en la tabla perfiles vinculado al usuario creado
  INSERT INTO public.perfiles (id_usuario)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se dispara al crear un usuario en Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- 6. SEGURIDAD BÁSICA (RLS)
-- =============================================

-- Habilitar RLS en las tablas principales
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas para USUARIOS
CREATE POLICY "Usuarios ven todos los usuarios" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.usuarios FOR UPDATE USING (auth.uid() = id_usuario);

-- Políticas para PERFILES
CREATE POLICY "Perfiles visibles para todos" ON public.perfiles FOR SELECT USING (true);
CREATE POLICY "Usuarios actualizan su propio perfil_detalle" ON public.perfiles FOR UPDATE USING (auth.uid() = id_usuario);

-- Políticas para PRODUCTOS
CREATE POLICY "Productos visibles para todos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Solo vendedores crean productos" ON public.productos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios WHERE id_usuario = auth.uid() AND rol = 'vendedor')
);
CREATE POLICY "Vendedores modifican sus productos" ON public.productos FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id_usuario = auth.uid() AND p.id_tienda = productos.id_tienda
  )
);
CREATE POLICY "Vendedores eliminan sus productos" ON public.productos FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id_usuario = auth.uid() AND p.id_tienda = productos.id_tienda
  )
);

-- Políticas para TIENDAS
CREATE POLICY "Tiendas visibles para todos" ON public.tiendas FOR SELECT USING (true);

-- Políticas para VENTAS
CREATE POLICY "Compradores ven sus propias ventas" ON public.ventas FOR SELECT USING (auth.uid() = id_usuario);
CREATE POLICY "Compradores pueden crear ventas" ON public.ventas FOR INSERT WITH CHECK (auth.uid() = id_usuario);

-- Políticas para PEDIDOS (Detalles de venta)
-- El comprador ve sus pedidos, el vendedor ve pedidos asociados a su tienda
CREATE POLICY "Compradores ven sus pedidos" ON public.pedidos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id_usuario = auth.uid() AND p.perfil_id = pedidos.perfil_id
  )
);
CREATE POLICY "Vendedores ven pedidos de sus productos" ON public.pedidos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.productos pr
    JOIN public.perfiles pe ON pe.id_tienda = pr.id_tienda
    WHERE pr.id_producto = pedidos.id_producto AND pe.id_usuario = auth.uid()
  )
);
CREATE POLICY "Vendedores pueden actualizar estado de pedidos" ON public.pedidos FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.productos pr
    JOIN public.perfiles pe ON pe.id_tienda = pr.id_tienda
    WHERE pr.id_producto = pedidos.id_producto AND pe.id_usuario = auth.uid()
  )
);
CREATE POLICY "Compradores insertan pedidos" ON public.pedidos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id_usuario = auth.uid() AND p.perfil_id = pedidos.perfil_id
  )
);

-- =============================================
-- 7. CONFIGURACIÓN DE TIEMPO REAL (REALTIME)
-- =============================================
-- Habilitar tiempo real en la tabla de pedidos para que el dashboard del vendedor se actualice
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;

-- =============================================
  -- 8. TABLA MENSAJES (CHATS)
  -- =============================================
  CREATE TABLE IF NOT EXISTS public.mensajes (
    id_mensaje UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_chat UUID REFERENCES public.chats(id_chat) ON DELETE CASCADE,
    emisor_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Mensajes visibles para todos (simplificado)" ON public.mensajes FOR SELECT USING (true);
  CREATE POLICY "Mensajes insertables para todos (simplificado)" ON public.mensajes FOR INSERT WITH CHECK (true);

  -- Habilitar tiempo real en mensajes
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;

  -- =============================================
  -- 9. TABLA NOTIFICACIONES
  -- =============================================
  CREATE TABLE IF NOT EXISTS public.notificaciones (
    id_notificacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Usuarios ven sus notificaciones" ON public.notificaciones FOR SELECT USING (true);
  CREATE POLICY "Usuarios insertan notificaciones" ON public.notificaciones FOR INSERT WITH CHECK (true);
  CREATE POLICY "Usuarios actualizan notificaciones" ON public.notificaciones FOR UPDATE USING (true);

  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;

  -- =============================================
  -- 10. STORAGE PARA FOTOS DE PERFIL (AVATARES)
  -- =============================================
  -- Crear un bucket público llamado 'avatars'
  INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

  -- Permitir acceso público de lectura a las fotos
  CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

  -- Permitir a los usuarios autenticados subir fotos
  CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

  -- =============================================
  -- 11. BUCKETS DE ALMACENAMIENTO PARA IMÁGENES
  -- =============================================
  -- Ejecuta estos comandos para crear los buckets para tiendas y productos
  
  -- Bucket para Productos
  INSERT INTO storage.buckets (id, name, public) VALUES ('productos', 'productos', true);
  CREATE POLICY "Public Access Productos" ON storage.objects FOR SELECT USING (bucket_id = 'productos');
  CREATE POLICY "Users can upload productos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'productos' AND auth.role() = 'authenticated');
  CREATE POLICY "Users can update productos" ON storage.objects FOR UPDATE USING (bucket_id = 'productos' AND auth.role() = 'authenticated');
  CREATE POLICY "Users can delete productos" ON storage.objects FOR DELETE USING (bucket_id = 'productos' AND auth.role() = 'authenticated');

  -- Bucket para Tiendas
  INSERT INTO storage.buckets (id, name, public) VALUES ('tiendas', 'tiendas', true);
  CREATE POLICY "Public Access Tiendas" ON storage.objects FOR SELECT USING (bucket_id = 'tiendas');
  CREATE POLICY "Users can upload tiendas" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tiendas' AND auth.role() = 'authenticated');
  CREATE POLICY "Users can update tiendas" ON storage.objects FOR UPDATE USING (bucket_id = 'tiendas' AND auth.role() = 'authenticated');
  CREATE POLICY "Users can delete tiendas" ON storage.objects FOR DELETE USING (bucket_id = 'tiendas' AND auth.role() = 'authenticated');

  -- =============================================
  -- 12. ACTUALIZACIONES ADICIONALES (OFERTAS)
  -- =============================================
  -- Ejecutar esto en el SQL Editor de Supabase para habilitar las ofertas/descuentos
  -- ALTER TABLE public.productos ADD COLUMN precio_original NUMERIC(12,2);

  -- =============================================
  -- 13. RESEÑAS Y CALIFICACIONES (PRODUCTOS Y TIENDAS)
  -- =============================================
  
  -- Tabla para reseñas de productos
  CREATE TABLE IF NOT EXISTS public.reseñas_productos (
    id_resena UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES public.productos(id_producto) ON DELETE CASCADE,
    comprador_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
    calificacion INTEGER CHECK (calificacion >= 1 AND calificacion <= 5) NOT NULL,
    comentario TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(producto_id, comprador_id)
  );

  ALTER TABLE public.reseñas_productos ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Reseñas visibles para todos" ON public.reseñas_productos FOR SELECT USING (true);
  CREATE POLICY "Usuarios insertan sus reseñas" ON public.reseñas_productos FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id_usuario = auth.uid() AND p.perfil_id = reseñas_productos.comprador_id)
  );

  -- Tabla para calificaciones de tiendas
  CREATE TABLE IF NOT EXISTS public.calificaciones_tiendas (
    id_calificacion UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tienda_id UUID REFERENCES public.tiendas(id_tienda) ON DELETE CASCADE,
    comprador_id UUID REFERENCES public.perfiles(perfil_id) ON DELETE CASCADE,
    puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5) NOT NULL,
    comentario TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tienda_id, comprador_id)
  );

  ALTER TABLE public.calificaciones_tiendas ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Calificaciones tienda visibles" ON public.calificaciones_tiendas FOR SELECT USING (true);
  CREATE POLICY "Usuarios insertan sus calificaciones tienda" ON public.calificaciones_tiendas FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id_usuario = auth.uid() AND p.perfil_id = calificaciones_tiendas.comprador_id)
  );
