import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';
import { db } from '../../db/dexie';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Receipt, 
  RotateCcw
} from 'lucide-react';

interface PagoProveedor {
  id: string;
  proveedor: string;
  monto: number;
  descripcion: string;
}

export const CorteCaja: React.FC = () => {
  const { user } = useAuthStore();
  const { isOnline, updatePendingCount } = useOfflineStore();

  // Paso actual (Ley de Miller: 1 -> 2 -> 3)
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  // 1. Datos del Turno (Ley de Hick: Valores sugeridos automáticamente)
  const horaActual = new Date().getHours();
  const [turno, setTurno] = useState<'manana' | 'tarde'>(horaActual < 14 ? 'manana' : 'tarde');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState<string>('');

  // 2. Conteo Físico de Efectivo
  const [billetes, setBilletes] = useState<number>(0);
  const [monedas, setMonedas] = useState<number>(0);
  const [claro, setClaro] = useState<number>(0);
  const [medicina, setMedicina] = useState<number>(0);
  const [libreria, setLibreria] = useState<number>(0);

  // 3. Gastos y Proveedores
  const [pagos, setPagos] = useState<PagoProveedor[]>([
    { id: 'p1', proveedor: 'Coca-Cola', monto: 120.00, descripcion: 'Recarga refrescos' }
  ]);
  const [nuevoProveedor, setNuevoProveedor] = useState<string>('');
  const [nuevoMonto, setNuevoMonto] = useState<string>('');
  const [nuevaDesc, setNuevaDesc] = useState<string>('');

  // Esperado del sistema (ventas registradas en mostrador)
  const esperadoSistema = 850.00;

  // Estados de interfaz
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bloqueado, setBloqueado] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // CÁLCULOS EN TIEMPO REAL
  const totalContadoGeneral = billetes + monedas;
  const totalRubrosApartes = claro + medicina + libreria;
  const totalContadoFisicoTotal = totalContadoGeneral + totalRubrosApartes;
  const totalPagosProveedores = pagos.reduce((sum, p) => sum + p.monto, 0);

  // Cuadre de caja: Efectivo Esperado en mano = Ventas sistema - Salidas proveedores
  const efectivoEsperadoGeneral = esperadoSistema - totalPagosProveedores;
  const diferencia = totalContadoGeneral - efectivoEsperadoGeneral;

  const handleAgregarPago = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(nuevoMonto);
    if (!nuevoProveedor.trim() || isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresa el nombre del proveedor y un monto válido.');
      return;
    }
    const nuevoPago: PagoProveedor = {
      id: crypto.randomUUID(),
      proveedor: nuevoProveedor.trim(),
      monto: montoNum,
      descripcion: nuevaDesc.trim() || 'Pago de mercadería de turno'
    };
    setPagos([...pagos, nuevoPago]);
    setNuevoProveedor('');
    setNuevoMonto('');
    setNuevaDesc('');
    showToast(`✅ Pago a ${nuevoPago.proveedor} registrado`);
  };

  const handleEliminarPago = (id: string) => {
    setPagos(pagos.filter(p => p.id !== id));
  };

  const handleGuardarCorte = async () => {
    if (totalContadoGeneral <= 0 && totalRubrosApartes <= 0) {
      alert('Por favor ingresa los montos contados en el Paso 2 antes de cerrar.');
      setPaso(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const corteId = crypto.randomUUID();
      const nuevoCorte = {
        id: corteId,
        caja_fisica_id: 'caja-principal-id',
        dependiente_id: user?.id || 'matilde-id',
        turno,
        fecha,
        hora_inicio: new Date().toISOString(),
        hora_fin: new Date().toISOString(),
        estado: 'cerrado' as const,
        notas,
        detalles: [
          { rubro_id: 'billetes-id', monto_contado: billetes },
          { rubro_id: 'monedas-id', monto_contado: monedas },
          { rubro_id: 'claro-id', monto_contado: claro },
          { rubro_id: 'medicina-id', monto_contado: medicina },
          { rubro_id: 'libreria-id', monto_contado: libreria }
        ],
        pagos: pagos.map(p => ({
          proveedor: p.proveedor,
          monto: p.monto,
          descripcion: p.descripcion
        })),
        timestamp: Date.now()
      };

      await db.cortes_pendientes.add(nuevoCorte);
      await updatePendingCount();

      setBloqueado(true);
      setIsSubmitting(false);
      showToast(
        isOnline 
          ? '✅ Corte cerrado con éxito (Sincronizado con Supabase).' 
          : '📝 Corte guardado localmente en Dexie (Modo Offline).'
      );
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      alert('Error al guardar el corte.');
    }
  };

  const handleNuevoCorte = () => {
    setBilletes(0);
    setMonedas(0);
    setClaro(0);
    setMedicina(0);
    setLibreria(0);
    setPagos([]);
    setNotas('');
    setBloqueado(false);
    setPaso(1);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in text-slate-100">
      
      {/* Toast Notificación */}
      {toast && (
        <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50 bg-slate-900 text-white dark:bg-purple-950 dark:text-purple-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 dark:border-purple-800 transition-all">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* ENCABEZADO CON RESUMEN RÁPIDO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-800">
            Caja Registradora POS
          </span>
          <h1 className="text-2xl font-black text-white mt-1">Corte de Caja por Turno</h1>
          <p className="text-xs text-slate-400">
            Atendido por: <strong className="text-purple-300">{user?.nombre || 'Matilde (Dependiente)'}</strong>
          </p>
        </div>

        {bloqueado ? (
          <button
            onClick={handleNuevoCorte}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <RotateCcw className="w-4 h-4" /> Nuevo Registro
          </button>
        ) : (
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Físico Contado:</span>
            <span className="text-2xl font-black text-emerald-400">Q {totalContadoFisicoTotal.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* INDICADOR DE PASOS (Ley de Miller: 3 Pasos Clave) */}
      {!bloqueado && (
        <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setPaso(1)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              paso === 1 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>1. Turno</span>
          </button>
          <button
            onClick={() => setPaso(2)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              paso === 2 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>2. Efectivo</span>
          </button>
          <button
            onClick={() => setPaso(3)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              paso === 3 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>3. Cierre</span>
          </button>
        </div>
      )}

      {/* ========================================================
          PASO 1: TURNO Y FECHA (Menos opciones = Decisiones rápidas)
          ======================================================== */}
      {!bloqueado && paso === 1 && (
        <div className="bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-6 animate-fade-in">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" /> Paso 1: Selección de Turno y Fecha
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Confirma el turno que vas a cerrar el día de hoy.
            </p>
          </div>

          <div className="space-y-4">
            {/* Selector de Turno en Botones Grandes (Ley de Fitts) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Turno de Trabajo
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTurno('manana')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    turno === 'manana'
                      ? 'bg-purple-950/60 border-purple-500 text-white shadow-md ring-1 ring-purple-500'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold block">☀️ Mañana (Corte 1)</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Apertura hasta las 2:00 PM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTurno('tarde')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    turno === 'tarde'
                      ? 'bg-purple-950/60 border-purple-500 text-white shadow-md ring-1 ring-purple-500'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold block">🌙 Tarde (Corte 2)</span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">2:00 PM hasta el cierre</span>
                </button>
              </div>
            </div>

            {/* Selector de Fecha Estilizado para Tema Oscuro */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-400" /> Fecha del Turno
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500 min-h-[50px]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Por defecto se asigna la fecha de hoy. Puedes cambiarla si estás cerrando un turno anterior.
              </p>
            </div>
          </div>

          {/* CTA Siguiente Paso (Grande y al alcance del pulgar) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setPaso(2)}
              className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 min-h-[52px] transition-all"
            >
              <span>Continuar a Conteo de Efectivo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          PASO 2: CONTEO FÍSICO (Billetes, Monedas y Cajas Aparte)
          ======================================================== */}
      {!bloqueado && paso === 2 && (
        <div className="bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-6 animate-fade-in">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" /> Paso 2: Conteo Físico en Caja
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingresa los billetes y monedas que tienes físicamente en la gaveta.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Subtotal:</span>
              <p className="text-lg font-black text-emerald-400">Q {totalContadoGeneral.toFixed(2)}</p>
            </div>
          </div>

          {/* BILLETES */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex justify-between">
              <span>Billetes Contados (Q)</span>
              <span className="text-purple-400 font-bold">Q {billetes.toFixed(2)}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={billetes || ''}
                onChange={(e) => setBilletes(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xl font-black outline-none focus:ring-2 focus:ring-purple-500 min-h-[52px]"
              />
              <div className="flex gap-1.5 shrink-0">
                {[50, 100, 200].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBilletes((prev) => prev + val)}
                    className="px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs active:scale-95 transition-all"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MONEDAS */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex justify-between">
              <span>Monedas Contadas (Q)</span>
              <span className="text-purple-400 font-bold">Q {monedas.toFixed(2)}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.05"
                placeholder="0.00"
                value={monedas || ''}
                onChange={(e) => setMonedas(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xl font-black outline-none focus:ring-2 focus:ring-purple-500 min-h-[52px]"
              />
              <div className="flex gap-1.5 shrink-0">
                {[5, 10, 20].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMonedas((prev) => prev + val)}
                    className="px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs active:scale-95 transition-all"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CAJAS APARTE (Claro, Medicina, Librería) */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
              Rubros de Caja Aparte (Opcionales)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">📱 Claro / Recargas</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={claro || ''}
                  onChange={(e) => setClaro(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">💊 Medicina</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={medicina || ''}
                  onChange={(e) => setMedicina(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">📚 Librería</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={libreria || ''}
                  onChange={(e) => setLibreria(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* BOTONES DE NAVEGACIÓN (Ley de Fitts + Von Restorff) */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2 min-h-[52px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>

            <button
              type="button"
              onClick={() => setPaso(3)}
              className="flex-1 py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 min-h-[52px] transition-all"
            >
              <span>Continuar a Gastos y Cierre</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          PASO 3: GASTOS A PROVEEDORES Y CUADRE FINAL (Cierre)
          ======================================================== */}
      {!bloqueado && paso === 3 && (
        <div className="bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-6 animate-fade-in">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-400" /> Paso 3: Pagos de Caja Chica y Cierre
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Registra los recibos pagados a repartidores para cuadrar el efectivo esperado.
            </p>
          </div>

          {/* Formulario Rápido de Pago */}
          <form onSubmit={handleAgregarPago} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block">
              + Anotar Salida a Proveedor
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Proveedor (ej. Bimbo, Pepsi)"
                value={nuevoProveedor}
                onChange={(e) => setNuevoProveedor(e.target.value)}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Monto (Q)"
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(e.target.value)}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Agregar Pago
              </button>
            </div>
          </form>

          {/* Lista de Pagos del Turno */}
          {pagos.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Salidas registradas en este turno ({pagos.length}):
              </span>
              <div className="space-y-2">
                {pagos.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{p.proveedor}</span>
                      <span className="text-slate-400">{p.descripcion}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-rose-400">- Q {p.monto.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleEliminarPago(p.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TARJETA DE CUADRE Y SEMÁFORO (Efecto Von Restorff) */}
          <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Resumen de Arqueo y Cuadre
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Contado Físico</span>
                <span className="font-bold text-white text-sm">Q {totalContadoGeneral.toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">(-) Proveedores</span>
                <span className="font-bold text-rose-400 text-sm">Q {totalPagosProveedores.toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Esperado Sistema</span>
                <span className="font-bold text-white text-sm">Q {efectivoEsperadoGeneral.toFixed(2)}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${
                diferencia === 0 
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
                  : Math.abs(diferencia) <= 10 
                  ? 'bg-amber-950/60 border-amber-700 text-amber-300' 
                  : 'bg-rose-950/60 border-rose-700 text-rose-300'
              }`}>
                <span className="block text-[10px] uppercase font-bold">Diferencia</span>
                <span className="font-black text-sm">
                  {diferencia >= 0 ? `+Q ${diferencia.toFixed(2)}` : `-Q ${Math.abs(diferencia).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Notas u Observaciones del Turno (Opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Q10 de diferencia por redondeo de monedas..."
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* CTA FINAL DE CIERRE DE CORTE */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaso(2)}
              className="py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2 min-h-[52px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGuardarCorte}
              className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 min-h-[52px] transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Guardando corte...' : 'Cerrar y Guardar Corte de Turno'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ESTADO FINAL: CORTE CERRADO Y BLOQUEADO */}
      {bloqueado && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-emerald-800/60 text-center space-y-4 animate-fade-in shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white">¡Corte de Turno Cerrado con Éxito!</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            El arqueo de efectivo ha sido guardado de forma segura en la base de datos local Dexie y está listo para sincronizarse con Supabase.
          </p>

          <div className="p-4 rounded-2xl bg-slate-800 max-w-sm mx-auto text-xs space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span>Turno:</span>
              <strong className="text-white capitalize">{turno}</strong>
            </div>
            <div className="flex justify-between">
              <span>Fecha:</span>
              <strong className="text-white">{fecha}</strong>
            </div>
            <div className="flex justify-between">
              <span>Efectivo contado:</span>
              <strong className="text-emerald-400">Q {totalContadoFisicoTotal.toFixed(2)}</strong>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleNuevoCorte}
              className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Registrar un Nuevo Corte de Turno
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
