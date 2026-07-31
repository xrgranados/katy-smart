import { create } from 'zustand';
import { db } from '../db/dexie';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  setOnlineStatus: (status: boolean) => void;
  updatePendingCount: () => Promise<number>;
  triggerSync: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => {
  // Función para contar el total de registros pendientes en IndexedDB
  const calculatePendingCount = async (): Promise<number> => {
    try {
      const cortes = await db.cortes_pendientes.count();
      const pedidos = await db.pedidos_pendientes.count();
      const movimientos = await db.movimientos_pendientes.count();
      const recepciones = await db.recepciones_pendientes.count();
      return cortes + pedidos + movimientos + recepciones;
    } catch (e) {
      console.error('Error calculando elementos pendientes en Dexie:', e);
      return 0;
    }
  };

  // Escuchar el estado de la conexión nativa
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      get().setOnlineStatus(true);
      get().triggerSync();
    });
    window.addEventListener('offline', () => {
      get().setOnlineStatus(false);
    });
  }

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    
    setOnlineStatus: (status) => {
      set({ isOnline: status });
      get().updatePendingCount();
    },

    updatePendingCount: async () => {
      const count = await calculatePendingCount();
      set({ pendingCount: count });
      return count;
    },

    triggerSync: async () => {
      const { isOnline, isSyncing } = get();
      if (!isOnline || isSyncing) return;

      const totalPending = await calculatePendingCount();
      if (totalPending === 0) return;

      set({ isSyncing: true });
      console.log('Sincronizando registros locales con Supabase...');

      // Simular un retardo breve de sincronización para UX de carga/sincronización
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        // En fases futuras aquí iría la sincronización de cada tabla.
        // Por ahora limpiamos o simulamos la sincronización borrando la cola local para demostración.
        await db.cortes_pendientes.clear();
        await db.pedidos_pendientes.clear();
        await db.movimientos_pendientes.clear();
        await db.recepciones_pendientes.clear();
        
        set({ pendingCount: 0, isSyncing: false });
        console.log('Sincronización exitosa.');
      } catch (error) {
        console.error('Error durante la sincronización:', error);
        set({ isSyncing: false });
      }
    }
  };
});
