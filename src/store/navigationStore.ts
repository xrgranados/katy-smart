import { create } from 'zustand';
import { type UserRole } from './authStore';

interface NavigationState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  getDefaultTabForRole: (role: UserRole) => string;
}

export const useNavigationStore = create<NavigationState>((set) => {
  const getDefaultTabForRole = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'dashboard';
      case 'dependiente':
        return 'corte-turno';
      case 'cliente':
        return 'mi-cuenta';
      case 'kiosco':
        return 'kiosco';
      default:
        return 'dashboard';
    }
  };

  return {
    activeTab: 'dashboard', // Default initial tab
    setActiveTab: (tab) => set({ activeTab: tab }),
    getDefaultTabForRole,
  };
});
