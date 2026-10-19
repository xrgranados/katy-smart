import React, { useState } from 'react';
import { useAuthStore, type UserRole, USUARIOS_OFICIALES } from '../../store/authStore';
import { useNavigationStore } from '../../store/navigationStore';
import { 
  Store, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Loader2, 
  UserCheck, 
  Sparkles 
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, loginAsRole, isLoading, authError } = useAuthStore();
  const { setActiveTab, getDefaultTabForRole } = useNavigationStore();

  const [email, setEmail] = useState('admin@katysmart.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res.success) {
      // Identificar rol del usuario logueado
      const emailTrim = email.trim().toLowerCase();
      const rol: UserRole = emailTrim.includes('dep') 
        ? 'dependiente' 
        : emailTrim.includes('cli') || emailTrim.includes('fabiola') 
        ? 'cliente' 
        : 'administrador';
      setActiveTab(getDefaultTabForRole(rol));
    }
  };

  const handleQuickLogin = (rol: UserRole) => {
    loginAsRole(rol);
    setActiveTab(getDefaultTabForRole(rol));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6 animate-fade-in">
        {/* LOGO Y ENCABEZADO (Familiar y Seguro) */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-600/30 mb-2">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Katy Smart</h1>
          <p className="text-sm text-slate-400">
            Sistema POS digital y libreta de confianza para tiendas de barrio
          </p>
        </div>

        {/* TARJETA DE LOGIN PRINCIPAL */}
        <div className="bg-slate-800/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl space-y-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" /> Iniciar Sesión
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa tus credenciales o selecciona tu perfil oficial.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Correo o Usuario */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Correo Electrónico o Usuario
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. admin@katysmart.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* CTA PRINCIPAL DESTACADO (Ley de Fitts + Von Restorff) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ACCESO RÁPIDO PARA REVISIÓN DE PRODUCCIÓN (3 PERFILES) */}
          <div className="pt-4 border-t border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-purple-400">
                <Sparkles className="w-3.5 h-3.5" /> Acceso directo por perfil:
              </span>
              <span className="text-[11px] text-slate-500">1 clic</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('administrador')}
                className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700/80 text-left flex items-center justify-between group transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center font-bold text-xs">
                    👑
                  </span>
                  <div>
                    <span className="font-bold text-white group-hover:text-purple-300 transition-colors block">
                      {USUARIOS_OFICIALES.administrador.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400">Rol: Administrador (Dueño)</span>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('dependiente')}
                className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700/80 text-left flex items-center justify-between group transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    🏪
                  </span>
                  <div>
                    <span className="font-bold text-white group-hover:text-indigo-300 transition-colors block">
                      {USUARIOS_OFICIALES.dependiente.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400">Rol: Dependiente (Corte de Turno)</span>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('cliente')}
                className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700/80 text-left flex items-center justify-between group transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    🙋‍♀️
                  </span>
                  <div>
                    <span className="font-bold text-white group-hover:text-emerald-300 transition-colors block">
                      {USUARIOS_OFICIALES.cliente.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400">Rol: Cliente (Vista de Deuda / Fiado)</span>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Pie de página con versión */}
        <p className="text-center text-xs text-slate-500">
          Katy Smart PWA v1.0 • Seguro y preparado para conexión con Supabase
        </p>
      </div>
    </div>
  );
};
