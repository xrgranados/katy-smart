import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../db/dexie';
import { useOfflineStore } from '../../store/offlineStore';
import { 
  Search, UserPlus, Plus, Minus, Users, ArrowLeft, 
  History, Calendar, Wallet, ChevronRight, X 
} from 'lucide-react';

type PeriodoCorte = 'quincenal' | 'mensual' | 'quincenal_fijo';

interface Familiar {
  id: string;
  nombre: string;
  parentesco: string;
}

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  periodo_corte: PeriodoCorte;
  codigo_kiosco: string;
  pin_kiosco: string;
  saldo_base: number;
  familiares: Familiar[];
}

const mockClientes: Cliente[] = [
  {
    id: 'feed0000-cafe-babe-0000-000000000000',
    nombre: 'Doña Fabiola',
    telefono: '5555-0001',
    periodo_corte: 'quincenal',
    codigo_kiosco: 'FAB-001',
    pin_kiosco: '1234',
    saldo_base: 450.50,
    familiares: [
      { id: 'fam-1', nombre: 'Doña Fabiola', parentesco: 'Titular' },
      { id: 'fam-2', nombre: 'Anderson', parentesco: 'Hijo' }
    ]
  },
  {
    id: 'client-2',
    nombre: 'Don Luis (Carpintería)',
    telefono: '5555-0002',
    periodo_corte: 'mensual',
    codigo_kiosco: 'LUI-002',
    pin_kiosco: '5678',
    saldo_base: 125.00,
    familiares: [
      { id: 'fam-3', nombre: 'Don Luis', parentesco: 'Titular' }
    ]
  }
];

interface MovimientoUI {
  id: string;
  cliente_id: string;
  persona_nombre: string;
  tipo: 'cargo' | 'abono';
  monto: number;
  fecha_hora: string;
  descripcion_items: string;
  registrado_por: string;
}

