import { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { useOfflineStore } from './store/offlineStore';
import { useNavigationStore } from './store/navigationStore';
import { Dashboard } from './pages/admin/Dashboard';
import { CorteCaja } from './pages/dependiente/CorteCaja';
import { Pedidos } from './pages/dependiente/Pedidos';
import { EstadoCuenta } from './pages/shared/EstadoCuenta';
import { ConsultaKiosco } from './pages/kiosco/ConsultaKiosco';
import { CentroNotificaciones } from './pages/shared/CentroNotificaciones';
import { db } from './db/dexie';
import { 
  Check, 
  Trash2, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

function App() {
  const { isOnline, pendingCount, updatePendingCount, setOnlineStatus } = useOfflineStore();
  const { activeTab } = useNavigationStore();
  
  // Estados para simulación interactiva
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    updatePendingCount();
  }, []);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleLimpiarCola = async () => {
    await db.cortes_pendientes.clear();
    await db.pedidos_pendientes.clear();
    await db.movimientos_pendientes.clear();
    await db.recepciones_pendientes.clear();
    await updatePendingCount();
    showToast('🗑️ Cola de IndexedDB limpiada con éxito.');
  };

  // Renderizador condicional de páginas basado en la pestaña activa
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'corte-turno':
        return <CorteCaja />;
      case 'pedidos':
        return <Pedidos />;
      case 'cuentas':
      case 'mi-cuenta':
        return <EstadoCuenta />;
      case 'kiosco':
        return <ConsultaKiosco />;
      case 'notificaciones':
        return <CentroNotificaciones />;
      case 'ayuda':
        return (
          <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/40 rounded-full flex items-center justify-center mx-auto text-teal-600 dark:text-teal-400">
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

  return (
    <AppLayout>
      {/* Toast Alert */}
      {successMessage && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 bg-slate-900 text-white dark:bg-purple-900 dark:text-purple-100 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 border border-slate-700 dark:border-purple-800 transition-all">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* BARRA DE CONTROL DE DEMO INTERACTIVA */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          <AlertCircle className="w-4 h-4 text-purple-600" />
          <span>
            <strong>Simulador de Conectividad PWA:</strong> {isOnline ? '🟢 Conectado a Internet' : '🔴 Desconectado (Offline)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleLimpiarCola}
              className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/25 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar Dexie</span>
            </button>
          )}
          <button
            onClick={() => setOnlineStatus(!isOnline)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 ${
              isOnline 
                ? 'bg-rose-600 text-white hover:bg-rose-700' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <span>Simular {isOnline ? 'Ir Offline' : 'Ir Online'}</span>
          </button>
        </div>
      </div>

      {/* RENDERIZAR PÁGINA ACTIVA */}
      <div className="animate-fade-in duration-300">
        {renderActivePage()}
      </div>
    </AppLayout>
  );
}

export default App;
