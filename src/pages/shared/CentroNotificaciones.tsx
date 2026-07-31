import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db, type Notificacion } from '../../db/dexie';
import { 
  Bell, 
  BookOpen, 
  Sparkles, 
  AlertTriangle, 
  Settings, 
  Trash2, 
  Check, 
  Send, 
  CheckCircle, 
  Smartphone, 
  Volume2, 
  Shield, 
  X, 
  RefreshCw
} from 'lucide-react';

const CLIENTES_CORRIENTES = [
  { id: 'feed0000-cafe-babe-0000-000000000000', nombre: 'Doña Fabiola' },
  { id: 'client-2', nombre: 'Don Luis (Carpintería)' }
];

const SAMPLE_NOTIFICATIONS: Notificacion[] = [
  {
    id: 'n1',
    tipo: 'oferta',
    titulo: '🍎 ¡Gran Oferta de Frutas y Verduras!',
    mensaje: 'Llegó tomate fresco y plátano de seda a mitad de precio. ¡Sólo por hoy en la tienda de Doña Katy!',
    destinatario: 'todos',
    leida: 0,
    fecha: new Date(Date.now() - 3600000 * 2).toISOString() // Hace 2 horas
  },
  {
    id: 'n2',
    tipo: 'recordatorio_pago',
    titulo: '🗓️ Próximo Corte Quincenal',
    mensaje: 'Estimado cliente, recuerde que el día de corte quincenal de su cuenta de fiados se aproxima. Evite recargos.',
    destinatario: 'feed0000-cafe-babe-0000-000000000000',
    leida: 0,
    fecha: new Date(Date.now() - 3600000 * 6).toISOString() // Hace 6 horas
  },
  {
    id: 'n3',
    tipo: 'sistema',
    titulo: '⚙️ Sincronización Fuera de Línea Exitosa',
    mensaje: 'La base de datos local Dexie ha conciliado todos los registros pendientes con el servidor en la nube.',
    destinatario: 'dependientes',
    leida: 1,
    fecha: new Date(Date.now() - 3600000 * 24).toISOString() // Hace 1 día
  },
  {
    id: 'n4',
    tipo: 'fiado',
    titulo: '📖 Nuevo Cargo de Compra Registrado',
    mensaje: 'Se ha registrado un cargo de $120.00 por compra de Abarrotes bajo la cuenta autorizada.',
    destinatario: 'feed0000-cafe-babe-0000-000000000000',
    leida: 0,
    fecha: new Date(Date.now() - 3600000 * 1).toISOString() // Hace 1 hora
  }
];

