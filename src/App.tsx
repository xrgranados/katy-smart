import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { useOfflineStore } from './store/offlineStore';
import { useNavigationStore } from './store/navigationStore';
import { useAuthStore } from './store/authStore';
import { Dashboard } from './pages/admin/Dashboard';
import { CorteCaja } from './pages/dependiente/CorteCaja';
import { Pedidos } from './pages/dependiente/Pedidos';
import { EstadoCuenta } from './pages/shared/EstadoCuenta';
import { CentroNotificaciones } from './pages/shared/CentroNotificaciones';
import { Login } from './pages/auth/Login';
import { SkeletonCard } from './components/ui/Skeleton';
import { 
  HelpCircle,
  Loader2
} from 'lucide-react';

function App() {
  const { updatePendingCount } = useOfflineStore();
  const { activeTab } = useNavigationStore();
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
    updatePendingCount();
  }, []);

  // Renderizador condicional de páginas basado en la pestaña activa
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'corte-turno':
      case 'cortes':
        return <CorteCaja />;
      case 'pedidos':
        return <Pedidos />;
      case 'cuentas':
      case 'mi-cuenta':
        return <EstadoCuenta />;
      case 'notificaciones':
        return <CentroNotificaciones />;
      case 'ayuda':
        return (
          <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/40 rounded-full flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Centro de Ayuda</h3>
            <p className="text-sm text-slate-500">Instrucciones interactivas para que dependientes y clientes usen la aplicación.</p>
          </div>
        );
      default:
        return (
          <div className="text-center py-12 text-slate-500">
            Vista no implementada.
          </div>
        );
    }
  };

  // 1. Pantalla de carga con Skeleton Loader (Umbral de Doherty)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Iniciando Katy Smart...</p>
        <div className="w-full max-w-sm">
          <SkeletonCard rows={2} />
        </div>
      </div>
    );
  }

  // 2. Pantalla de Autenticación si no hay sesión activa
  if (!isAuthenticated) {
    return <Login />;
  }

  // 3. Aplicación en Modo Producción con AppLayout
  return (
    <AppLayout>
      {/* RENDERIZAR PÁGINA ACTIVA */}
      <div className="animate-fade-in duration-300">
        {renderActivePage()}
      </div>
    </AppLayout>
  );
}

export default App;
