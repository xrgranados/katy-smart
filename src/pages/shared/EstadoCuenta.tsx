import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db, type MovimientoPendiente } from '../../db/dexie';
import { useOfflineStore } from '../../store/offlineStore';
import { 
  Search, 
  UserPlus, 
  Plus, 
  Minus, 
  Users, 
  ArrowLeft, 
  History, 
  Calendar, 
  Wallet, 
  X, 
  Clock, 
  UserCheck, 
  ShoppingBag, 
  Share2, 
  Check, 
  Phone, 
  CheckCircle2, 
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

export type PeriodoCorte = 'quincenal' | 'mensual' | 'quincenal_fijo';

export interface Familiar {
  id: string;
  nombre: string;
  parentesco: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  periodo_corte: PeriodoCorte;
  saldo_base: number;
  familiares: Familiar[];
}

export interface MovimientoUI {
  id: string;
  cliente_id: string;
  persona_id: string;
  persona_nombre: string;
  tipo: 'cargo' | 'abono';
  monto: number;
  fecha_hora: string;
  registrado_por: string; // Nombre del despachador o dueño que atendió
  descripcion_items: string;
  timestamp: number;
}

export interface InfoCorte {
  fechaCorteStr: string;
  diasRestantes: number;
  esVencido: boolean;
  esHoy: boolean;
  tipoCorte: 'quincena' | 'fin_de_mes';
  badgeTexto: string;
  color: 'emerald' | 'amber' | 'rose';
}

// Clientes base para la demostración
const CLIENTES_INICIALES: Cliente[] = [
  {
    id: 'feed0000-cafe-babe-0000-000000000000',
    nombre: 'Doña Fabiola Estrada',
    telefono: '5555-0001',
    periodo_corte: 'quincenal',
    saldo_base: 0,
    familiares: [
      { id: 'fam-1', nombre: 'Doña Fabiola', parentesco: 'Titular' },
      { id: 'fam-2', nombre: 'Anderson', parentesco: 'Hijo' },
      { id: 'fam-3', nombre: 'Lucía', parentesco: 'Hija mayor' }
    ]
  },
  {
    id: 'client-2',
    nombre: 'Don Luis Morales (Carpintería)',
    telefono: '5555-0002',
    periodo_corte: 'mensual',
    saldo_base: 120.00,
    familiares: [
      { id: 'fam-4', nombre: 'Don Luis Morales', parentesco: 'Titular' },
      { id: 'fam-5', nombre: 'Marcos (Ayudante)', parentesco: 'Trabajador' }
    ]
  },
  {
    id: 'client-3',
    nombre: 'Familia Gómez',
    telefono: '5555-0003',
    periodo_corte: 'quincenal',
    saldo_base: 45.00,
    familiares: [
      { id: 'fam-6', nombre: 'Carlos Gómez', parentesco: 'Titular' },
      { id: 'fam-7', nombre: 'Marta de Gómez', parentesco: 'Esposa' }
    ]
  }
];

// Cálculo automático de fechas de corte Quincenal (día 15) y Fin de Mes (30/31)
export function calcularPeriodoCorte(periodo: PeriodoCorte, fechaRef = new Date()): InfoCorte {
  const hoy = new Date(fechaRef);
  const dia = hoy.getDate();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();

  let fechaCorte: Date;
  let tipoCorte: 'quincena' | 'fin_de_mes' = 'quincena';

  if (periodo === 'mensual') {
    fechaCorte = new Date(anio, mes + 1, 0, 23, 59, 59);
    tipoCorte = 'fin_de_mes';
  } else {
    if (dia <= 15) {
      fechaCorte = new Date(anio, mes, 15, 23, 59, 59);
      tipoCorte = 'quincena';
    } else {
      fechaCorte = new Date(anio, mes + 1, 0, 23, 59, 59);
      tipoCorte = 'fin_de_mes';
    }
  }

  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const inicioCorte = new Date(fechaCorte.getFullYear(), fechaCorte.getMonth(), fechaCorte.getDate()).getTime();
  const diffDias = Math.round((inicioCorte - inicioHoy) / (1000 * 60 * 60 * 24));

  const esVencido = diffDias < 0;
  const esHoy = diffDias === 0;
  const nombreCorte = tipoCorte === 'quincena' ? 'Quincena (Día 15)' : 'Fin de Mes';

  let badgeTexto = '';
  let color: 'emerald' | 'amber' | 'rose' = 'emerald';

  if (esVencido) {
    badgeTexto = `Corte vencido (${Math.abs(diffDias)} d)`;
    color = 'rose';
  } else if (esHoy) {
    badgeTexto = `¡Corte hoy (${nombreCorte})!`;
    color = 'amber';
  } else if (diffDias <= 3) {
    badgeTexto = `Corte en ${diffDias} días (${nombreCorte})`;
    color = 'amber';
  } else {
    badgeTexto = `Corte en ${diffDias} días (${nombreCorte})`;
    color = 'emerald';
  }

  const fechaCorteStr = fechaCorte.toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return {
    fechaCorteStr,
    diasRestantes: diffDias,
    esVencido,
    esHoy,
    tipoCorte,
    badgeTexto,
    color
  };
}

export function EstadoCuenta() {
  const { user, activeRole } = useAuthStore();
  const { updatePendingCount } = useOfflineStore();
  
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    const saved = localStorage.getItem('katy_smart_clientes');
    return saved ? JSON.parse(saved) : CLIENTES_INICIALES;
  });

  const [movimientosLocales, setMovimientosLocales] = useState<MovimientoUI[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'con_saldo' | 'al_dia'>('todos');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  const [vista, setVista] = useState<'lista' | 'detalle' | 'nuevo-cliente' | 'nueva-transaccion' | 'nuevo-familiar' | 'cobrar-rapido'>('lista');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formularios
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', periodo_corte: 'quincenal' as PeriodoCorte, saldo_inicial: '0' });
  const [formFamiliar, setFormFamiliar] = useState({ nombre: '', parentesco: '' });
  
  // Transacción con todos los detalles requeridos
  const [formTx, setFormTx] = useState({
    tipo: 'cargo' as 'cargo' | 'abono',
    familiarId: '',
    monto: '',
    descripcion: '',
    atendidoPor: user?.nombre || 'Don Carlos - Dueño',
    fechaHora: new Date().toISOString().slice(0, 16)
  });

  // Guardar clientes en localStorage
  useEffect(() => {
    localStorage.setItem('katy_smart_clientes', JSON.stringify(clientes));
  }, [clientes]);

  // Cargar y sembrar movimientos en Dexie
  useEffect(() => {
    cargarYVerificarMovimientos();
  }, []);

  // Control de vista según rol
  useEffect(() => {
    if (activeRole === 'cliente') {
      // Si entra como cliente, enfocar automáticamente en su cuenta vinculada
      const clienteActual = clientes.find(c => c.id === user?.id) || clientes[0];
      setSelectedCliente(clienteActual);
      setVista('detalle');
    } else {
      if (vista === 'detalle' && !selectedCliente) {
        setVista('lista');
      }
    }
  }, [activeRole, user, clientes]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const cargarYVerificarMovimientos = async () => {
    try {
      let movs = await db.movimientos_pendientes.toArray();

      // Sembrar datos ricos iniciales si está vacío para que el usuario pruebe de inmediato
      if (movs.length === 0) {
        const ahora = Date.now();
        const demoMovs: MovimientoPendiente[] = [
          {
            id: 'mov-demo-1',
            cliente_id: 'feed0000-cafe-babe-0000-000000000000',
            persona_id: 'fam-1',
            persona_nombre: 'Doña Fabiola',
            tipo: 'cargo',
            monto: 45.00,
            fecha_hora: new Date(ahora - 86400000 * 2.5).toISOString(),
            registrado_por: 'Matilde - Dependiente',
            descripcion_items: '1 aceite vegetal 800ml, 2 lb frijol negro, 1 lb azúcar',
            timestamp: ahora - 86400000 * 2.5
          },
          {
            id: 'mov-demo-2',
            cliente_id: 'feed0000-cafe-babe-0000-000000000000',
            persona_id: 'fam-2',
            persona_nombre: 'Anderson (Hijo)',
            tipo: 'cargo',
            monto: 38.50,
            fecha_hora: new Date(ahora - 86400000 * 1.2).toISOString(),
            registrado_por: 'Matilde - Dependiente',
            descripcion_items: '2 leches Dos Pinos 1L, 1 pan de molde Bimbo',
            timestamp: ahora - 86400000 * 1.2
          },
          {
            id: 'mov-demo-3',
            cliente_id: 'feed0000-cafe-babe-0000-000000000000',
            persona_id: 'fam-1',
            persona_nombre: 'Doña Fabiola',
            tipo: 'abono',
            monto: 50.00,
            fecha_hora: new Date(ahora - 86400000 * 0.8).toISOString(),
            registrado_por: 'Don Carlos - Dueño',
            descripcion_items: 'Abono en efectivo recibido personalmente en tienda',
            timestamp: ahora - 86400000 * 0.8
          },
          {
            id: 'mov-demo-4',
            cliente_id: 'feed0000-cafe-babe-0000-000000000000',
            persona_id: 'fam-2',
            persona_nombre: 'Anderson (Hijo)',
            tipo: 'cargo',
            monto: 16.50,
            fecha_hora: new Date(ahora - 3600000 * 4).toISOString(),
            registrado_por: 'Don Carlos - Dueño',
            descripcion_items: '6 huevos de granja, 1 gaseosa 600ml',
            timestamp: ahora - 3600000 * 4
          }
        ];

        for (const m of demoMovs) {
          await db.movimientos_pendientes.add(m);
        }
        movs = await db.movimientos_pendientes.toArray();
      }

      // Mapear movimientos a UI
      const movsUI: MovimientoUI[] = movs.map(m => {
        const cliente = clientes.find(c => c.id === m.cliente_id);
        const familiar = cliente?.familiares.find(f => f.id === m.persona_id);
        const nombreQuienPide = m.persona_nombre || familiar?.nombre || 'Titular';

        return {
          id: m.id || crypto.randomUUID(),
          cliente_id: m.cliente_id,
          persona_id: m.persona_id,
          persona_nombre: nombreQuienPide,
          tipo: m.tipo,
          monto: m.monto,
          fecha_hora: m.fecha_hora,
          registrado_por: m.registrado_por || 'Encargado de tienda',
          descripcion_items: m.descripcion_items || '',
          timestamp: m.timestamp || new Date(m.fecha_hora).getTime()
        };
      });

      // Ordenar cronológicamente descendente (lo más reciente primero)
      setMovimientosLocales(movsUI.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()));
    } catch (e) {
      console.error('Error cargando movimientos de Dexie:', e);
    }
  };

  // Calcular el saldo actual de cualquier cliente
  const getSaldoActual = (cliente: Cliente): number => {
    const movsCliente = movimientosLocales.filter(m => m.cliente_id === cliente.id);
    let saldo = cliente.saldo_base;
    movsCliente.forEach(m => {
      if (m.tipo === 'cargo') saldo += m.monto;
      else if (m.tipo === 'abono') saldo -= m.monto;
    });
    return Math.max(0, saldo);
  };

  const formatearMoneda = (monto: number) => `Q ${monto.toFixed(2)}`;

  // Formateador amigable de fecha y hora
  const formatearFechaHora = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const fecha = d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
      const hora = d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { fecha, hora, full: `${fecha} • ${hora}` };
    } catch {
      return { fecha: isoStr, hora: '', full: isoStr };
    }
  };

  // Guardar un nuevo cliente
  const handleCrearCliente = (e: React.FormEvent) => {
    e.preventDefault();
    const saldoInicialNum = parseFloat(formCliente.saldo_inicial) || 0;
    const nuevoCli: Cliente = {
      id: crypto.randomUUID(),
      nombre: formCliente.nombre.trim(),
      telefono: formCliente.telefono.trim(),
      periodo_corte: formCliente.periodo_corte,
      saldo_base: saldoInicialNum,
      familiares: [{ id: crypto.randomUUID(), nombre: formCliente.nombre.trim(), parentesco: 'Titular' }]
    };

    const actualizados = [...clientes, nuevoCli];
    setClientes(actualizados);
    setSelectedCliente(nuevoCli);
    setVista('detalle');
    setFormCliente({ nombre: '', telefono: '', periodo_corte: 'quincenal', saldo_inicial: '0' });
    showToast(`✅ Libreta creada para ${nuevoCli.nombre}`);
  };

  // Agregar familiar autorizado
  const handleCrearFamiliar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    const nuevoFam: Familiar = {
      id: crypto.randomUUID(),
      nombre: formFamiliar.nombre.trim(),
      parentesco: formFamiliar.parentesco.trim()
    };

    const cliActualizado: Cliente = {
      ...selectedCliente,
      familiares: [...selectedCliente.familiares, nuevoFam]
    };

    setClientes(clientes.map(c => c.id === cliActualizado.id ? cliActualizado : c));
    setSelectedCliente(cliActualizado);
    setVista('detalle');
    setFormFamiliar({ nombre: '', parentesco: '' });
    showToast(`✅ ${nuevoFam.nombre} agregado como persona autorizada`);
  };

  // Guardar transacción (Cargo o Abono) con TODOS los detalles solicitados
  const handleGuardarTransaccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    const montoNum = parseFloat(formTx.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }

    const personaSeleccionada = selectedCliente.familiares.find(f => f.id === formTx.familiarId);
    const personaNombre = personaSeleccionada 
      ? `${personaSeleccionada.nombre} (${personaSeleccionada.parentesco})` 
      : selectedCliente.nombre;

    const despachador = formTx.atendidoPor.trim() || (user?.nombre || 'Don Carlos - Dueño');

    const nuevoMov: MovimientoPendiente = {
      id: crypto.randomUUID(),
      cliente_id: selectedCliente.id,
      persona_id: formTx.familiarId || selectedCliente.familiares[0]?.id || 'titular',
      persona_nombre: personaNombre,
      tipo: formTx.tipo,
      monto: montoNum,
      fecha_hora: formTx.fechaHora ? new Date(formTx.fechaHora).toISOString() : new Date().toISOString(),
      registrado_por: despachador,
      descripcion_items: formTx.descripcion.trim(),
      timestamp: Date.now()
    };

    await db.movimientos_pendientes.add(nuevoMov);
    await updatePendingCount();
    await cargarYVerificarMovimientos();

    setVista('detalle');
    showToast(formTx.tipo === 'cargo' 
      ? `📝 Cargo de ${formatearMoneda(montoNum)} anotado a ${selectedCliente.nombre}`
      : `💵 Abono de ${formatearMoneda(montoNum)} recibido con éxito`
    );

    // Reset de form
    setFormTx({
      tipo: 'cargo',
      familiarId: '',
      monto: '',
      descripcion: '',
      atendidoPor: user?.nombre || 'Don Carlos - Dueño',
      fechaHora: new Date().toISOString().slice(0, 16)
    });
  };

  // Liquidación rápida (Abonar saldo total)
  const handleCobroRapidoTotal = (cliente: Cliente) => {
    const saldo = getSaldoActual(cliente);
    if (saldo <= 0) {
      alert('El cliente no tiene saldo pendiente por cobrar.');
      return;
    }

    setFormTx({
      tipo: 'abono',
      familiarId: cliente.familiares[0]?.id || '',
      monto: saldo.toFixed(2),
      descripcion: 'Liquidación total de saldo pendiente en efectivo',
      atendidoPor: user?.nombre || 'Don Carlos - Dueño',
      fechaHora: new Date().toISOString().slice(0, 16)
    });
    setSelectedCliente(cliente);
    setVista('nueva-transaccion');
  };

  // Enviar recordatorio o estado de cuenta por WhatsApp
  const handleCompartirWhatsApp = (cliente: Cliente) => {
    const saldo = getSaldoActual(cliente);
    const movsCliente = movimientosLocales.filter(m => m.cliente_id === cliente.id);
    const infoCorte = calcularPeriodoCorte(cliente.periodo_corte);

    const ultimosMovs = movsCliente.slice(0, 4).map(m => {
      const fh = formatearFechaHora(m.fecha_hora);
      const signo = m.tipo === 'cargo' ? '+' : '-';
      return `• ${fh.fecha} (${m.persona_nombre}): ${signo}Q${m.monto.toFixed(2)} [${m.descripcion_items || (m.tipo === 'cargo' ? 'Consumo' : 'Abono')}] - Atendió: ${m.registrado_por.split('-')[0].trim()}`;
    }).join('\n');

    const mensaje = `Hola ${cliente.nombre}, le saluda Don Carlos de Katy Smart.\n\n` +
      `📋 *Estado de Cuenta de Fiados*\n` +
      `💰 *Saldo pendiente actual:* Q${saldo.toFixed(2)}\n` +
      `🗓️ *Próximo corte:* ${infoCorte.fechaCorteStr} (${infoCorte.tipoCorte === 'quincena' ? 'Quincena' : 'Fin de Mes'})\n\n` +
      (ultimosMovs ? `*Últimos movimientos registrados:*\n${ultimosMovs}\n\n` : '') +
      `Si tiene alguna consulta o desea liquidar su cuenta con gusto le atendemos. ¡Muchas gracias por su preferencia!`;

    const telefonoLimpio = cliente.telefono.replace(/[^0-9]/g, '');
    const url = `https://wa.me/502${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // ==========================================
  // RENDER: VISTA LIMPIA DEL CLIENTE (MÓVIL)
  // ==========================================
  const renderVistaLimpiaCliente = () => {
    if (!selectedCliente) return null;

    const saldo = getSaldoActual(selectedCliente);
    const movsCliente = movimientosLocales.filter(m => m.cliente_id === selectedCliente.id);
    const infoCorte = calcularPeriodoCorte(selectedCliente.periodo_corte);

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Encabezado Amistoso */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
              Cuenta Corriente • Cliente
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Hola, {selectedCliente.nombre.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Consulta en tiempo real tus consumos de confianza y pagos.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-purple-500/20">
            {selectedCliente.nombre.charAt(0)}
          </div>
        </div>

        {/* Tarjeta Principal de Saldo (Estilo Billetera Treinta) */}
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-purple-400" /> Tu Saldo Pendiente al Momento
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                infoCorte.color === 'emerald'
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                  : infoCorte.color === 'amber'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                  : 'bg-rose-950/70 text-rose-300 border-rose-700/60'
              }`}>
                {infoCorte.badgeTexto}
              </span>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {formatearMoneda(saldo)}
              </div>
              <p className="text-xs text-purple-200/80 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> 
                Próximo corte: <strong>{infoCorte.fechaCorteStr}</strong> ({infoCorte.tipoCorte === 'quincena' ? 'Quincena: día 15' : 'Fin de Mes'})
              </p>
            </div>

            <div className="pt-3 border-t border-purple-800/40 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-300">
              <span>Tienda: <strong>Katy Smart (Don Carlos)</strong></span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Cuenta Activa
              </span>
            </div>
          </div>
          {/* Fondo estético */}
          <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-44 h-44 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Personas de la familia autorizadas a pedir */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              Personas autorizadas en tu cuenta
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCliente.familiares.map(fam => (
              <span 
                key={fam.id} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-600"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                <strong>{fam.nombre}</strong> ({fam.parentesco})
              </span>
            ))}
          </div>
        </div>

        {/* Historial Limpio de Movimientos */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Detalle de lo Solicitado y Pagado
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {movsCliente.length} registro(s)
            </span>
          </div>

          {movsCliente.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Sin movimientos pendientes</p>
              <p className="text-xs text-slate-400">Todo se encuentra al día.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {movsCliente.map(mov => {
                const fh = formatearFechaHora(mov.fecha_hora);
                const esCargo = mov.tipo === 'cargo';

                return (
                  <div key={mov.id} className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      {/* Icono + Información Principal */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                          esCargo 
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50' 
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                        }`}>
                          {esCargo ? <ShoppingBag className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          {/* Descripción de productos o pago */}
                          <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                            {mov.descripcion_items || (esCargo ? 'Compra de mercadería' : 'Abono a cuenta')}
                          </p>

                          {/* Metadatos detallados: Quién pidió, Quién atendió, Fecha/Hora */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                              Pidió: {mov.persona_nombre}
                            </span>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              Atendió: {mov.registrado_por.split('-')[0].trim()}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {fh.full}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Monto solicitado o abonado */}
                      <div className="text-right shrink-0">
                        <span className={`text-base sm:text-lg font-black tracking-tight ${
                          esCargo ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {esCargo ? '+' : '-'}{formatearMoneda(mov.monto)}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          {esCargo ? 'Consumo' : 'Abono'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón de Contacto Rápido para Dudas */}
        <div className="text-center pt-2">
          <button
            onClick={() => handleCompartirWhatsApp(selectedCliente)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <Phone className="w-4 h-4" />
            ¿Dudas sobre tus consumos? Escríbenos por WhatsApp
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: CUADERNO DIGITAL DEL DUEÑO / ADMIN
  // ==========================================
  const renderListaDueño = () => {
    // Totales globales
    const totalCobrar = clientes.reduce((acc, c) => acc + getSaldoActual(c), 0);
    const clientesConSaldo = clientes.filter(c => getSaldoActual(c) > 0).length;

    // Filtros
    const filtrados = clientes.filter(c => {
      const matchSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || c.telefono.includes(searchTerm);
      const saldo = getSaldoActual(c);
      if (filtroEstado === 'con_saldo') return matchSearch && saldo > 0;
      if (filtroEstado === 'al_dia') return matchSearch && saldo === 0;
      return matchSearch;
    });

    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
        {/* ENCABEZADO Y RESUMEN GENERAL (Estilo Treinta) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
              Módulo de Cobranza • Cuaderno Digital
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Libreta de Fiados y Cuentas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Control de consumos por cobrar en quincena y fin de mes. Independiente del corte de caja diario.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVista('nuevo-cliente')}
              className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all text-sm min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Abrir Nueva Cuenta</span>
            </button>
          </div>
        </div>

        {/* TARJETAS RESUMEN DE COBRANZA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total por Cobrar en Calle</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatearMoneda(totalCobrar)}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Clientes con Deuda</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{clientesConSaldo} de {clientes.length}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Ciclos de Pago</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Quincena (15) y Fin de Mes</p>
            </div>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por cliente o teléfono (ej. Fabiola, 5555)..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroEstado === 'todos' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm' : 'text-slate-500'
              }`}
            >
              Todos ({clientes.length})
            </button>
            <button
              onClick={() => setFiltroEstado('con_saldo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroEstado === 'con_saldo' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              Con Deuda ({clientesConSaldo})
            </button>
            <button
              onClick={() => setFiltroEstado('al_dia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroEstado === 'al_dia' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'
              }`}
            >
              Al Día ({clientes.length - clientesConSaldo})
            </button>
          </div>
        </div>

        {/* LISTA DE CUENTAS / CUADERNO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(cliente => {
            const saldo = getSaldoActual(cliente);
            const infoCorte = calcularPeriodoCorte(cliente.periodo_corte);
            const tieneSaldo = saldo > 0;

            return (
              <div 
                key={cliente.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                        {cliente.nombre}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {cliente.telefono}
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      infoCorte.color === 'emerald'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                        : infoCorte.color === 'amber'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                    }`}>
                      {infoCorte.badgeTexto}
                    </span>
                  </div>

                  {/* Familiares autorizados (Badge rápido) */}
                  <div className="mb-4 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Autorizados:</span>{' '}
                    {cliente.familiares.map(f => f.nombre).join(', ')}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo Adeudado</p>
                      <p className={`text-2xl font-black ${tieneSaldo ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatearMoneda(saldo)}
                      </p>
                    </div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-medium">
                      {cliente.periodo_corte === 'mensual' ? 'Fin de mes' : 'Quincenal'}
                    </span>
                  </div>

                  {/* Botones de Acción Rápida para el Dueño */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => { setSelectedCliente(cliente); setVista('detalle'); }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 min-h-[38px]"
                    >
                      <History className="w-3.5 h-3.5 text-purple-500" />
                      Ver Libreta
                    </button>

                    {tieneSaldo ? (
                      <button
                        onClick={() => handleCobroRapidoTotal(cliente)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        Cobrar / Abonar
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedCliente(cliente);
                          setFormTx({
                            tipo: 'cargo',
                            familiarId: cliente.familiares[0]?.id || '',
                            monto: '',
                            descripcion: '',
                            atendidoPor: user?.nombre || 'Don Carlos - Dueño',
                            fechaHora: new Date().toISOString().slice(0, 16)
                          });
                          setVista('nueva-transaccion');
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 min-h-[38px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Anotar Fiado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filtrados.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-500">
              No se encontraron cuentas con el filtro "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: FICHA DETALLADA DEL CLIENTE (EL CUADERNO)
  // ==========================================
  const renderDetalleClienteDueño = () => {
    if (!selectedCliente) return null;

    const saldo = getSaldoActual(selectedCliente);
    const movsCliente = movimientosLocales.filter(m => m.cliente_id === selectedCliente.id);
    const infoCorte = calcularPeriodoCorte(selectedCliente.periodo_corte);
    const esDependiente = activeRole === 'dependiente';

    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
        {/* Botón Volver */}
        <button 
          onClick={() => { setVista('lista'); setSelectedCliente(null); }}
          className="flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors text-sm font-semibold min-h-[44px] px-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver a la Libreta de Cuentas
        </button>

        {/* Tarjeta de Saldo y Acciones del Dueño */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-purple-400 tracking-wider">
                  Cuenta Corriente
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  infoCorte.color === 'emerald'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                    : infoCorte.color === 'amber'
                    ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                    : 'bg-rose-950/70 text-rose-300 border-rose-700/60'
                }`}>
                  {infoCorte.badgeTexto}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white">{selectedCliente.nombre}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-3">
                <span>Tel: {selectedCliente.telefono}</span>
                <span>•</span>
                <span>Corte: {selectedCliente.periodo_corte === 'mensual' ? 'Fin de mes' : 'Quincenal (Día 15 y 30)'}</span>
              </p>

              <div className="pt-2">
                <span className="text-xs uppercase font-bold text-slate-400">Saldo Actual por Cobrar:</span>
                <div className={`text-4xl sm:text-5xl font-black mt-0.5 ${
                  saldo > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {formatearMoneda(saldo)}
                </div>
              </div>
            </div>

            {/* BOTONES DE OPERACIÓN */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
              <button 
                onClick={() => {
                  setFormTx({
                    tipo: 'cargo',
                    familiarId: selectedCliente.familiares[0]?.id || '',
                    monto: '',
                    descripcion: '',
                    atendidoPor: user?.nombre || 'Don Carlos - Dueño',
                    fechaHora: new Date().toISOString().slice(0, 16)
                  });
                  setVista('nueva-transaccion');
                }}
                className="px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all text-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Anotar Fiado (Cargo)</span>
              </button>

              {!esDependiente && (
                <button 
                  onClick={() => {
                    setFormTx({
                      tipo: 'abono',
                      familiarId: selectedCliente.familiares[0]?.id || '',
                      monto: saldo > 0 ? saldo.toFixed(2) : '',
                      descripcion: saldo > 0 ? 'Liquidación de saldo pendiente' : 'Abono en efectivo',
                      atendidoPor: user?.nombre || 'Don Carlos - Dueño',
                      fechaHora: new Date().toISOString().slice(0, 16)
                    });
                    setVista('nueva-transaccion');
                  }}
                  className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-sm min-h-[44px]"
                >
                  <Minus className="w-4 h-4" />
                  <span>Registrar Cobro (Abono)</span>
                </button>
              )}

              <button
                onClick={() => handleCompartirWhatsApp(selectedCliente)}
                className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-sm min-h-[44px]"
                title="Compartir resumen por WhatsApp"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span className="sm:hidden">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO DEL CUADERNO: FAMILIARES + HISTORIAL DETALLADO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA LATERAL: FAMILIARES AUTORIZADOS */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white text-sm">
                  <Users className="w-4 h-4 text-purple-500" />
                  Personas Autorizadas
                </h3>
                {!esDependiente && (
                  <button 
                    onClick={() => setVista('nuevo-familiar')}
                    className="p-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-400 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Autorizar familiar"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {selectedCliente.familiares.map(fam => (
                  <div key={fam.id} className="p-3 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{fam.nombre}</p>
                      <p className="text-[11px] text-slate-400">{fam.parentesco}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMNA PRINCIPAL: HISTORIAL DETALLADO DEL CUADERNO */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    Registros en Cuaderno de Fiados
                  </h3>
                  <p className="text-xs text-slate-400">
                    Detalle de fecha, hora, monto, solicitante y despachador.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  {movsCliente.length} apunte(s)
                </span>
              </div>

              {movsCliente.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  No hay movimientos registrados para esta cuenta.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {movsCliente.map(mov => {
                    const fh = formatearFechaHora(mov.fecha_hora);
                    const esCargo = mov.tipo === 'cargo';

                    return (
                      <div key={mov.id} className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Columna Izquierda: Detalles del Registro */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Descripción de Artículos o Abono */}
                            <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                              {mov.descripcion_items || (esCargo ? 'Compra de productos surtidos' : 'Abono recibido en efectivo')}
                            </p>

                            {/* Requisitos clave: Hora/Fecha, Quién pidió, Quién atendió */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span>Pidió: <strong className="text-slate-800 dark:text-slate-200">{mov.persona_nombre}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>Atendió: <strong className="text-slate-800 dark:text-slate-200">{mov.registrado_por}</strong></span>
                              </div>

                              <div className="flex items-center gap-1.5 col-span-full">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{fh.full}</span>
                              </div>
                            </div>
                          </div>

                          {/* Columna Derecha: Monto */}
                          <div className="text-right sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-700 flex sm:flex-col items-center sm:items-end justify-between">
                            <span className={`text-base sm:text-lg font-black tracking-tight ${
                              esCargo ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {esCargo ? '+' : '-'}{formatearMoneda(mov.monto)}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              esCargo 
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {esCargo ? 'Deuda (+) ' : 'Cobrado (-) '}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: MODAL / FORMULARIO TRANSACCIÓN
  // ==========================================
  const renderFormTransaccion = () => {
    if (!selectedCliente) return null;
    const esCargo = formTx.tipo === 'cargo';
    const saldoActual = getSaldoActual(selectedCliente);

    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {esCargo ? (
                <><Plus className="w-5 h-5 text-rose-500" /> Anotar Fiado (Consumo)</>
              ) : (
                <><Minus className="w-5 h-5 text-emerald-500" /> Recibir Pago (Abono)</>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliente: <strong>{selectedCliente.nombre}</strong> • Saldo actual: {formatearMoneda(saldoActual)}
            </p>
          </div>
          <button 
            onClick={() => setVista('detalle')} 
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleGuardarTransaccion} className="space-y-4">
          {/* Persona que pide o abona */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {esCargo ? '¿Quién de la familia pide el fiado?' : '¿Quién realiza el abono?'}
            </label>
            <select 
              required 
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              value={formTx.familiarId} 
              onChange={e => setFormTx({...formTx, familiarId: e.target.value})}
            >
              <option value="" disabled>Seleccione persona autorizada...</option>
              {selectedCliente.familiares.map(fam => (
                <option key={fam.id} value={fam.id}>{fam.nombre} ({fam.parentesco})</option>
              ))}
            </select>
          </div>

          {/* Monto */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Monto en Quetzales (Q)
              </label>
              {!esCargo && saldoActual > 0 && (
                <button
                  type="button"
                  onClick={() => setFormTx({...formTx, monto: saldoActual.toFixed(2)})}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline"
                >
                  Liquidar todo (Q{saldoActual.toFixed(2)})
                </button>
              )}
            </div>
            <input 
              required 
              type="number" 
              step="0.01" 
              min="0.01" 
              className="w-full p-3 text-xl font-black rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 min-h-[48px]"
              value={formTx.monto} 
              onChange={e => setFormTx({...formTx, monto: e.target.value})} 
              placeholder="0.00" 
            />
          </div>

          {/* Despachador / Dependiente que atendió */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {esCargo ? 'Despachador / Dependiente que atendió' : 'Cobrado / Recibido por'}
            </label>
            <input 
              required 
              type="text" 
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              value={formTx.atendidoPor} 
              onChange={e => setFormTx({...formTx, atendidoPor: e.target.value})} 
              placeholder="Ej. Matilde (Dependiente) o Don Carlos (Dueño)" 
            />
          </div>

          {/* Descripción de artículos */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Descripción {esCargo ? 'de productos que se lleva' : 'del pago (Opcional)'}
            </label>
            <textarea 
              required={esCargo} 
              rows={3} 
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              value={formTx.descripcion} 
              onChange={e => setFormTx({...formTx, descripcion: e.target.value})} 
              placeholder={esCargo ? "Ej. 2 leches Dos Pinos, 1 pan de molde, 6 huevos..." : "Ej. Pago recibido en efectivo por el dueño"} 
            />
          </div>

          {/* Fecha y Hora exacta */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" /> Fecha y Hora exacta del registro
            </label>
            <input 
              required 
              type="datetime-local" 
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              value={formTx.fechaHora} 
              onChange={e => setFormTx({...formTx, fechaHora: e.target.value})} 
            />
          </div>

          <button 
            type="submit" 
            className={`w-full py-4 text-white font-bold rounded-2xl mt-4 transition-all shadow-lg text-sm min-h-[48px] ${
              esCargo 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {esCargo ? 'Guardar en Cuaderno de Fiados' : 'Confirmar Abono Recibido'}
          </button>
        </form>
      </div>
    );
  };

  // ==========================================
  // RENDER: FORMULARIO NUEVO CLIENTE
  // ==========================================
  const renderFormCliente = () => (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Abrir Cuenta de Confianza</h2>
          <p className="text-xs text-slate-500">Registrar un nuevo vecino en la libreta digital</p>
        </div>
        <button 
          onClick={() => setVista('lista')} 
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleCrearCliente} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Nombre Completo del Titular</label>
          <input 
            required 
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            value={formCliente.nombre} 
            onChange={e => setFormCliente({...formCliente, nombre: e.target.value})} 
            placeholder="Ej. Doña Marta de León" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Teléfono (WhatsApp)</label>
          <input 
            required 
            type="tel" 
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            value={formCliente.telefono} 
            onChange={e => setFormCliente({...formCliente, telefono: e.target.value})} 
            placeholder="Ej. 5555-1234" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Ciclo de Cobro</label>
          <select 
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            value={formCliente.periodo_corte} 
            onChange={e => setFormCliente({...formCliente, periodo_corte: e.target.value as PeriodoCorte})}
          >
            <option value="quincenal">Quincenal (Día 15 y Fin de Mes)</option>
            <option value="mensual">Mensual (Exclusivo Fin de Mes)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Saldo Inicial o Deuda Anterior (Q)</label>
          <input 
            type="number" 
            step="0.01" 
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            value={formCliente.saldo_inicial} 
            onChange={e => setFormCliente({...formCliente, saldo_inicial: e.target.value})} 
            placeholder="0.00" 
          />
        </div>

        <button 
          type="submit" 
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl mt-4 transition-all shadow-lg shadow-purple-600/20 text-sm min-h-[48px]"
        >
          Guardar Cliente en Libreta
        </button>
      </form>
    </div>
  );

  // ==========================================
  // RENDER: FORMULARIO NUEVO FAMILIAR
  // ==========================================
  const renderFormFamiliar = () => (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Autorizar Persona</h2>
          <p className="text-xs text-slate-500">Para la cuenta de {selectedCliente?.nombre}</p>
        </div>
        <button 
          onClick={() => setVista('detalle')} 
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleCrearFamiliar} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Nombre de la Persona</label>
          <input 
            required 
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            value={formFamiliar.nombre} 
            onChange={e => setFormFamiliar({...formFamiliar, nombre: e.target.value})} 
            placeholder="Ej. Anderson" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Parentesco / Relación</label>
          <input 
            required 
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            value={formFamiliar.parentesco} 
            onChange={e => setFormFamiliar({...formFamiliar, parentesco: e.target.value})} 
            placeholder="Ej. Hijo, Esposo, Empleada" 
          />
        </div>

        <button 
          type="submit" 
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl mt-4 transition-all shadow-lg shadow-purple-600/20 text-sm min-h-[48px]"
        >
          Autorizar para Pedir Fiado
        </button>
      </form>
    </div>
  );

  return (
    <div className="w-full h-full">
      {/* Toast Notificación */}
      {toastMessage && (
        <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50 bg-slate-900 text-white dark:bg-purple-950 dark:text-purple-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 dark:border-purple-800 transition-all">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* RENDERIZADO SEGÚN ROL Y ESTADO */}
      {activeRole === 'cliente' ? (
        renderVistaLimpiaCliente()
      ) : (
        <>
          {vista === 'lista' && renderListaDueño()}
          {vista === 'detalle' && renderDetalleClienteDueño()}
          {vista === 'nuevo-cliente' && renderFormCliente()}
          {vista === 'nuevo-familiar' && renderFormFamiliar()}
          {vista === 'nueva-transaccion' && renderFormTransaccion()}
        </>
      )}
    </div>
  );
}
