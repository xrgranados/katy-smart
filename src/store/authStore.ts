import { create } from 'zustand';

export type UserRole = 'admin' | 'dependiente' | 'cliente' | 'kiosco';

interface User {
  id: string;
  nombre: string;
  telefono?: string;
  rol: UserRole;
  tienda_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole | null;
  loginAsMock: (rol: UserRole) => void;
  logout: () => void;
}

const DEFAULT_TIENDA_ID = 'de305d54-75b4-431b-adb2-eb6b9e546014';

export const useAuthStore = create<AuthState>((set) => {
  // Inicialización de usuario mock por defecto para agilizar desarrollo de MVP
  const defaultUser: User = {
    id: 'f9d3b76e-11bc-40d6-8b94-98442eb12eef',
    nombre: 'Don Carlos - Admin',
    rol: 'admin',
    tienda_id: DEFAULT_TIENDA_ID,
  };

  return {
    user: defaultUser,
    isAuthenticated: true,
    activeRole: 'admin',
    loginAsMock: (rol: UserRole) => {
      let nombre = 'Don Carlos - Admin';
      let id = 'f9d3b76e-11bc-40d6-8b94-98442eb12eef';

      if (rol === 'dependiente') {
        nombre = 'Sonia - Dependiente';
        id = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
      } else if (rol === 'cliente') {
        nombre = 'Doña Fabiola - Cliente';
        id = 'feed0000-cafe-babe-0000-000000000000';
      } else if (rol === 'kiosco') {
        nombre = 'Terminal Kiosco Público';
        id = 'kiosco-0000-0000-0000-000000000000';
      }

      set({
        user: { id, nombre, rol, tienda_id: DEFAULT_TIENDA_ID },
        isAuthenticated: true,
        activeRole: rol,
      });
    },
    logout: () => {
      set({ user: null, isAuthenticated: false, activeRole: null });
    },
  };
});
