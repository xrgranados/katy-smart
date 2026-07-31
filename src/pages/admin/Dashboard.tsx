import React, { useState, useEffect } from 'react';
import { db, type CortePendiente } from '../../db/dexie';
import { 
  TrendingUp, 
  ShoppingCart, 
  BookOpen, 
  AlertTriangle, 
  Check, 
  Calendar, 
  User, 
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Printer,
  SlidersHorizontal
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [cortes, setCortes] = useState<CortePendiente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // 1. FILTROS AVANZADOS
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dependiente, setDependiente] = useState<string>('all');
  const [turno, setTurno] = useState<string>('all');
  const [mostrarFiltros, setMostrarFiltros] = useState<boolean>(false);

  useEffect(() => {
    cargarCortes();
  }, [fechaInicio, fechaFin, dependiente, turno]);

  const cargarCortes = async () => {
    setLoading(true);
    try {
      let list = await db.cortes_pendientes.toArray();

      // Sembrar datos de demostración ricos en estética si la base de datos está vacía para la fecha actual
      if (list.length === 0) {
        const hoy = new Date().toISOString().split('T')[0];
        const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const demoCortes: CortePendiente[] = [
          {
            id: 'demo-1',
            caja_fisica_id: 'caja-principal-id',
            dependiente_id: 'sonia-id',
            turno: 'manana',
            fecha: hoy,
            hora_inicio: new Date().toISOString(),
            estado: 'cerrado',
            notas: 'Pepsi entregó temprano, todo cuadrado.',
            detalles: [
              { rubro_id: 'billetes-id', monto_contado: 850 },
              { rubro_id: 'monedas-id', monto_contado: 150 },
              { rubro_id: 'claro-id', monto_contado: 250 },
              { rubro_id: 'medicina-id', monto_contado: 120 },
              { rubro_id: 'libreria-id', monto_contado: 45 }
            ],
            pagos: [
              { proveedor: 'Pepsi-Cola', monto: 180, descripcion: 'Pedido gaseosas' }
            ],
            timestamp: Date.now() - 3600000 * 5
          },
          {
            id: 'demo-2',
            caja_fisica_id: 'caja-principal-id',
            dependiente_id: 'sonia-id',
            turno: 'tarde',
            fecha: hoy,
            hora_inicio: new Date().toISOString(),
            estado: 'cerrado',
            notas: 'Turno de tarde, descuadre de Q5.00 por cambio de monedas.',
            detalles: [
              { rubro_id: 'billetes-id', monto_contado: 1250 },
              { rubro_id: 'monedas-id', monto_contado: 195 },
              { rubro_id: 'claro-id', monto_contado: 380 },
              { rubro_id: 'medicina-id', monto_contado: 140 },
              { rubro_id: 'libreria-id', monto_contado: 50 }
            ],
            pagos: [
              { proveedor: 'La Pradera', monto: 200, descripcion: 'Leche, quesos y crema' }
            ],
            timestamp: Date.now() - 3600000
          },
          {
            id: 'demo-3',
            caja_fisica_id: 'caja-principal-id',
            dependiente_id: 'admin-id',
            turno: 'manana',
            fecha: ayer,
            hora_inicio: new Date().toISOString(),
            estado: 'cerrado',
            notas: 'Ayer por la mañana todo en orden.',
            detalles: [
              { rubro_id: 'billetes-id', monto_contado: 900 },
              { rubro_id: 'monedas-id', monto_contado: 100 },
              { rubro_id: 'claro-id', monto_contado: 200 },
              { rubro_id: 'medicina-id', monto_contado: 110 },
              { rubro_id: 'libreria-id', monto_contado: 35 }
            ],
            pagos: [],
            timestamp: Date.now() - 86400000 - 3600000 * 4
          }
        ];

        // Añadir a Dexie para permanencia local de la demo
        for (const c of demoCortes) {
          await db.cortes_pendientes.add(c);
        }
        list = await db.cortes_pendientes.toArray();
      }

      // Aplicar filtros locales de rango de fecha
      let filtered = list.filter(c => c.fecha >= fechaInicio && c.fecha <= fechaFin);

      // Filtrar por dependiente
      if (dependiente !== 'all') {
        filtered = filtered.filter(c => c.dependiente_id === dependiente);
      }

      // Filtrar por turno
      if (turno !== 'all') {
        filtered = filtered.filter(c => c.turno === turno);
      }

      // Ordenar por fecha y turno (mañana primero, tarde después)
      filtered.sort((a, b) => {
        if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
        return a.turno === 'manana' ? -1 : 1;
      });

      setCortes(filtered);
    } catch (e) {
      console.error('Error cargando cortes en dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePoblarDemo = async () => {
    try {
      await db.cortes_pendientes.add({
        id: crypto.randomUUID(),
        caja_fisica_id: 'caja-principal-id',
        dependiente_id: 'sonia-id',
        turno: 'tarde',
        fecha: fechaFin,
        hora_inicio: new Date().toISOString(),
        estado: 'cerrado',
        notas: 'Simulación de corte cerrado de forma instantánea.',
        detalles: [
          { rubro_id: 'billetes-id', monto_contado: 1300 },
          { rubro_id: 'monedas-id', monto_contado: 200 },
          { rubro_id: 'claro-id', monto_contado: 410 },
          { rubro_id: 'medicina-id', monto_contado: 180 },
          { rubro_id: 'libreria-id', monto_contado: 75 }
        ],
        pagos: [
          { proveedor: 'Bimbo', monto: 120, descripcion: 'Pedido de pan dulce' }
        ],
        timestamp: Date.now()
      });
      await cargarCortes();
    } catch (e) {
      console.error(e);
    }
  };

  // EXPORTACIÓN EXCEL / CSV CON SOPORTE UTF-8 BOM
  const handleExportarCSV = () => {
    if (cortes.length === 0) {
      alert('No hay registros en el reporte actual para exportar.');
      return;
    }

    // Cabecera del archivo CSV
    let csvContent = "Fecha,Turno,Dependiente,Billetes Contados (Q),Monedas Contadas (Q),Pagos Proveedores (Q),Esperado Sistema (Q),Diferencia (Q),Caja Claro (Q),Caja Medicina (Q),Caja Libreria (Q),Notas\n";

    cortes.forEach(c => {
      const billetes = c.detalles.find(d => d.rubro_id === 'billetes-id')?.monto_contado || 0;
      const monedas = c.detalles.find(d => d.rubro_id === 'monedas-id')?.monto_contado || 0;
      const claro = c.detalles.find(d => d.rubro_id === 'claro-id')?.monto_contado || 0;
      const medicina = c.detalles.find(d => d.rubro_id === 'medicina-id')?.monto_contado || 0;
      const libreria = c.detalles.find(d => d.rubro_id === 'libreria-id')?.monto_contado || 0;
      const pagos = c.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
      const esperado = 1000 - pagos; // Default Q1000
      const diferencia = (billetes + monedas) - esperado;
      const depName = c.dependiente_id === 'sonia-id' ? 'Sonia' : 'Don Carlos (Admin)';

      csvContent += `"${c.fecha}","${c.turno}","${depName}",${billetes},${monedas},${pagos},${esperado},${diferencia},${claro},${medicina},${libreria},"${c.notas || ''}"\n`;
    });

    // Crear Blob con BOM para soportar correctamente caracteres especiales y acentos en Microsoft Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Cortes_KatySmart_${fechaInicio}_a_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // IMPRESIÓN PDF / HOJA DE REPORTE NATIVA
  const handleImprimirReporte = () => {
    window.print();
  };

  // CALCULOS CONSOLIDADOS
  const calcularMontoPorRubro = (rubroId: string, corte: CortePendiente) => {
    const item = corte.detalles.find(d => d.rubro_id === rubroId);
    return item ? item.monto_contado : 0;
  };

  const totalBilletes = cortes.reduce((sum, c) => sum + calcularMontoPorRubro('billetes-id', c), 0);
  const totalMonedas = cortes.reduce((sum, c) => sum + calcularMontoPorRubro('monedas-id', c), 0);
  const ventasConsolidadasHoy = totalBilletes + totalMonedas;

  const pagosProveedoresConsolidado = cortes.reduce((sum, c) => {
    const totalCortePagos = c.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
    return sum + totalCortePagos;
  }, 0);

  const totalClaro = cortes.reduce((sum, c) => sum + calcularMontoPorRubro('claro-id', c), 0);
  const totalMedicina = cortes.reduce((sum, c) => sum + calcularMontoPorRubro('medicina-id', c), 0);
  const totalLibreria = cortes.reduce((sum, c) => sum + calcularMontoPorRubro('libreria-id', c), 0);
  const totalCajasAparte = totalClaro + totalMedicina + totalLibreria;

  // Diferencia general de cortes contra lo esperado
  const totalDiferencia = cortes.reduce((sum, c) => {
    const contado = calcularMontoPorRubro('billetes-id', c) + calcularMontoPorRubro('monedas-id', c);
    const pagosMonto = c.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
    const esperado = 1000 - pagosMonto;
    return sum + (contado - esperado);
  }, 0);

  const tieneDescuadreGrave = cortes.some(c => {
    const contado = calcularMontoPorRubro('billetes-id', c) + calcularMontoPorRubro('monedas-id', c);
    const pagosMonto = c.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
    const esperado = 1000 - pagosMonto;
    return Math.abs(contado - esperado) > 10;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 print:p-0 print:bg-white">
      
      {/* 1. SECCIÓN DE CABECERA Y FILTROS AVANZADOS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Indicadores de Tienda (Dashboard)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Supervisa y audita las ventas de caja general, egresos de proveedores y descuadres de turnos.</p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center space-x-1.5 transition ${
                mostrarFiltros 
                  ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-400' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros Avanzados</span>
            </button>
            <button 
              onClick={cargarCortes}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* PANEL DE FILTROS AVANZADOS (EXPANDIBLE) */}
        {mostrarFiltros && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha de Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full py-1.5 px-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha de Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full py-1.5 px-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filtrar por Dependiente</label>
              <select
                value={dependiente}
                onChange={(e) => setDependiente(e.target.value)}
                className="w-full py-1.5 px-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="all">Todos los Dependientes</option>
                <option value="sonia-id">Sonia (Mostrador)</option>
                <option value="admin-id">Don Carlos (Dueño)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filtrar por Turno</label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full py-1.5 px-3 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="all">Todos los Turnos</option>
                <option value="manana">Mañana (Primer Turno)</option>
                <option value="tarde">Tarde (Segundo Turno)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. TARJETAS DE INDICADORES (KPI CARDS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Efectivo Contado</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">Q{ventasConsolidadasHoy.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-500 font-medium block mt-1">Billetes + Monedas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 print:hidden">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Egresos Proveedores</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">Q{pagosProveedoresConsolidado.toFixed(2)}</span>
            <span className="text-[10px] text-rose-500 font-medium block mt-1">Salidas del turno</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 print:hidden">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Cajas Aparte</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">Q{totalCajasAparte.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 block mt-1">Claro/Medicina/Librería</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 print:hidden">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-colors ${
          tieneDescuadreGrave 
            ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/10' 
            : totalDiferencia === 0 
            ? 'border-slate-200 dark:border-slate-800' 
            : 'border-amber-300 dark:border-amber-900/50 bg-amber-50/10'
        }`}>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Diferencia Acumulada</span>
            <span className={`text-2xl font-black ${
              tieneDescuadreGrave 
                ? 'text-rose-600 dark:text-rose-400' 
                : totalDiferencia >= 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {totalDiferencia >= 0 ? '+' : ''}Q{totalDiferencia.toFixed(2)}
            </span>
            <span className="text-[10px] block mt-1">
              {tieneDescuadreGrave ? '⚠️ Descuadre grave' : '✅ Caja bajo control'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center print:hidden ${
            tieneDescuadreGrave 
              ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' 
              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
          }`}>
            {tieneDescuadreGrave ? <AlertTriangle className="w-6 h-6" /> : <Check className="w-6 h-6" />}
          </div>
        </div>
      </section>

      {/* 3. REPORTE COMPLETO CON EXPORTACIONES */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 print:border-0 print:shadow-none transition-colors">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Reporte de Auditoría de Cortes</h3>
            <p className="text-xs text-slate-500">Muestra el desglose de lo contado y las variaciones de descuadre en los filtros definidos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePoblarDemo}
              className="px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/25 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100"
            >
              + Simular Corte
            </button>
            <button
              onClick={handleExportarCSV}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center space-x-1"
              title="Exportar a Microsoft Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handleImprimirReporte}
              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm flex items-center space-x-1"
              title="Imprimir PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Reporte</span>
            </button>
          </div>
        </div>

        {/* Título específico de impresión que se muestra únicamente al imprimir el PDF */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black text-slate-950">REPORTE AUDITORÍA CAJA - KATY SMART</h1>
              <p className="text-xs text-slate-600 mt-1">Período: {fechaInicio} al {fechaFin} • Dependiente: {dependiente === 'all' ? 'Todos' : dependiente} • Turno: {turno === 'all' ? 'Todos' : turno}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              Impreso: {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {cortes.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900/40 p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No hay cortes en el rango de filtros seleccionado</p>
            <p className="text-xs text-slate-500 mt-1">Modifica los filtros de fecha superiores o haz clic en "Simular Corte" para poblar datos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs print:text-[10px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 print:bg-slate-100 print:text-slate-950 print:border-slate-300">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Turno</th>
                  <th className="p-3">Dependiente</th>
                  <th className="p-3 text-right">Contado Gral</th>
                  <th className="p-3 text-right">Egresos Prov.</th>
                  <th className="p-3 text-right">Esp. Sistema</th>
                  <th className="p-3 text-right">Diferencia</th>
                  <th className="p-3">Estado / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                {cortes.map((c) => {
                  const contado = calcularMontoPorRubro('billetes-id', c) + calcularMontoPorRubro('monedas-id', c);
                  const pagosMonto = c.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
                  const esperado = 1000 - pagosMonto;
                  const diff = contado - esperado;
                  const sem = Math.abs(diff) === 0 ? 'emerald' : Math.abs(diff) <= 10 ? 'amber' : 'rose';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white print:text-black">{c.fecha}</td>
                      <td className="p-3 capitalize font-bold">{c.turno}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-4 h-4 text-slate-400 print:hidden" />
                          <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">
                            {c.dependiente_id === 'sonia-id' ? 'Sonia' : 'Don Carlos (Admin)'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-950 dark:text-white print:text-black">Q{contado.toFixed(2)}</td>
                      <td className="p-3 text-right text-rose-500 font-semibold">-Q{pagosMonto.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium text-slate-600 dark:text-slate-400 print:text-slate-800">Q{esperado.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] print:px-0 print:bg-transparent ${
                          sem === 'emerald' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 print:text-emerald-700' 
                            : sem === 'amber' 
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 print:text-amber-700' 
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 print:text-rose-700'
                        }`}>
                          {diff >= 0 ? '+' : ''}Q{diff.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold shrink-0 print:hidden">
                            {c.estado}
                          </span>
                          <span className="text-slate-500 truncate max-w-[150px] print:text-slate-700 print:max-w-none">
                            {c.notas || 'Sin comentarios.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
};