export function EstadoCuenta() {
  const { user, activeRole } = useAuthStore();
  const { updatePendingCount } = useOfflineStore();
  
  const [clientes, setClientes] = useState<Cliente[]>(mockClientes);
  const [movimientosLocales, setMovimientosLocales] = useState<MovimientoUI[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  const [vista, setVista] = useState<'lista' | 'detalle' | 'nuevo-cliente' | 'nueva-transaccion' | 'nuevo-familiar'>('lista');

  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', periodo_corte: 'quincenal' as PeriodoCorte, pin_kiosco: '' });
  const [formFamiliar, setFormFamiliar] = useState({ nombre: '', parentesco: '' });
  const [formTx, setFormTx] = useState({ tipo: 'cargo' as 'cargo'|'abono', familiarId: '', monto: '', descripcion: '', fecha: new Date().toISOString().slice(0, 16) });

  useEffect(() => {
    cargarMovimientos();
    
    if (activeRole === 'cliente' && user) {
      const miCuenta = clientes.find(c => c.id === user.id);
      if (miCuenta) {
        setSelectedCliente(miCuenta);
        setVista('detalle');
      }
    } else {
      if (vista !== 'nuevo-cliente' && vista !== 'nueva-transaccion' && vista !== 'nuevo-familiar' && vista !== 'detalle') {
         setVista('lista');
      }
    }
  }, [activeRole, user, clientes, vista]);

  const cargarMovimientos = async () => {
    const movs = await db.movimientos_pendientes.toArray();
    const movsUI: MovimientoUI[] = movs.map(m => {
      const cliente = clientes.find(c => c.id === m.cliente_id);
      const fam = cliente?.familiares.find(f => f.id === m.persona_id);
      return {
        id: m.id || crypto.randomUUID(),
        cliente_id: m.cliente_id,
        persona_nombre: fam?.nombre || 'Desconocido',
        tipo: m.tipo,
        monto: m.monto,
        fecha_hora: m.fecha_hora,
        descripcion_items: m.descripcion_items,
        registrado_por: m.registrado_por
      };
    });
    setMovimientosLocales(movsUI.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()));
  };

  const getSaldoActual = (cliente: Cliente) => {
    const movsCliente = movimientosLocales.filter(m => m.cliente_id === cliente.id);
    let saldo = cliente.saldo_base;
    movsCliente.forEach(m => {
      if (m.tipo === 'cargo') saldo += m.monto;
      else if (m.tipo === 'abono') saldo -= m.monto;
    });
    return saldo;
  };

  const handleCrearCliente = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevoCli: Cliente = {
      id: crypto.randomUUID(),
      nombre: formCliente.nombre,
      telefono: formCliente.telefono,
      periodo_corte: formCliente.periodo_corte,
      codigo_kiosco: formCliente.nombre.substring(0,3).toUpperCase() + '-' + Math.floor(Math.random()*1000).toString().padStart(3, '0'),
      pin_kiosco: formCliente.pin_kiosco || '1234',
      saldo_base: 0,
      familiares: [{ id: crypto.randomUUID(), nombre: formCliente.nombre, parentesco: 'Titular' }]
    };
    setClientes([...clientes, nuevoCli]);
    setVista('lista');
    setFormCliente({ nombre: '', telefono: '', periodo_corte: 'quincenal', pin_kiosco: '' });
  };

  const handleCrearFamiliar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;
    const nuevoFam: Familiar = {
      id: crypto.randomUUID(),
      nombre: formFamiliar.nombre,
      parentesco: formFamiliar.parentesco
    };
    const cliActualizado = { ...selectedCliente, familiares: [...selectedCliente.familiares, nuevoFam] };
    setClientes(clientes.map(c => c.id === cliActualizado.id ? cliActualizado : c));
    setSelectedCliente(cliActualizado);
    setVista('detalle');
    setFormFamiliar({ nombre: '', parentesco: '' });
  };

  const handleGuardarTransaccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente || !user) return;
    
    const nuevoMov = {
      id: crypto.randomUUID(),
      cliente_id: selectedCliente.id,
      persona_id: formTx.familiarId,
      tipo: formTx.tipo,
      monto: parseFloat(formTx.monto),
      fecha_hora: formTx.fecha,
      registrado_por: user.nombre,
      descripcion_items: formTx.descripcion,
      timestamp: Date.now()
    };
    
    await db.movimientos_pendientes.add(nuevoMov);
    await updatePendingCount();
    await cargarMovimientos();
    
    setVista('detalle');
    setFormTx({ tipo: 'cargo', familiarId: '', monto: '', descripcion: '', fecha: new Date().toISOString().slice(0, 16) });
  };

  const formatearMoneda = (monto: number) => `Q${monto.toFixed(2)}`;

  const renderListaClientes = () => {
    const filtrados = clientes.filter(c => 
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.telefono.includes(searchTerm)
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente por nombre o teléfono..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeRole === 'admin' && (
            <button 
              onClick={() => setVista('nuevo-cliente')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors w-full sm:w-auto min-h-[44px]"
            >
              <UserPlus className="w-5 h-5" />
              <span>Nuevo Cliente</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(cliente => (
            <div 
              key={cliente.id} 
              onClick={() => { setSelectedCliente(cliente); setVista('detalle'); }}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group min-h-[44px]"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {cliente.nombre}
                  </h3>
                  <p className="text-sm text-slate-500">{cliente.telefono}</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-500">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Saldo Actual</p>
                  <p className={`text-2xl font-black ${getSaldoActual(cliente) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatearMoneda(getSaldoActual(cliente))}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md font-medium">
                    {cliente.periodo_corte}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No se encontraron clientes con "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDetalleCliente = () => {
    if (!selectedCliente) return null;
    const saldo = getSaldoActual(selectedCliente);
    const movsCliente = movimientosLocales.filter(m => m.cliente_id === selectedCliente.id);
    const isClienteApp = activeRole === 'cliente';

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {!isClienteApp && (
          <button 
            onClick={() => { setVista('lista'); setSelectedCliente(null); }}
            className="flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors min-h-[44px] px-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al listado
          </button>
        )}

        {/* Tarjeta de Saldo Principal */}
        <div className={`p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden ${
          isClienteApp 
            ? 'bg-gradient-to-br from-indigo-600 to-purple-800' 
            : 'bg-gradient-to-br from-slate-800 to-slate-900'
        }`}>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-white/70 font-medium mb-1 flex items-center gap-2">
                <Wallet className="w-5 h-5" /> 
                {isClienteApp ? 'Mi Saldo Actual' : `Saldo de ${selectedCliente.nombre}`}
              </p>
              <h1 className="text-5xl font-black mb-2">{formatearMoneda(saldo)}</h1>
              <p className="text-sm text-white/80 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Corte: {selectedCliente.periodo_corte.replace('_', ' ')}
              </p>
            </div>
            
            {!isClienteApp && (
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button 
                  onClick={() => { setFormTx({...formTx, tipo: 'cargo'}); setVista('nueva-transaccion'); }}
                  className="px-6 py-3 md:py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm min-h-[44px]"
                >
                  <Plus className="w-5 h-5" /> Cargo (Fiado)
                </button>
                <button 
                  onClick={() => { setFormTx({...formTx, tipo: 'abono'}); setVista('nueva-transaccion'); }}
                  className="px-6 py-3 md:py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm min-h-[44px]"
                >
                  <Minus className="w-5 h-5" /> Abono (Pago)
                </button>
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                  <Users className="w-5 h-5 text-purple-500" />
                  Autorizados
                </h3>
                {!isClienteApp && (
                  <button 
                    onClick={() => setVista('nuevo-familiar')}
                    className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors min-h-[44px]"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {selectedCliente.familiares.map(fam => (
                  <div key={fam.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{fam.nombre}</p>
                      <p className="text-xs text-slate-500">{fam.parentesco}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-0 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                  <History className="w-5 h-5 text-blue-500" />
                  Historial de Movimientos
                </h3>
              </div>
              
              {movsCliente.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No hay movimientos registrados para esta cuenta.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                  {movsCliente.map(mov => (
                    <div key={mov.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                      <div className="flex gap-4 items-start w-full sm:w-auto">
                        <div className={`mt-1 p-2 rounded-full shrink-0 ${
                          mov.tipo === 'cargo' 
                            ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' 
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {mov.tipo === 'cargo' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                            {mov.descripcion_items || (mov.tipo === 'cargo' ? 'Compra de productos' : 'Abono a cuenta')}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {mov.persona_nombre}
                            </span>
                            <span>•</span>
                            <span>{new Date(mov.fecha_hora).toLocaleString()}</span>
                            {!isClienteApp && (
                              <>
                                <span>•</span>
                                <span>Por: {mov.registrado_por.split(' ')[0]}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold text-lg shrink-0 ${
                          mov.tipo === 'cargo' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                        {mov.tipo === 'cargo' ? '+' : '-'}{formatearMoneda(mov.monto)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFormCliente = () => (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registrar Nuevo Cliente</h2>
        <button onClick={() => setVista('lista')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleCrearCliente} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
          <input required type="text" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formCliente.nombre} onChange={e => setFormCliente({...formCliente, nombre: e.target.value})} placeholder="Ej. Doña María" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
          <input required type="tel" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formCliente.telefono} onChange={e => setFormCliente({...formCliente, telefono: e.target.value})} placeholder="Ej. 5555-1234" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Período de Corte</label>
          <select className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formCliente.periodo_corte} onChange={e => setFormCliente({...formCliente, periodo_corte: e.target.value as PeriodoCorte})}>
            <option value="quincenal">Quincenal (cada 15 días)</option>
            <option value="quincenal_fijo">Quincenal Fijo (15 y 30)</option>
            <option value="mensual">Mensual (fin de mes)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PIN Kiosco (4 dígitos)</label>
          <input required type="password" maxLength={4} pattern="\d{4}" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formCliente.pin_kiosco} onChange={e => setFormCliente({...formCliente, pin_kiosco: e.target.value})} placeholder="1234" />
        </div>
        <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl mt-4 transition-colors min-h-[44px]">
          Guardar Cliente
        </button>
      </form>
    </div>
  );

  const renderFormFamiliar = () => (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Agregar Familiar</h2>
        <button onClick={() => setVista('detalle')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleCrearFamiliar} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
          <input required type="text" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formFamiliar.nombre} onChange={e => setFormFamiliar({...formFamiliar, nombre: e.target.value})} placeholder="Ej. Anderson" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parentesco</label>
          <input required type="text" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formFamiliar.parentesco} onChange={e => setFormFamiliar({...formFamiliar, parentesco: e.target.value})} placeholder="Ej. Hijo" />
        </div>
        <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl mt-4 transition-colors min-h-[44px]">
          Autorizar Familiar
        </button>
      </form>
    </div>
  );

  const renderFormTransaccion = () => (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {formTx.tipo === 'cargo' ? (
            <><Plus className="w-6 h-6 text-rose-500" /> Nuevo Cargo (Fiado)</>
          ) : (
            <><Minus className="w-6 h-6 text-emerald-500" /> Nuevo Abono (Pago)</>
          )}
        </h2>
        <button onClick={() => setVista('detalle')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <form onSubmit={handleGuardarTransaccion} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">¿Quién {formTx.tipo === 'cargo' ? 'pide el fiado' : 'realiza el pago'}?</label>
          <select required className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formTx.familiarId} onChange={e => setFormTx({...formTx, familiarId: e.target.value})}>
            <option value="" disabled>Seleccione una persona</option>
            {selectedCliente?.familiares.map(fam => (
              <option key={fam.id} value={fam.id}>{fam.nombre} ({fam.parentesco})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto (Q)</label>
          <input required type="number" step="0.01" min="0.01" className="w-full p-3 text-lg font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formTx.monto} onChange={e => setFormTx({...formTx, monto: e.target.value})} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción {formTx.tipo === 'cargo' ? 'de productos' : '(Opcional)'}</label>
          <textarea required={formTx.tipo === 'cargo'} rows={3} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
            value={formTx.descripcion} onChange={e => setFormTx({...formTx, descripcion: e.target.value})} 
            placeholder={formTx.tipo === 'cargo' ? "Ej. 1 lb queso, 1 pan..." : "Ej. Pago parcial quincena"} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha y Hora</label>
          <input required type="datetime-local" className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white min-h-[44px]"
            value={formTx.fecha} onChange={e => setFormTx({...formTx, fecha: e.target.value})} />
        </div>
        
        <button type="submit" className={`w-full py-4 text-white font-bold rounded-xl mt-4 transition-colors min-h-[44px] ${
          formTx.tipo === 'cargo' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
        }`}>
          Guardar {formTx.tipo === 'cargo' ? 'Cargo' : 'Abono'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="w-full h-full pb-10">
      {vista === 'lista' && renderListaClientes()}
      {vista === 'detalle' && renderDetalleCliente()}
      {vista === 'nuevo-cliente' && renderFormCliente()}
      {vista === 'nuevo-familiar' && renderFormFamiliar()}
      {vista === 'nueva-transaccion' && renderFormTransaccion()}
    </div>
  );
}