export function CentroNotificaciones() {
  const { user, activeRole } = useAuthStore();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del Formulario de Redacción (Admin)
  const [formTipo, setFormTipo] = useState<'oferta' | 'recordatorio_pago' | 'sistema'>('oferta');
  const [formTitulo, setFormTitulo] = useState('');
  const [formMensaje, setFormMensaje] = useState('');
  const [formDestinatario, setFormDestinatario] = useState('todos'); // 'todos', 'dependientes', o client_id

  // Estados de la Simulación Web Push
  const [pushPermiso, setPushPermiso] = useState<NotificationPermission>('default');
  const [mostrarSimulatedPush, setMostrarSimulatedPush] = useState(false);
  const [simulatedPushData, setSimulatedPushData] = useState<{ titulo: string; mensaje: string; tipo: string } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    // Verificar permisos de notificación nativa
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermiso(Notification.permission);
    }
    
    cargarNotificaciones();
  }, []);

  const cargarNotificaciones = async () => {
    setLoading(true);
    try {
      const dbNotifs = await db.notificaciones.toArray();
      
      // Si la base de datos está vacía, la poblamos con los datos muestra para una demo rica
      if (dbNotifs.length === 0) {
        await db.notificaciones.bulkAdd(SAMPLE_NOTIFICATIONS);
        const seededNotifs = await db.notificaciones.toArray();
        setNotificaciones(seededNotifs);
      } else {
        setNotificaciones(dbNotifs);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones en IndexedDB:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar notificaciones según el rol activo
  const getNotificacionesFiltradas = () => {
    // Ordenar por fecha (más reciente primero)
    const sorted = [...notificaciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    
    if (activeRole === 'admin') {
      // El administrador ve todas las notificaciones del sistema para auditoría y control
      return sorted;
    }
    
    if (activeRole === 'dependiente') {
      // El dependiente ve notificaciones dirigidas a dependientes, avisos de sistema y ofertas generales
      return sorted.filter(n => 
        n.destinatario === 'dependientes' || 
        n.destinatario === 'todos' || 
        n.tipo === 'sistema'
      );
    }
    
    if (activeRole === 'cliente' && user) {
      // El cliente ve ofertas para todos ("todos") y notificaciones dirigidas específicamente a su ID
      return sorted.filter(n => 
        n.destinatario === 'todos' || 
        n.destinatario === user.id
      );
    }
    
    return [];
  };

  const handleMarcarLeida = async (id: string) => {
    try {
      await db.notificaciones.update(id, { leida: 1 });
      setNotificaciones(prev => 
        prev.map(n => n.id === id ? { ...n, leida: 1 } : n)
      );
      showToast('✅ Notificación marcada como leída.');
    } catch (error) {
      console.error('Error al actualizar notificación:', error);
    }
  };

  const handleEliminarNotificacion = async (id: string) => {
    try {
      await db.notificaciones.delete(id);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      showToast('🗑️ Notificación eliminada correctamente.');
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    const filtradas = getNotificacionesFiltradas().filter(n => n.leida === 0);
    if (filtradas.length === 0) return;
    
    try {
      await Promise.all(filtradas.map(n => db.notificaciones.update(n.id!, { leida: 1 })));
      setNotificaciones(prev => 
        prev.map(n => filtradas.some(f => f.id === n.id) ? { ...n, leida: 1 } : n)
      );
      showToast('✅ Todas las notificaciones del rol marcadas como leídas.');
    } catch (error) {
      console.error('Error al actualizar bulk:', error);
    }
  };

  const solicitarPermisosNativos = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setPushPermiso(res);
      if (res === 'granted') {
        showToast('🔔 ¡Permisos de notificación nativos concedidos!');
      } else {
        showToast('⚠️ Permisos rechazados o bloqueados por el navegador.');
      }
    } else {
      showToast('❌ Su navegador no soporta notificaciones de escritorio nativas.');
    }
  };

  const handleEnviarNotificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formMensaje.trim()) {
      showToast('⚠️ Por favor complete el título y cuerpo de la notificación.');
      return;
    }

    const nuevaNotif: Notificacion = {
      id: 'notif-' + Date.now(),
      tipo: formTipo,
      titulo: formTitulo,
      mensaje: formMensaje,
      destinatario: formDestinatario,
      leida: 0,
      fecha: new Date().toISOString()
    };

    try {
      // 1. Guardar en Dexie DB local-first
      await db.notificaciones.add(nuevaNotif);
      setNotificaciones(prev => [nuevaNotif, ...prev]);

      // 2. Simular Web Push con VAPID / Notificación Nativa
      let nativaLanzada = false;
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(formTitulo, {
            body: formMensaje,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: nuevaNotif.id
          });
          nativaLanzada = true;
          showToast('🚀 Notificación push nativa enviada al sistema operativo.');
        } catch (err) {
          console.warn('Error al disparar notificación nativa:', err);
        }
      }

      // 3. Si no se pudo o no se concedieron permisos nativos, disparamos el simulador interactivo de alta fidelidad en pantalla
      if (!nativaLanzada) {
        setSimulatedPushData({
          titulo: formTitulo,
          mensaje: formMensaje,
          tipo: formTipo
        });
        setMostrarSimulatedPush(true);
        // Cerrar simulación automáticamente después de 8 segundos si no interactúa
        setTimeout(() => {
          setMostrarSimulatedPush(prev => {
            if (prev) return false;
            return false;
          });
        }, 8000);
      }

      // Limpiar formulario
      setFormTitulo('');
      setFormMensaje('');
      showToast('✉️ Notificación registrada en base de datos local.');
    } catch (error) {
      console.error('Error al guardar notificación:', error);
      showToast('❌ Error al procesar el envío.');
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Helper para renderizar los iconos coloreados por tipo de notificación
  const renderIcon = (tipo: string) => {
    switch (tipo) {
      case 'fiado':
        return (
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
        );
      case 'oferta':
        return (
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      case 'recordatorio_pago':
        return (
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'sistema':
      default:
        return (
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Settings className="w-5 h-5" />
          </div>
        );
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'fiado': return 'Aviso de Fiado';
      case 'oferta': return 'Oferta del Día';
      case 'recordatorio_pago': return 'Recordatorio de Pago';
      case 'sistema': return 'Aviso del Sistema';
      default: return 'General';
    }
  };

  const getDestinatarioLabel = (dest: string) => {
    if (dest === 'todos') return 'Todos los Clientes';
    if (dest === 'dependientes') return 'Solo Dependientes';
    const cli = CLIENTES_CORRIENTES.find(c => c.id === dest);
    return cli ? `Cliente: ${cli.nombre}` : 'Desconocido';
  };

  const notificacionesFiltradas = getNotificacionesFiltradas();
  const unreadCount = notificacionesFiltradas.filter(n => n.leida === 0).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-1 sm:px-4 py-2 relative">
      
      {/* TOAST INTERNO DE OPERACIONES */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 border border-slate-700 dark:border-slate-600 transition-all text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* SIMULADOR INTERACTIVO WEB PUSH TIPO MÓVIL (PANTALLA DE ALERTA AL RECIBIR NOTIFICACIÓN EN SEGUNDO PLANO) */}
      {mostrarSimulatedPush && simulatedPushData && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-sm bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-3xl shadow-2xl border-2 border-purple-500/60 p-4 transition-all duration-500 animate-bounce">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center space-x-1.5 text-xs text-purple-400 font-bold">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>Simulación Web Push Móvil 📱</span>
            </div>
            <button 
              onClick={() => setMostrarSimulatedPush(false)}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Tarjeta interna de notificación estilo PWA */}
          <div className="bg-slate-800/80 dark:bg-slate-900/90 rounded-2xl p-3 border border-slate-700 flex space-x-3 items-start shadow-inner">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              KS
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">Katy Smart PWA</span>
                <span className="text-[10px] text-slate-400">ahora mismo</span>
              </div>
              <h4 className="text-sm font-extrabold text-white truncate mt-0.5">{simulatedPushData.titulo}</h4>
              <p className="text-xs text-slate-300 mt-1 line-clamp-3 leading-relaxed">{simulatedPushData.mensaje}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end space-x-2">
            <button
              onClick={() => {
                setMostrarSimulatedPush(false);
                // Si hace click, refresca deIndexedDB para asegurar consistencia
                cargarNotificaciones();
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Ver en Bandeja</span>
            </button>
          </div>
        </div>
      )}

      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-purple-600 dark:text-purple-400">
              <Bell className="w-6 h-6 animate-swing" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Centro de Notificaciones</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Rol Activo: <strong className="text-purple-600 dark:text-purple-400 capitalize">{activeRole === 'admin' ? 'Dueño (Admin)' : activeRole}</strong>.
            Gestiona y visualiza avisos, ofertas y estados de cuenta en tiempo real.
          </p>
        </div>

        {/* Panel de control de permisos push */}
        <div className="flex items-center space-x-2 self-start md:self-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          <Shield className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-slate-500 dark:text-slate-400 block">Notificaciones Nativa OS:</span>
            <span className={`font-bold uppercase ${
              pushPermiso === 'granted' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : pushPermiso === 'denied' 
                ? 'text-rose-500 dark:text-rose-400' 
                : 'text-amber-500'
            }`}>
              {pushPermiso === 'granted' ? 'Permitido 🟢' : pushPermiso === 'denied' ? 'Bloqueado 🔴' : 'Sin Solicitar 🟡'}
            </span>
          </div>
          {pushPermiso !== 'granted' && (
            <button
              onClick={solicitarPermisosNativos}
              className="ml-3 px-3 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold rounded-lg transition-colors border border-purple-200/50 dark:border-purple-800/40"
            >
              Habilitar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA BANDEJA DE NOTIFICACIONES UNIFICADA */}
        <div className={`lg:col-span-${activeRole === 'admin' ? '7' : '12'} space-y-4`}>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Su Bandeja Unificada</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-extrabold rounded-full text-xs shadow-sm">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarcarTodasLeidas}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Marcar todas leídas</span>
                  </button>
                )}
                <button
                  onClick={cargarNotificaciones}
                  title="Sincronizar"
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                <span className="text-sm">Cargando base de datos IndexedDB...</span>
              </div>
            ) : notificacionesFiltradas.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700">
                  <Bell className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">Sin notificaciones</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No tiene ninguna alerta o campaña disponible para su rol en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {notificacionesFiltradas.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 relative overflow-hidden ${
                      notif.leida === 0
                        ? 'bg-purple-50/40 dark:bg-purple-950/10 border-purple-200/60 dark:border-purple-900/30 ring-1 ring-purple-100 dark:ring-purple-900/20'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    {/* Barra decorativa para indicar tipo o si está no leída */}
                    {notif.leida === 0 && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                    )}

                    {/* Icono de tipo */}
                    <div className="flex-shrink-0 self-start">
                      {renderIcon(notif.tipo)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {getTipoLabel(notif.tipo)}
                        </span>
                        {activeRole === 'admin' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            Para: {getDestinatarioLabel(notif.destinatario)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.fecha).toLocaleDateString()} {new Date(notif.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      
                      <h3 className={`text-sm font-bold text-slate-900 dark:text-white ${notif.leida === 0 ? 'text-purple-900 dark:text-purple-200' : ''}`}>
                        {notif.titulo}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {notif.mensaje}
                      </p>
                    </div>

                    {/* Acciones de la notificación */}
                    <div className="flex items-center space-x-2 sm:self-center">
                      {notif.leida === 0 && (
                        <button
                          onClick={() => handleMarcarLeida(notif.id!)}
                          title="Marcar como leída"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors border border-emerald-200/30 dark:border-emerald-900/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEliminarNotificacion(notif.id!)}
                        title="Eliminar notificación"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors border border-rose-200/30 dark:border-rose-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA FORMULARIO DE REDACCIÓN DEL ADMINISTRADOR (SOLO ADMIN) */}
        {activeRole === 'admin' && (
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <Send className="w-5 h-5" />
                </div>
                <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Redactar Notificación</h2>
              </div>

              <form onSubmit={handleEnviarNotificacion} className="space-y-4">
                {/* Tipo de Notificación */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Tipo de Aviso
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['oferta', 'recordatorio_pago', 'sistema'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormTipo(t)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold capitalize border transition-all flex flex-col items-center justify-center space-y-1 ${
                          formTipo === t
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm font-black'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t === 'oferta' && <Sparkles className="w-4 h-4" />}
                        {t === 'recordatorio_pago' && <AlertTriangle className="w-4 h-4" />}
                        {t === 'sistema' && <Settings className="w-4 h-4" />}
                        <span>{t === 'recordatorio_pago' ? 'Pago' : t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destinatario */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between">
                    <span>Destinatario</span>
                    <span className="text-[10px] lowercase text-purple-500 font-normal">Sincronizado con cuentas corrientes</span>
                  </label>
                  <select
                    value={formDestinatario}
                    onChange={(e) => setFormDestinatario(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                  >
                    <optgroup label="Grupos de Usuarios">
                      <option value="todos">📣 Todos los Clientes</option>
                      <option value="dependientes">🧑‍💼 Dependientes de Tienda</option>
                    </optgroup>
                    <optgroup label="Clientes de Cuenta Corriente">
                      {CLIENTES_CORRIENTES.map((cli) => (
                        <option key={cli.id} value={cli.id}>
                          👤 {cli.nombre}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Título */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Título de la Notificación
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ej. ¡Llegó Tomate Fresco a $15.00!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Mensaje */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Cuerpo del Mensaje (Mensaje PUSH)
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formMensaje}
                    onChange={(e) => setFormMensaje(e.target.value)}
                    placeholder="Escriba el detalle del aviso aquí de forma directa..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Botón de Envío */}
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 border-b-4 border-purple-800 hover:border-purple-900 active:border-b-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Notificación Inmediata</span>
                </button>
              </form>

              {/* Caja explicativa de VAPID y simulación */}
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed space-y-1.5">
                <div className="flex items-center space-x-1 font-bold">
                  <Volume2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                  <span>¿Cómo funciona la Simulación VAPID?</span>
                </div>
                <p>
                  Si otorgó permisos nativos de notificación a la PWA, recibirá un aviso real del sistema operativo. De lo contrario, se renderizará un <strong>Smartphone Toast interactivo</strong> en pantalla que imita un dispositivo móvil real en segundo plano.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
