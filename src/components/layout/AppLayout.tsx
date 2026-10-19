import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore, type UserRole } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useOfflineStore } from '../../store/offlineStore';
import { useNavigationStore } from '../../store/navigationStore';
import { db } from '../../db/dexie';
import { 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  TrendingUp, 
  ShoppingCart, 
  BookOpen, 
  Bell, 
  HelpCircle,
  LogOut,
  Package,
  Search,
  ArrowRight
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, activeRole, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineStore();
  const { activeTab, setActiveTab, getDefaultTabForRole } = useNavigationStore();

  // GLOBAL SEARCH STATE
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{
    clientes: any[];
    pedidos: any[];
  }>({ clientes: [], pedidos: [] });
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sincronizar pestaña activa cuando cambia el rol activo
  useEffect(() => {
    if (activeRole) {
      setActiveTab(getDefaultTabForRole(activeRole));
    }
  }, [activeRole]);

  // Manejar click fuera del buscador para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // BÚSQUEDA GLOBAL MULTI-TABLA EN INDEXEDDB
  useEffect(() => {
    const performGlobalSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ clientes: [], pedidos: [] });
        return;
      }

      const q = searchQuery.toLowerCase();
      try {
        const localClientes = await db.movimientos_pendientes.toArray();
        const matchedClientes = localClientes.filter(
          c => c.persona_nombre?.toLowerCase().includes(q) || c.descripcion_items.toLowerCase().includes(q)
        );

        const localPedidos = await db.pedidos_pendientes.toArray();
        const matchedPedidos = localPedidos.filter(
          p => p.proveedor_nombre.toLowerCase().includes(q) || 
               p.items.some(i => i.descripcion.toLowerCase().includes(q))
        );

        setSearchResults({
          clientes: matchedClientes,
          pedidos: matchedPedidos
        });
      } catch (err) {
        console.error('Error en búsqueda global:', err);
      }
    };

    const delayDebounce = setTimeout(() => {
      performGlobalSearch();
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Navegación según el rol activo (Administrador, Dependiente, Cliente)
  const getNavItems = () => {
    switch (activeRole) {
      case 'administrador':
        return [
          { id: 'dashboard', name: 'Dashboard', icon: TrendingUp },
          { id: 'cortes', name: 'Historial Cortes', icon: ShoppingCart },
          { id: 'pedidos', name: 'Pedidos / Proveedores', icon: Package },
          { id: 'cuentas', name: 'Libreta de Fiados', icon: BookOpen },
          { id: 'notificaciones', name: 'Notificaciones', icon: Bell },
        ];
      case 'dependiente':
        return [
          { id: 'corte-turno', name: 'Corte de Turno', icon: ShoppingCart },
          { id: 'pedidos', name: 'Pedidos / Proveedores', icon: Package },
          { id: 'cuentas', name: 'Anotar Fiado', icon: BookOpen },
          { id: 'notificaciones', name: 'Centro Avisos', icon: Bell }
        ];
      case 'cliente':
        return [
          { id: 'mi-cuenta', name: 'Mi Cuenta', icon: BookOpen },
          { id: 'notificaciones', name: 'Ofertas y Avisos', icon: Bell },
          { id: 'ayuda', name: 'Ayuda', icon: HelpCircle }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleSelectSearchResult = (tab: string, entityId: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    setShowSearchResults(false);
    localStorage.setItem('selected_entity_id', entityId);
    window.dispatchEvent(new Event('global_search_navigated'));
  };

  const hasSearchResults = searchResults.clientes.length > 0 || searchResults.pedidos.length > 0;

  const getRoleDisplayName = (r?: UserRole | null) => {
    if (r === 'administrador') return 'Administrador';
    if (r === 'dependiente') return 'Dependiente';
    if (r === 'cliente') return 'Cliente';
    return 'Usuario';
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* 1. BARRA LATERAL (DESKTOP / TABLET) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 transition-colors duration-200 print:hidden justify-between">
        <div>
          {/* Marca / Logo */}
          <div className="flex items-center space-x-2.5 px-2 py-3 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-purple-600/30">
              K
            </div>
            <div>
              <span className="font-black text-lg text-slate-900 dark:text-white block leading-tight">Katy Smart</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">POS & Fiados</span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isTabActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                    isTabActive 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tarjeta de Usuario Autenticado en Producción con Botón de Salir */}
        {user && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {user.nombre.charAt(0)}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.nombre}</p>
                  <span className="inline-block text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded-md">
                    {getRoleDisplayName(activeRole)}
                  </span>
                </div>
              </div>

              <button 
                onClick={logout}
                className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* CABECERA SUPERIOR */}
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between transition-colors duration-200 shadow-sm print:hidden">
          
          {/* Logo en Móvil / Título de Página en Desktop */}
          <div className="flex items-center space-x-2 md:space-x-0">
            <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              K
            </div>
            <h1 className="md:block font-bold text-base text-slate-800 dark:text-slate-200 pl-1 shrink-0">
              <span className="md:hidden text-purple-700 dark:text-purple-400 font-bold mr-1">Katy Smart</span>
              <span className="hidden md:inline font-bold">
                {activeTab === 'dashboard' ? 'Panel de Control General' :
                 activeTab === 'corte-turno' ? 'Corte de Caja por Turno' :
                 activeTab === 'cortes' ? 'Historial de Cortes' :
                 activeTab === 'pedidos' ? 'Pedidos a Proveedores' :
                 activeTab === 'cuentas' ? 'Libreta de Fiados' :
                 activeTab === 'mi-cuenta' ? 'Mi Estado de Cuenta' :
                 activeTab === 'notificaciones' ? 'Centro de Notificaciones' :
                 'Katy Smart'}
              </span>
            </h1>
          </div>

          {/* BUSCADOR GLOBAL */}
          <div ref={searchContainerRef} className="hidden sm:block flex-1 max-w-xs mx-4 relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar clientes o pedidos..."
                value={searchQuery}
                onFocus={() => setShowSearchResults(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                className="w-full py-1.5 pl-8 pr-3 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 text-xs">
                {!hasSearchResults ? (
                  <div className="p-4 text-center text-slate-400 italic">No se encontraron resultados para "{searchQuery}"</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.clientes.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider px-2 py-1">📂 Clientes</div>
                        {searchResults.clientes.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectSearchResult(activeRole === 'cliente' ? 'mi-cuenta' : 'cuentas', c.id)}
                            className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <span className="font-semibold block text-slate-800 dark:text-slate-200 group-hover:text-purple-600">{c.persona_nombre || 'Cliente'}</span>
                              <span className="text-[10px] text-slate-400">{c.descripcion_items}</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INDICADORES DE CONEXIÓN, TEMA Y USUARIO EN MÓVIL */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Estado de Red / Sincronización */}
            <div 
              onClick={() => isOnline && pendingCount > 0 && triggerSync()}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all ${
                !isOnline
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                  : isSyncing
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 animate-pulse'
                  : pendingCount > 0
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
              }`}
            >
              {!isOnline ? (
                <WifiOff className="w-3.5 h-3.5" />
              ) : isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wifi className="w-3.5 h-3.5" />
              )}

              <span className="hidden sm:inline">
                {!isOnline 
                  ? 'Offline' 
                  : isSyncing 
                  ? 'Sincronizando...' 
                  : pendingCount > 0 
                  ? `${pendingCount} pend.` 
                  : 'En Línea'
                }
              </span>
            </div>

            {/* Toggle Tema Claro/Oscuro */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Botón Salir en Móvil */}
            <button
              onClick={logout}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 print:p-0">
          {children}
        </main>

        {/* NAVEGACIÓN INFERIOR PARA DISPOSITIVOS MÓVILES */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 transition-colors duration-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] print:hidden">
          {navItems.slice(0, 4).map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-20 py-1 rounded-xl transition-all ${
                  isTabActive 
                    ? 'text-purple-600 dark:text-purple-400 scale-105 font-bold' 
                    : 'text-slate-400'
                }`}
              >
                <item.icon className={`w-5 h-5 mb-0.5 ${isTabActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                <span className="text-[10px] tracking-tight truncate w-full text-center">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
