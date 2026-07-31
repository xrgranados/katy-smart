# Katy Smart 📱💼
> PWA (Progressive Web App) para la gestión inteligente y offline-first de tiendas de barrio.

**Katy Smart** es una aplicación web progresiva diseñada para digitalizar las operaciones diarias de una tienda de barrio en Guatemala. Su diseño está optimizado para dispositivos móviles, tablets y escritorios, enfocándose en la simplicidad, accesibilidad para usuarios no técnicos y resiliencia ante fallos de conexión (offline-first).

---

## 🚀 Características Clave (MVP)

1. **Corte de Caja Diario:**
   - Selección ágil de turnos (Mañana / Tarde) y cajas físicas.
   - Registro intuitivo con teclado numérico grande para rubros principales (Billetes, Monedas) y subcajas/rubros acumulativos (`caja_aparte` para Claro, Medicina, Librería).
   - Control de egresos por pagos a proveedores integrados.
   - Cálculo automático de saldo esperado vs. contado y visualización del estado mediante semáforo de descuadre.

2. **Gestión de Pedidos a Proveedores:**
   - Flujo dinámico tipo Kanban: **Pendiente → Recibido parcial → Recibido completo → Pagado**.
   - **Dictado por voz** nativo (Web Speech API) para transcripción inteligente de productos a líneas de pedido.
   - **Escaneo de códigos de barra** utilizando la cámara del dispositivo para identificar productos e inicializar datos rápidamente.
   - Registro detallado de recepciones y despachos con autocompletado inteligente.

3. **Estado de Cuenta ("Fiado" Digital):**
   - Panel interactivo imitando un cuaderno físico de fiados.
   - Registro de cargos y abonos con trazabilidad de qué familiar/persona autorizada realizó el movimiento.
   - Períodos de corte altamente personalizables por cliente (por defecto quincenal, 15 días).

4. **Portal del Cliente y Modo Kiosco:**
   - Consulta rápida de saldos, historial detallado de movimientos de la cuenta familiar, fecha de próximo pago y monto estimado.
   - **Modo Kiosco:** Dispositivo compartido en mostrador donde los clientes acceden de forma segura utilizando un PIN corto para ver únicamente sus datos de forma privada.

5. **Notificaciones Push y Centro de Mensajería:**
   - Envío de notificaciones inmediatas ante nuevos movimientos en la cuenta corriente.
   - Envío y programación de ofertas y avisos globales o individuales por parte del administrador.
   - Implementado mediante **Web Push API (VAPID)**, una solución nativa y libre de dependencias propietarias.

6. **Dashboard & Reportes en Tiempo Real (Admin):**
   - Métricas clave en tiempo real: ventas del día, pagos, saldo acumulado de cajas y carteras vencidas.
   - Exportación nativa de cualquier reporte a **PDF** y **Excel** desde el propio navegador.
   - Widget del día dinámico para el Administrador.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Vite.
- **Estilos:** Tailwind CSS (con soporte nativo para **Modo Oscuro** y diseño adaptable mobile-first/tablet).
- **Base de Datos y Backend:** Supabase (PostgreSQL con Row Level Security - RLS).
- **Gestión de Estado & Caché:** Zustand (estado global) y `@tanstack/react-query` (caché y sincronización).
- **Almacenamiento Local (Offline-first):** Dexie.js (IndexedDB) para cola de escrituras local con sincronización automática en segundo plano y detección de estado de red (`navigator.onLine`).
- **PWA:** `vite-plugin-pwa` para Service Worker (Workbox, caching estratégico) y archivo manifest.json para instalación y accesos directos desde el sistema operativo (`shortcuts`).

---

## 📂 Arquitectura de Carpetas

```text
katy-smart/
├── supabase/               # Migraciones de base de datos y políticas RLS
│   └── migrations/
├── public/                 # Assets públicos, íconos y SVG sprite
└── src/
    ├── assets/             # Imágenes y recursos estáticos
    ├── components/         # Componentes UI reutilizables y modulares
    │   ├── layout/         # Componentes de layouts para App
    │   ├── shared/         # Componentes compartidos
    │   └── ui/             # Componentes primitivos (Tailwind CSS)
    ├── config/             # Configuración de clientes de Supabase, etc.
    ├── db/                 # Configuración de Dexie (IndexedDB) para offline
    ├── hooks/              # Hooks personalizados para lógica de negocio y UI
    ├── pages/              # Páginas del sistema estructuradas por rol/módulo
    │   ├── admin/          # Panel, reportes y configuraciones
    │   ├── dependiente/    # Cortes de caja, Pedidos y Recepción
    │   ├── kiosco/         # Interfaz para consulta rápida del cliente
    │   └── shared/         # Notificaciones, Estados de Cuenta, etc.
    ├── store/              # Stores globales de Zustand (auth, offline, navegación, tema)
    ├── types/              # Tipos compartidos de TypeScript
    └── utils/              # Funciones auxiliares y formateadores
```

---

## ⚙️ Requisitos de Instalación

### Prerrequisitos

- **Node.js** v18 o superior.
- Una cuenta y proyecto en **Supabase**.

### Pasos para levantar localmente

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Rellena las variables con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

3. **Inicializar la Base de Datos:**
   Ejecuta las migraciones localizadas en `supabase/migrations/` en la consola SQL de tu proyecto en Supabase para crear las tablas, relaciones y activar Row Level Security (RLS).

4. **Correr en modo desarrollo:**
   ```bash
   npm run dev
   ```

5. **Construir para producción:**
   ```bash
   npm run build
   ```

---

## 🔒 Licencia

Este proyecto está licenciado bajo la Licencia MIT.
