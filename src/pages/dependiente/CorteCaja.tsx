import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';
import { db } from '../../db/dexie';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Check
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

  // 1. Datos Generales del Turno
  const [turno, setTurno] = useState<'manana' | 'tarde'>('manana');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState<string>('');

  // 2. Rubros Generales (Caja Principal)
  const [billetes, setBilletes] = useState<number>(0);
  const [monedas, setMonedas] = useState<number>(0);

  // 3. Rubros Caja Aparte (Independientes)
  const [claro, setClaro] = useState<number>(0);
  const [medicina, setMedicina] = useState<number>(0);
  const [libreria, setLibreria] = useState<number>(0);

  // 4. Esperado de Sistema (Para calcular diferencia)
  const [esperadoSistema, setEsperadoSistema] = useState<number>(1000); // Mock de lo que el sistema espera en efectivo

  // 5. Lista de pagos a proveedores de este turno
  const [pagos, setPagos] = useState<PagoProveedor[]>([]);
  const [nuevoProveedor, setNuevoProveedor] = useState<string>('');
  const [nuevoMonto, setNuevoMonto] = useState<string>('');
  const [nuevaDesc, setNuevaDesc] = useState<string>('');

  // UI States
  const [toast, setToast] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Agregar un Pago a Proveedor
  const handleAgregarPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProveedor || !nuevoMonto || isNaN(parseFloat(nuevoMonto))) {
      alert('Por favor introduce un proveedor y monto válido.');
      return;
    }
    const nuevoPago: PagoProveedor = {
      id: crypto.randomUUID(),
      proveedor: nuevoProveedor,
      monto: parseFloat(nuevoMonto),
      descripcion: nuevaDesc
    };
    setPagos([...pagos, nuevoPago]);
    setNuevoProveedor('');
    setNuevoMonto('');
    setNuevaDesc('');
  };

  // Eliminar un Pago
  const handleEliminarPago = (id: string) => {
    setPagos(pagos.filter(p => p.id !== id));
  };

  // CALCULOS EN TIEMPO REAL
  const totalContadoGeneral = billetes + monedas;
  const totalPagosProveedores = pagos.reduce((sum, p) => sum + p.monto, 0);
  
  // efectivo_esperado = esperadoSistema - pagos_proveedores
  const efectivoEsperadoGeneral = esperadoSistema - totalPagosProveedores;
  const diferenciaGeneral = totalContadoGeneral - efectivoEsperadoGeneral;

  // Semáforo de diferencia
  const getSemaforoColor = (diff: number) => {
    if (diff === 0) return 'emerald';
    if (Math.abs(diff) <= 10) return 'amber';
    return 'rose';
  };

  const semaforo = getSemaforoColor(diferenciaGeneral);

  // GUARDAR CORTE (Offline-First)
  const handleGuardarCorte = async () => {
    if (totalContadoGeneral <= 0 && claro <= 0 && medicina <= 0 && libreria <= 0) {
      alert('Por favor introduce montos contados en los rubros antes de cerrar el corte.');
      return;
    }

    try {
      const corteId = crypto.randomUUID();
      const nuevoCorte = {
        id: corteId,
        caja_fisica_id: 'caja-principal-id',
        dependiente_id: user?.id || 'sonia-id',
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

      // Guardar en Dexie (cola local offline)
      await db.cortes_pendientes.add(nuevoCorte);
      await updatePendingCount();

      setBloqueado(true);
      showToast(
        isOnline 
          ? '✅ Corte cerrado con éxito (Sincronizado con Supabase).' 
          : '📝 Corte guardado localmente en el dispositivo (Modo Offline).'
      );
    } catch (e) {
      console.error(e);
      alert('Error al guardar el corte.');
    }
  };

  // Reiniciar formulario para nuevo corte
  const handleNuevoFormulario = () => {
    setBilletes(0);
    setMonedas(0);
    setClaro(0);
    setMedicina(0);
    setLibreria(0);
    setPagos([]);
    setNotas('');
    setBloqueado(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 bg-slate-900 text-white dark:bg-purple-900 dark:text-purple-100 px-4 py-3 rounded-xl shadow-lg border border-slate-700 dark:border-purple-800 transition-all">
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* CABECERA */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Registrar Corte de Caja por Turno</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cierra la caja de tu turno, ingresa lo contado en cada sección y los egresos de proveedores.</p>
        </div>
        {bloqueado && (
          <button
            onClick={handleNuevoFormulario}
            className="px-4 py-2 bg-purple-600 text-white font-semibold text-xs rounded-xl hover:bg-purple-700 transition shadow-sm"
          >
            Nuevo Registro de Caja
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUMNA 1 & 2: INGRESO DE DATOS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* GENERALES */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">1. Detalles de Turno</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Seleccionar Turno</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => setTurno('manana')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      turno === 'manana'
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Mañana (Corte 1)
                  </button>
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => setTurno('tarde')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      turno === 'tarde'
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Tarde (Corte 2)
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Fecha de Operación</label>
                <input
                  type="date"
                  disabled={bloqueado}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* RUBROS CAJA GENERAL (BILLETES Y MONEDAS) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              2. Caja General (Efectivo Físico)
            </h3>
            <p className="text-xs text-slate-500">Cuenta e ingresa los montos totales en billetes y monedas que posees físicamente en caja general.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Billetes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Billetes Contados (Q)</span>
                  <span className="text-purple-600 font-bold">Q{billetes.toFixed(2)}</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={bloqueado}
                    min="0"
                    placeholder="0"
                    value={billetes || ''}
                    onChange={(e) => setBilletes(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="flex-1 py-3 px-4 rounded-xl text-lg font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-white"
                  />
                  {/* Botones de incremento rápido para mostrador */}
                  <div className="flex space-x-1 shrink-0">
                    {[50, 100].map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={bloqueado}
                        onClick={() => setBilletes(b => b + v)}
                        className="py-3 px-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 active:scale-95 transition-all"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Monedas */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Monedas Contadas (Q)</span>
                  <span className="text-purple-600 font-bold">Q{monedas.toFixed(2)}</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    disabled={bloqueado}
                    min="0"
                    placeholder="0"
                    value={monedas || ''}
                    onChange={(e) => setMonedas(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="flex-1 py-3 px-4 rounded-xl text-lg font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-white"
                  />
                  <div className="flex space-x-1 shrink-0">
                    {[5, 10].map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={bloqueado}
                        onClick={() => setMonedas(m => m + v)}
                        className="py-3 px-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 active:scale-95 transition-all"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* CAJAS APARTE (CLARO, MEDICINA, LIBRERIA) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              3. Cajas Aparte (Acumulativo Independiente)
            </h3>
            <p className="text-xs text-slate-500">Efectivo contado para rubros específicos. Estas cajas no participan en la deducción de proveedores directos.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Claro */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Caja Claro (Recargas)</label>
                <input
                  type="number"
                  disabled={bloqueado}
                  min="0"
                  placeholder="Q 0.00"
                  value={claro || ''}
                  onChange={(e) => setClaro(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              {/* Medicina */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Caja Medicina</label>
                <input
                  type="number"
                  disabled={bloqueado}
                  min="0"
                  placeholder="Q 0.00"
                  value={medicina || ''}
                  onChange={(e) => setMedicina(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              {/* Librería */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Caja Librería</label>
                <input
                  type="number"
                  disabled={bloqueado}
                  min="0"
                  placeholder="Q 0.00"
                  value={libreria || ''}
                  onChange={(e) => setLibreria(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* EGRESOS: PAGOS A PROVEEDORES */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              4. Egresos de Caja (Pagos a Proveedores)
            </h3>
            
            {/* Formulario rápido para añadir egreso */}
            {!bloqueado && (
              <form onSubmit={handleAgregarPago} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Nombre del Proveedor</label>
                  <input
                    type="text"
                    placeholder="Ej: Pepsi / Bimbo"
                    value={nuevoProveedor}
                    onChange={(e) => setNuevoProveedor(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Monto Pagado (Q)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={nuevoMonto}
                    onChange={(e) => setNuevoMonto(e.target.value)}
                    className="w-full py-1.5 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Concepto/Detalle (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Factura #1234"
                      value={nuevaDesc}
                      onChange={(e) => setNuevaDesc(e.target.value)}
                      className="w-full py-1.5 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 transition flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Listado de egresos añadidos */}
            <div className="space-y-2">
              {pagos.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">No se han registrado pagos a proveedores en este turno.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {pagos.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.proveedor}</span>
                        {p.descripcion && <span className="text-[10px] text-slate-500 block">{p.descripcion}</span>}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-extrabold text-slate-950 dark:text-white">Q{p.monto.toFixed(2)}</span>
                        {!bloqueado && (
                          <button
                            type="button"
                            onClick={() => handleEliminarPago(p.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Total egresos */}
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between font-bold text-xs">
                    <span>Total Pagado a Proveedores</span>
                    <span className="text-rose-600 dark:text-rose-400">Q{totalPagosProveedores.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* NOTAS Y CONFIRMACIÓN */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">5. Notas de Auditoría</h3>
            <textarea
              placeholder="Escribe alguna novedad o justificación de descuadre si existiera..."
              disabled={bloqueado}
              value={notesText(notas)}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-150"
            />
            
            {!bloqueado && (
              <button
                type="button"
                onClick={handleGuardarCorte}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>CERRAR Y REGISTRAR CORTE DE CAJA</span>
              </button>
            )}
          </div>

        </div>

        {/* COLUMNA 3: RESUMEN Y SEMÁFORO DE AUDITORÍA */}
        <div className="space-y-6">
          
          {/* SEMAFORO CARD */}
          <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 shadow-sm border-${semaforo}-500/80 dark:border-${semaforo}-500/40 space-y-4 relative overflow-hidden`}>
            {/* Decoral light background */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 bg-${semaforo}-500`} />
            
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Auditoría en Tiempo Real
            </h3>

            {/* Detalle de Cálculos */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Efectivo Contado (General)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Q{totalContadoGeneral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Efectivo Esperado (Sistema)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Q{esperadoSistema.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>(-) Pagos a Proveedores</span>
                <span className="font-semibold text-rose-500">-Q{totalPagosProveedores.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 flex justify-between font-bold text-sm">
                <span>Total Esperado en Caja</span>
                <span className="text-slate-900 dark:text-white">Q{efectivoEsperadoGeneral.toFixed(2)}</span>
              </div>
            </div>

            {/* SEMAFORO STATUS DISPLAY */}
            <div className={`p-4 rounded-xl text-center bg-${semaforo}-50 dark:bg-${semaforo}-950/20 text-${semaforo}-700 dark:text-${semaforo}-400 border border-${semaforo}-200 dark:border-${semaforo}-800/40`}>
              <span className="text-[10px] uppercase font-extrabold tracking-wider block mb-1">Diferencia de Caja</span>
              <span className="text-2xl font-black block tracking-tight">
                {diferenciaGeneral >= 0 ? '+' : ''}Q{diferenciaGeneral.toFixed(2)}
              </span>

              {/* Text label */}
              <div className="flex items-center justify-center space-x-1.5 mt-2 font-bold text-xs">
                {diferenciaGeneral === 0 ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Caja Cuadrada Perfecta!</span>
                  </>
                ) : Math.abs(diferenciaGeneral) <= 10 ? (
                  <>
                    <AlertCircle className="w-4 h-4 animate-bounce" />
                    <span>Descuadre Leve (Aceptable)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span>Descuadre Grave (Revisar)</span>
                  </>
                )}
              </div>
            </div>

            {/* Simulación del esperado por sistema (para pruebas del MVP) */}
            {!bloqueado && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                  MOCK: Esperado de Sistema (Ajustar para probar)
                </label>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="50"
                  value={esperadoSistema}
                  onChange={(e) => setEsperadoSistema(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                  <span>Q0</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Q{esperadoSistema}</span>
                  <span>Q3,000</span>
                </div>
              </div>
            )}
          </div>

          {/* DETALLES RESUMIDOS CAJAS APARTE */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cajas Aparte en Turno</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Total Claro (Recargas)</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">Q{claro.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Total Medicina</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">Q{medicina.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600 dark:text-slate-400">Total Librería</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">Q{libreria.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

// Helper para evitar error de tipado al usar inputs controlados
function notesText(val: string): string {
  return val || '';
}
