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
  User, 
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
  const { user, activeRole, loginAsMock, logout } = useAuthStore();
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

  // LÓGICA DE BÚSQUEDA GLOBAL MULTI-TABLA EN INDEXEDDB
  useEffect(() => {
    const performGlobalSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ clientes: [], pedidos: [] });
        return;
      }

      const q = searchQuery.toLowerCase();
      try {
        // 1. Buscar en cuentas corrientes de Dexie/localStorage (simulado o real)
        // Como los clientes se inicializan en EstadoCuenta, hacemos una consulta
        // Podemos buscar cuentas en Dexie si están guardadas, o simular una lista de clientes conocidos
        const localClientes = [
          { id: 'fabiola-cc-id', nombre_principal: 'Doña Fabiola Estrada', telefono: '5544-3322' },
          { id: 'luis-cc-id', nombre_principal: 'Don Luis Morales', telefono: '4455-6677' },
          { id: 'gomez-cc-id', nombre_principal: 'Familia Gómez', telefono: '2211-9988' }
        ];

        const matchedClientes = localClientes.filter(
          c => c.nombre_principal.toLowerCase().includes(q) || c.telefono.includes(q)
        );

        // 2. Buscar en pedidos de Dexie
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

  // Navigation items based on current active role
  const getNavItems = () => {
    switch (activeRole) {
      case 'admin':
        return [
          { id: 'dashboard', name: 'Dashboard', icon: TrendingUp },
          { id: 'cortes', name: 'Cortes (Ventas)', icon: ShoppingCart },
          { id: 'pedidos', name: 'Pedidos / Proveedores', icon: Package },
          { id: 'cuentas', name: 'Cuentas / Fiados', icon: BookOpen },
          { id: 'notificaciones', name: 'Notificaciones', icon: Bell },
        ];
      case 'dependiente':
        return [
          { id: 'corte-turno', name: 'Corte de Turno', icon: ShoppingCart },
          { id: 'pedidos', name: 'Pedidos / Proveedores', icon: Package },
          { id: 'cuentas', name: 'Registrar Fiado', icon: BookOpen },
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

  const handleRoleChange = (role: UserRole) => {
    loginAsMock(role);
  };

  const handleSelectSearchResult = (tab: string, entityId: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    setShowSearchResults(false);
    
    // Si saltamos a cuentas o pedidos, podemos guardar el ID de navegación en localStorage 
    // para que la vista detallada se abra automáticamente
    localStorage.setItem('selected_entity_id', entityId);
    
    // Disparar evento para que el componente hijo se entere y se actualice si es necesario
    window.dispatchEvent(new Event('global_search_navigated'));
  };

  const hasSearchResults = searchResults.clientes.length > 0 || searchResults.pedidos.length > 0;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* 1. SIDEBAR NAVIGATION - VISIBLE ON TABLET/DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 transition-colors duration-200 print:hidden">
        {/* Brand */}
        <div className="flex items-center space-x-2 px-2 py-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
            K
          </div>
          <span className="font-bold text-xl text-purple-700 dark:text-purple-400">Katy Smart</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isTabActive 
                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Selector de Rol Mock (Sólo para fase de desarrollo y demo) */}
        <div className="bg-purple-50 dark:bg-slate-800/40 p-3 rounded-xl border border-purple-100 dark:border-slate-800/80 mt-auto">
          <div className="flex items-center space-x-2 mb-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
            <User className="w-4 h-4" />
            <span>DEMO: Cambiar de Rol</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {(['admin', 'dependiente', 'cliente', 'kiosco'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium capitalize transition-all ${
                  activeRole === r
                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                {r === 'admin' ? 'Dueño (Admin)' : r === 'dependiente' ? 'Dependiente' : r === 'kiosco' ? 'Kiosco Público 🖥️' : 'Cliente'}
              </button>
            ))}
          </div>
        </div>

        {/* User Info / Logout */}
        {user && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.nombre}</p>
                <p className="text-[10px] text-slate-500 capitalize">{activeRole}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP STATUS BAR & HEADER */}
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between transition-colors duration-200 shadow-sm print:hidden">
          
          {/* Brand on Mobile / Page Title on Desktop */}
          <div className="flex items-center space-x-2 md:space-x-0">
            <div className="md:hidden w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
              K
            </div>
            <h1 className="md:block font-bold text-lg text-slate-800 dark:text-slate-200 pl-1 shrink-0">
              <span className="md:hidden text-purple-700 dark:text-purple-400 font-bold mr-1">Katy Smart</span>
              <span className="hidden md:inline font-semibold">
                {activeTab === 'dashboard' ? 'Panel de Control (Dueño)' :
                 activeTab === 'corte-turno' ? 'Corte de Turno' :
                 activeTab === 'cortes' ? 'Historial de Ventas' :
                 activeTab === 'pedidos' ? 'Pedidos a Proveedores' :
                 activeTab === 'cuentas' ? 'Estado de Cuenta / Fiados' :
                 activeTab === 'mi-cuenta' ? 'Mi Estado de Cuenta' :
                 activeTab === 'notificaciones' ? 'Centro de Notificaciones' :
                 'Katy Smart'}
              </span>
            </h1>
          </div>

          {/* 🔍 BUSCADOR GLOBAL (INTERMEDIO EN CABECERA) */}
          <div ref={searchContainerRef} className="hidden sm:block flex-1 max-w-sm mx-4 relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar clientes, pedidos, productos..."
                value={searchQuery}
                onFocus={() => setShowSearchResults(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                className="w-full py-1.5 pl-8 pr-3 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-slate-850 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {/* PANEL DE RESULTADOS DE BÚSQUEDA GLOBAL FLOATING CARD */}
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 text-xs">
                {!hasSearchResults ? (
                  <div className="p-4 text-center text-slate-400 italic">No se encontraron resultados para "{searchQuery}"</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Sección Clientes */}
                    {searchResults.clientes.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider px-2 py-1">📂 Clientes de Cuenta Corriente</div>
                        {searchResults.clientes.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectSearchResult(activeRole === 'cliente' ? 'mi-cuenta' : 'cuentas', c.id)}
                            className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <span className="font-semibold block text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">{c.nombre_principal}</span>
                              <span className="text-[10px] text-slate-400">Tel: {c.telefono}</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-purple-500 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Sección Pedidos */}
                    {searchResults.pedidos.length > 0 && (
                      <div className="p-2">
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider px-2 py-1">📦 Pedidos a Proveedores</div>
                        {searchResults.pedidos.map(p => (
                          <button
                            key={p.id}
                            onClick={() => handleSelectSearchResult('pedidos', p.id)}
                            className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <span className="font-semibold block text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{p.proveedor_nombre}</span>
                              <span className="text-[10px] text-slate-400 truncate block max-w-[250px]">
                                {p.items?.map((i: any) => i.descripcion).join(', ')}
                              </span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connection, Sync and Theme indicators */}
          <div className="flex items-center space-x-3 shrink-0">
            
            {/* 🟢/🔴 INDICADOR DE SINCRONIZACIÓN Y RED */}
            <div 
              onClick={() => isOnline && pendingCount > 0 && triggerSync()}
              className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-all ${
                !isOnline
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                  : isSyncing
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 animate-pulse'
                  : pendingCount > 0
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 hover:bg-amber-200'
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
                  ? 'Offline (Guardado local)' 
                  : isSyncing 
                  ? `Sincronizando...` 
                  : pendingCount > 0 
                  ? `${pendingCount} pendientes (Sincronizar)` 
                  : 'Conectado / Al día'
                }
              </span>
              <span className="sm:hidden">
                {!isOnline 
                  ? 'Offline' 
                  : isSyncing 
                  ? 'Sinc' 
                  : pendingCount > 0 
                  ? `${pendingCount} pend` 
                  : 'Online'
                }
              </span>
            </div>

            {/* Toggle Tema Claro/Oscuro */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* MAIN BODY SCROLLABLE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 print:p-0">
          {children}
        </main>

        {/* 2. BOTTOM NAVIGATION - VISIBLE ONLY ON MOBILE */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 transition-colors duration-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] print:hidden">
          {navItems.slice(0, 4).map((item) => {
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-20 py-1 rounded-xl transition-all ${
                  isTabActive 
                    ? 'text-purple-600 dark:text-purple-400 scale-105 font-semibold' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <item.icon className={`w-6 h-6 mb-0.5 ${isTabActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                <span className="text-[10px] tracking-tight truncate w-full text-center">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
