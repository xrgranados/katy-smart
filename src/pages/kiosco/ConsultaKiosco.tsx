import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../db/dexie';
import { supabase } from '../../config/supabase';
import { 
  Lock, 
  Delete, 
  Check, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  LogOut, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface Movement {
  id: string;
  monto: number;
  fecha_hora: string;
  descripcion_items: string;
  saldo_resultante?: number;
  registrado_por_nombre: string;
}

interface KioscoResponse {
  success: boolean;
  error?: string;
  cliente_id?: string;
  cliente_nombre?: string;
  saldo_actual?: number;
  movimientos?: Movement[];
}

export function ConsultaKiosco() {
  const { loginAsMock } = useAuthStore();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cuentaData, setCuentaData] = useState<KioscoResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Inactivity timer effect
  useEffect(() => {
    if (cuentaData) {
      setTimeLeft(15);
      
      // Clear existing timer if any
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleCerrarConsulta();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cuentaData]);

  const handleCerrarConsulta = () => {
    setCuentaData(null);
    setPin('');
    setErrorMsg(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleExtenderTiempo = () => {
    setTimeLeft(15);
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1200Hz beep
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // low volume
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); // 80ms beep
    } catch (e) {
      // AudioContext might be blocked by browser autoplay policy before user interaction
    }
  };

  const handleKeyPress = (num: string) => {
    playBeep();
    setErrorMsg(null);
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleBorrar = () => {
    playBeep();
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLimpiarTodo = () => {
    playBeep();
    setPin('');
    setErrorMsg(null);
  };

  const handleIngresar = async () => {
    playBeep();
    if (pin.length !== 4) {
      setErrorMsg('El PIN debe ser de 4 dígitos.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Try to invoke real Supabase RPC if credentials look configured
      const isRealSupabase = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');
      if (isRealSupabase) {
        const { data, error } = await supabase.rpc('consultar_saldo_kiosco', { p_pin: pin });
        if (!error && data && data.success) {
          setCuentaData(data as KioscoResponse);
          setIsLoading(false);
          return;
        } else if (error) {
          console.warn("Supabase RPC error, falling back to IndexedDB/Mock data:", error);
        }
      }

      // 2. Fallback to local Dexie/Mock data
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate networking feel
      const result = await consultarSaldoLocal(pin);
      if (result.success) {
        setCuentaData(result);
      } else {
        setErrorMsg(result.error || 'PIN inválido o cuenta inactiva.');
        setPin('');
      }
    } catch (e) {
      console.error('Error al consultar saldo kiosco:', e);
      setErrorMsg('Error de conexión. Mostrando datos offline...');
      
      // Attempt local fallback anyway
      const result = await consultarSaldoLocal(pin);
      if (result.success) {
        setCuentaData(result);
      } else {
        setErrorMsg('Error al conectar con la base de datos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Local query handler for offline and demo mode
  const consultarSaldoLocal = async (pinInput: string): Promise<KioscoResponse> => {
    // Definimos las cuentas de demostración
    const mockCuentas = [
      {
        pin: '1234',
        cliente_id: 'feed0000-cafe-babe-0000-000000000000',
        cliente_nombre: 'Familia Estrada (Doña Fabiola)',
        saldo_base: 450.50,
        movimientos_base: [
          { id: 'm1', monto: 15.00, fecha_hora: '2026-07-28T18:30:00Z', descripcion_items: 'Pan, huevos y leche', registrado_por_nombre: 'Anderson (Hijo)' },
          { id: 'm2', monto: 45.00, fecha_hora: '2026-07-27T10:15:00Z', descripcion_items: 'Aceite, Arroz, Frijoles', registrado_por_nombre: 'Doña Fabiola' },
          { id: 'm3', monto: -50.00, fecha_hora: '2026-07-26T12:00:00Z', descripcion_items: 'Abono en efectivo', registrado_por_nombre: 'Doña Fabiola' },
          { id: 'm4', monto: 12.00, fecha_hora: '2026-07-25T14:20:00Z', descripcion_items: 'Bebidas gaseosas', registrado_por_nombre: 'Anderson (Hijo)' },
          { id: 'm5', monto: 50.00, fecha_hora: '2026-07-24T19:10:00Z', descripcion_items: 'Carnes y verduras', registrado_por_nombre: 'Doña Fabiola' },
        ]
      },
      {
        pin: '5678',
        cliente_id: 'client-2',
        cliente_nombre: 'Don Luis (Carpintería)',
        saldo_base: 125.00,
        movimientos_base: [
          { id: 'l1', monto: 25.00, fecha_hora: '2026-07-29T09:00:00Z', descripcion_items: 'Clavos, pegamento y lija', registrado_por_nombre: 'Don Luis' },
          { id: 'l2', monto: -100.00, fecha_hora: '2026-07-26T15:45:00Z', descripcion_items: 'Abono a cuenta', registrado_por_nombre: 'Don Luis' },
        ]
      },
      {
        pin: '4321',
        cliente_id: 'client-3',
        cliente_nombre: 'Familia Gómez',
        saldo_base: 320.00,
        movimientos_base: [
          { id: 'g1', monto: 50.00, fecha_hora: '2026-07-28T11:15:00Z', descripcion_items: 'Azúcar, café y galletas', registrado_por_nombre: 'María Gómez' },
          { id: 'g2', monto: 120.00, fecha_hora: '2026-07-25T17:30:00Z', descripcion_items: 'Despensa Semanal básica', registrado_por_nombre: 'Carlos Gómez' },
          { id: 'g3', monto: -150.00, fecha_hora: '2026-07-20T12:00:00Z', descripcion_items: 'Abono de quincena', registrado_por_nombre: 'Carlos Gómez' },
        ]
      }
    ];

    const cuenta = mockCuentas.find(c => c.pin === pinInput);
    if (!cuenta) {
      return { success: false, error: 'PIN inválido o cuenta inactiva.' };
    }

    // Cargar movimientos offline locales de Dexie para este cliente para que la demo sea interactiva
    const localMovs = await db.movimientos_pendientes.where('cliente_id').equals(cuenta.cliente_id).toArray();
    
    // Transformar los movimientos de Dexie al formato de la interfaz
    const formatedLocalMovs: Movement[] = localMovs.map(m => ({
      id: m.id || crypto.randomUUID(),
      monto: m.tipo === 'cargo' ? m.monto : -m.monto,
      fecha_hora: m.fecha_hora,
      descripcion_items: m.descripcion_items,
      registrado_por_nombre: m.registrado_por || 'Caja'
    }));

    // Combinar los predefinidos con los guardados localmente
    const combinedMovs = [...formatedLocalMovs, ...cuenta.movimientos_base];
    
    // Ordenar cronológicamente (más nuevo primero)
    combinedMovs.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());

    // Calcular saldo dinámico (cargos suman, abonos restan)
    let saldo_actual = cuenta.saldo_base;
    localMovs.forEach(m => {
      if (m.tipo === 'cargo') {
        saldo_actual += m.monto;
      } else if (m.tipo === 'abono') {
        saldo_actual -= m.monto;
      }
    });

    return {
      success: true,
      cliente_id: cuenta.cliente_id,
      cliente_nombre: cuenta.cliente_nombre,
      saldo_actual,
      movimientos: combinedMovs.slice(0, 5) // últimos 5 movimientos
    };
  };

  const formatCurrency = (monto?: number) => {
    if (monto === undefined) return 'Q0.00';
    return `Q${monto.toFixed(2)}`;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans overflow-hidden">
      
      {/* HEADER DE LA DEMO (DISCRETO Y MUY ÚTIL) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 z-50">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-slate-200">Katy Smart • TERMINAL KIOSCO</span>
        </div>
        
        {/* Ayuda con pines de demo */}
        <div className="hidden sm:flex items-center space-x-3 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
          <span>PINs Demo: <strong className="text-purple-300">1234</strong> (Fabiola) o <strong className="text-purple-300">5678</strong> (Luis)</span>
        </div>

        <button
          onClick={() => loginAsMock('admin')}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow transition-all active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir del Kiosco</span>
        </button>
      </div>

      {/* RENDER PRINCIPAL DE LA INTERFAZ */}
      <div className="flex-1 flex items-center justify-center p-4">
        
        {!cuentaData ? (
          /* PANTALLA 1: INGRESO DE PIN (ESTILO ATM/CAJERO MODERNO) */
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl p-6 sm:p-8 flex flex-col items-center space-y-6 relative">
            
            {/* Adorno estético ATM */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1.5 bg-purple-600 rounded-b-xl shadow-md shadow-purple-900/50"></div>
            
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-purple-950 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 mb-2 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100 uppercase">Consulta tu Saldo</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Ingresa el PIN táctil de tu cuenta para consultar tu saldo y movimientos recientes.
              </p>
            </div>

            {/* Visualizador de PIN */}
            <div className="w-full flex flex-col items-center space-y-2">
              <div className="h-16 flex items-center justify-center space-x-4 bg-slate-950 border border-slate-800/80 rounded-2xl px-6 w-full max-w-xs shadow-inner">
                {[...Array(4)].map((_, i) => {
                  const digit = pin[i];
                  return (
                    <div 
                      key={i} 
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                        digit 
                          ? 'bg-purple-500 border-purple-400 scale-110 shadow-lg shadow-purple-500/50' 
                          : 'bg-transparent border-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
              
              {/* Mensajes de error/estado */}
              <div className="h-5 text-center">
                {errorMsg && (
                  <div className="text-red-400 text-xs font-bold flex items-center justify-center space-x-1 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {isLoading && (
                  <span className="text-purple-400 text-xs font-bold animate-pulse">Buscando cuenta...</span>
                )}
              </div>
            </div>

            {/* Teclado Numérico Táctil Integrado */}
            <div className="w-full max-w-xs grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isLoading || pin.length >= 4}
                  onClick={() => handleKeyPress(num)}
                  className="w-full h-16 sm:h-20 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-2xl font-black rounded-2xl flex items-center justify-center transition-all duration-100 active:scale-90 active:bg-purple-900 active:border-purple-500 text-slate-100 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {num}
                </button>
              ))}
              
              {/* Botón Borrar */}
              <button
                type="button"
                onClick={handleBorrar}
                onDoubleClick={handleLimpiarTodo}
                disabled={isLoading || pin.length === 0}
                className="w-full h-16 sm:h-20 bg-amber-600/20 hover:bg-amber-600/35 border border-amber-600/30 text-amber-400 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 active:scale-90 text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                <Delete className="w-6 h-6 mb-1" />
                <span>Borrar</span>
              </button>

              {/* Botón 0 */}
              <button
                type="button"
                disabled={isLoading || pin.length >= 4}
                onClick={() => handleKeyPress('0')}
                className="w-full h-16 sm:h-20 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-2xl font-black rounded-2xl flex items-center justify-center transition-all duration-100 active:scale-90 active:bg-purple-900 text-slate-100 shadow-md cursor-pointer disabled:opacity-50"
              >
                0
              </button>

              {/* Botón Ingresar */}
              <button
                type="button"
                onClick={handleIngresar}
                disabled={isLoading || pin.length !== 4}
                className="w-full h-16 sm:h-20 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-100 rounded-2xl flex flex-col items-center justify-center transition-all duration-100 active:scale-95 text-sm font-black shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent"
              >
                <Check className="w-6 h-6 mb-1" />
                <span>Ingresar</span>
              </button>
            </div>

            {/* Ranura decorativa estilo cajero */}
            <div className="w-full flex justify-between items-center px-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500">
              <span>TERMINAL ID: KS-K01</span>
              <span>COMPACTO & SEGURO</span>
            </div>

          </div>
        ) : (
          /* PANTALLA 2: PANTALLA PERSONALIZADA (DATOS DE LA CUENTA Y HISTORIAL) */
          <div 
            onClick={handleExtenderTiempo}
            className="w-full max-w-2xl bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col relative"
          >
            
            {/* Barra superior de temporizador y cierre de inactividad */}
            <div className="bg-slate-950 border-b border-slate-800/60 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-500 font-semibold text-xs">
                <Clock className="w-4 h-4 animate-spin-slow" />
                <span>Inactividad: {timeLeft}s</span>
              </div>
              
              <button
                onClick={handleCerrarConsulta}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center space-x-1 transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Consulta</span>
              </button>
            </div>

            {/* Barra de progreso de cuenta regresiva */}
            <div className="w-full h-1 bg-slate-950 relative">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${
                  timeLeft > 7 ? 'bg-emerald-500' : timeLeft > 3 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                }`}
                style={{ width: `${(timeLeft / 15) * 100}%` }}
              />
            </div>

            {/* Contenido principal */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Nombre de la cuenta y Saldo grande */}
              <div className="text-center bg-slate-950/50 p-6 rounded-2xl border border-slate-800/80 shadow-inner space-y-2">
                <p className="text-xs uppercase font-black tracking-widest text-purple-400">Estado de Cuenta</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-100 truncate">
                  {cuentaData.cliente_nombre}
                </h3>
                
                <div className="pt-3">
                  <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 tracking-wider">Saldo Pendiente Acumulado</p>
                  <p className={`text-5xl sm:text-6xl font-black tracking-tight mt-1 transition-all ${
                    (cuentaData.saldo_actual || 0) > 0 
                      ? 'text-rose-500 shadow-rose-950/20' 
                      : 'text-emerald-500 shadow-emerald-950/20'
                  }`}>
                    {formatCurrency(cuentaData.saldo_actual)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 max-w-sm mx-auto">
                    {(cuentaData.saldo_actual || 0) > 0 
                      ? '⚠️ Este es tu saldo actual fiado. Favor abonar lo antes posible en caja.' 
                      : '✅ No tienes saldos pendientes. ¡Gracias por mantener tu cuenta al día!'}
                  </p>
                </div>
              </div>

              {/* Últimos 5 movimientos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wider uppercase text-slate-400">Últimos 5 Movimientos</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Actualizado</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cuentaData.movimientos && cuentaData.movimientos.length > 0 ? (
                    cuentaData.movimientos.map((mov) => {
                      const isCargo = mov.monto > 0;
                      return (
                        <div 
                          key={mov.id} 
                          className="bg-slate-950/30 hover:bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between transition-colors text-xs"
                        >
                          <div className="space-y-1 overflow-hidden pr-2">
                            <div className="flex items-center space-x-1.5">
                              {isCargo ? (
                                <span className="p-0.5 rounded bg-rose-500/10 text-rose-400">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="p-0.5 rounded bg-emerald-500/10 text-emerald-400">
                                  <TrendingDown className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <span className="font-bold text-slate-200 truncate">{mov.descripcion_items}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                              <span>{formatDate(mov.fecha_hora)}</span>
                              <span>•</span>
                              <span className="truncate">Por: <strong className="text-slate-400">{mov.registrado_por_nombre}</strong></span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className={`font-extrabold text-sm ${isCargo ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isCargo ? '+' : ''}{formatCurrency(mov.monto)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/20 rounded-xl border border-slate-800">
                      No hay transacciones registradas en tu cuenta.
                    </div>
                  )}
                </div>
              </div>

              {/* Tips de seguridad */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 flex items-start space-x-2 text-[10px] text-slate-400">
                <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="text-slate-300">Tip de Seguridad:</strong>
                  <p>Por seguridad, tu sesión se cerrará automáticamente. Toca cualquier parte de la pantalla para mantenerla abierta o pulsa "Cerrar Consulta" para salir inmediatamente.</p>
                </div>
              </div>

            </div>
            
            {/* Pie decorativo */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-t border-slate-800/60 text-[10px] text-slate-500">
              <span>Katy Smart Kiosk • Tablet V1</span>
              <button 
                onClick={handleCerrarConsulta}
                className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer"
              >
                Volver al Teclado
              </button>
            </div>

          </div>
        )}

      </div>

      {/* FOOTER DEL KIOSCO */}
      <div className="bg-slate-900 border-t border-slate-800/80 px-4 py-3 text-center text-[10px] text-slate-500">
        Este terminal no entrega efectivo. Únicamente para consultas autorizadas. © {new Date().getFullYear()} Katy Smart. Todos los derechos reservados.
      </div>

    </div>
  );
}
