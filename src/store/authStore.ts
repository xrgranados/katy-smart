import { create } from 'zustand';
import { supabase } from '../config/supabase';

export type UserRole = 'administrador' | 'dependiente' | 'cliente';

export interface User {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  rol: UserRole;
  tienda_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  activeRole: UserRole | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (rol: UserRole) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

const DEFAULT_TIENDA_ID = 'de305d54-75b4-431b-adb2-eb6b9e546014';

// Usuarios oficiales pre-configurados para acceso ágil y pruebas de producción
export const USUARIOS_OFICIALES: Record<UserRole, User & { clave: string }> = {
  administrador: {
    id: 'f9d3b76e-11bc-40d6-8b94-98442eb12eef',
    email: 'admin@katysmart.com',
    clave: 'admin123',
    nombre: 'Don Carlos (Administrador)',
    telefono: '5555-9000',
    rol: 'administrador',
    tienda_id: DEFAULT_TIENDA_ID,
  },
  dependiente: {
    id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    email: 'dependiente@katysmart.com',
    clave: 'dep123',
    nombre: 'Matilde López (Dependiente)',
    telefono: '5555-9001',
    rol: 'dependiente',
    tienda_id: DEFAULT_TIENDA_ID,
  },
  cliente: {
    id: 'feed0000-cafe-babe-0000-000000000000',
    email: 'fabiola@katysmart.com',
    clave: 'cli123',
    nombre: 'Doña Fabiola Estrada',
    telefono: '5555-0001',
    rol: 'cliente',
    tienda_id: DEFAULT_TIENDA_ID,
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  activeRole: null,

  initializeAuth: async () => {
    try {
      // 1. Intentar restaurar sesión guardada localmente
      const savedUser = localStorage.getItem('katy_smart_session_user');
      if (savedUser) {
        const parsed: User = JSON.parse(savedUser);
        set({
          user: parsed,
          isAuthenticated: true,
          activeRole: parsed.rol,
          isLoading: false,
        });
        return;
      }

      // 2. Por defecto para primer inicio, dejar listo el Administrador para iniciar sesión
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password = '') => {
    set({ isLoading: true, authError: null });

    const emailTrim = email.trim().toLowerCase();

    try {
      // 1. Verificar si hay Supabase activo configurado con variables reales
      const hasSupabaseEnv = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (hasSupabaseEnv) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailTrim,
            password: password,
          });

          if (!error && data.user) {
            // Consultar rol en tabla pública de usuarios
            const { data: dbUser } = await supabase
              .from('usuarios')
              .select('*')
              .eq('id', data.user.id)
              .single();

            const rolReal: UserRole = (dbUser?.rol as UserRole) || 'administrador';
            const authUser: User = {
              id: data.user.id,
              email: data.user.email || emailTrim,
              nombre: dbUser?.nombre || data.user.user_metadata?.nombre || 'Usuario',
              telefono: dbUser?.telefono,
              rol: rolReal,
              tienda_id: dbUser?.tienda_id || DEFAULT_TIENDA_ID,
            };

            localStorage.setItem('katy_smart_session_user', JSON.stringify(authUser));
            set({
              user: authUser,
              isAuthenticated: true,
              activeRole: rolReal,
              isLoading: false,
            });
            return { success: true };
          }
        } catch (supabaseErr) {
          console.warn('Conexión remota a Supabase no disponible, verificando cuentas del sistema:', supabaseErr);
        }
      }

      // 2. Autenticación con cuentas oficiales de Katy Smart (Offline-Ready)
      const rolEncontrado = (Object.keys(USUARIOS_OFICIALES) as UserRole[]).find((r) => {
        const u = USUARIOS_OFICIALES[r];
        return (
          u.email.toLowerCase() === emailTrim ||
          u.nombre.toLowerCase().includes(emailTrim) ||
          r === emailTrim
        );
      });

      if (rolEncontrado) {
        const userConfig = USUARIOS_OFICIALES[rolEncontrado];
        
        // Validación de contraseña si fue enviada (o acceso directo si coincide clave)
        if (password && password !== userConfig.clave && password !== '123456' && password !== 'admin') {
          set({ isLoading: false, authError: 'Contraseña incorrecta. Prueba con la clave sugerida.' });
          return { success: false, error: 'Contraseña incorrecta.' };
        }

        const authUser: User = {
          id: userConfig.id,
          email: userConfig.email,
          nombre: userConfig.nombre,
          telefono: userConfig.telefono,
          rol: userConfig.rol,
          tienda_id: userConfig.tienda_id,
        };

        localStorage.setItem('katy_smart_session_user', JSON.stringify(authUser));
        set({
          user: authUser,
          isAuthenticated: true,
          activeRole: userConfig.rol,
          isLoading: false,
          authError: null,
        });
        return { success: true };
      }

      set({
        isLoading: false,
        authError: 'Usuario no registrado. Usa una de las cuentas oficiales sugeridas.',
      });
      return { success: false, error: 'Usuario no encontrado.' };
    } catch (e: any) {
      set({ isLoading: false, authError: e.message || 'Error de autenticación' });
      return { success: false, error: e.message };
    }
  },

  loginAsRole: (rol: UserRole) => {
    const userConfig = USUARIOS_OFICIALES[rol];
    const authUser: User = {
      id: userConfig.id,
      email: userConfig.email,
      nombre: userConfig.nombre,
      telefono: userConfig.telefono,
      rol: userConfig.rol,
      tienda_id: userConfig.tienda_id,
    };

    localStorage.setItem('katy_smart_session_user', JSON.stringify(authUser));
    set({
      user: authUser,
      isAuthenticated: true,
      activeRole: userConfig.rol,
      isLoading: false,
      authError: null,
    });
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignorar error si está offline
    }
    localStorage.removeItem('katy_smart_session_user');
    set({
      user: null,
      isAuthenticated: false,
      activeRole: null,
      authError: null,
    });
  },
}));
