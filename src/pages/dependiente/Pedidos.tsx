import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOfflineStore } from '../../store/offlineStore';
import { db, type PedidoPendiente, type RecepcionPendiente } from '../../db/dexie';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Check, 
  Package, 
  Mic, 
  MicOff, 
  Barcode, 
  Truck, 
  CreditCard, 
  X, 
  Layers, 
  Info, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ListPlus
} from 'lucide-react';

interface BarcodeProduct {
  codigo: string;
  descripcion: string;
  precio: number;
  unidad: string;
}

const DEFAULT_CATALOG: BarcodeProduct[] = [
  { codigo: '74010011', descripcion: 'Coca-Cola 1.5L', precio: 12.00, unidad: 'unidades' },
  { codigo: '74011111', descripcion: 'Pan Bimbo Grande', precio: 25.00, unidad: 'unidades' },
  { codigo: '74010101', descripcion: 'Leche Trebol Entera 1L', precio: 10.50, unidad: 'unidades' },
  { codigo: '74012222', descripcion: 'Tortrix Barbacoa', precio: 1.50, unidad: 'unidades' }
];

export const Pedidos: React.FC = () => {
  const { user } = useAuthStore();
  const { isOnline, updatePendingCount } = useOfflineStore();

  // 1. Estados de Pedidos
  const [pedidos, setPedidos] = useState<PedidoPendiente[]>([]);
  const [activeTab, setActiveTab] = useState<'pendiente' | 'recibido' | 'pagado'>('pendiente');
  const [selectedPedido, setSelectedPedido] = useState<PedidoPendiente | null>(null);

  // 2. Formulario de Creación de Pedido
  const [proveedor, setProveedor] = useState<string>('');
  const [fechaEntrega, setFechaEntrega] = useState<string>('');
  const [items, setItems] = useState<Array<{
    descripcion: string;
    codigo_barras?: string;
    cantidad: number;
    unidad: string;
    precio_unitario: number;
    subtotal: number;
  }>>([]);

  // Campos para nuevo item manual
  const [nuevoItemDesc, setNuevoItemDesc] = useState<string>('');
  const [nuevoItemCant, setNuevoItemCant] = useState<number>(1);
  const [nuevoItemUnidad, setNuevoItemUnidad] = useState<string>('unidades');
  const [nuevoItemPrecio, setNuevoItemPrecio] = useState<number>(0);
  const [nuevoItemCodigo, setNuevoItemCodigo] = useState<string>('');

  // 3. Catálogo de Código de Barras Dinámico
  const [catalogo, setCatalogo] = useState<BarcodeProduct[]>(() => {
    const saved = localStorage.getItem('katy_smart_catalog');
    return saved ? JSON.parse(saved) : DEFAULT_CATALOG;
  });

  // Historial de empresas/repartidores para autocompletado
  const [repartidores, setRepartidores] = useState<string[]>(() => {
    const saved = localStorage.getItem('katy_smart_repartidores');
    return saved ? JSON.parse(saved) : ['Repartidor Coca-Cola (Juan)', 'Distribuidora El Sol', 'Camión Bimbo', 'Sonia Express'];
  });

  // Autocompletado de proveedores
  const proveedoresSugeridos = ['Coca-Cola', 'Bimbo', 'Dicana', 'Cervecería Centro Americana', 'Pepsico', 'La Unica', 'Nestlé'];

  // 4. Estados de Dictado de Voz (Web Speech API)
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  
  // Entrada manual para simulación / fallback de voz
  const [textVoiceFallback, setTextVoiceFallback] = useState<string>('');
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);

  // 5. Estado de Escáner de Código de Barras
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [manualBarcodeScan, setManualBarcodeScan] = useState<string>('');
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [newProductDesc, setNewProductDesc] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<number>(0);
  const [newProductUnit, setNewProductUnit] = useState<string>('unidades');

  // 6. Formulario de Recepción y Pago
  const [fechaPago, setFechaPago] = useState<string>(new Date().toISOString().split('T')[0]);
  const [repartidorNombre, setRepartidorNombre] = useState<string>('');
  const [montoPagado, setMontoPagado] = useState<number>(0);
  const [recepcionItems, setRecepcionItems] = useState<{ [key: number]: number }>({});
  const [showRecepcionModal, setShowRecepcionModal] = useState<boolean>(false);

  // Toast UI
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar Pedidos y llenar semilla si está vacío
  const loadPedidos = async () => {
    try {
      let lista = await db.pedidos_pendientes.toArray();
      if (lista.length === 0) {
        // Semilla inicial de demostración elegante si no hay registros
        const semilla: PedidoPendiente[] = [
          {
            id: 'pedido-mock-1',
            creado_por: 'Sonia - Dependiente',
            fecha_pedido: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_entrega_estimada: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estado: 'pendiente',
            proveedor_nombre: 'Coca-Cola',
            items: [
              { descripcion: 'Coca-Cola 1.5L', codigo_barras: '74010011', cantidad: 10, unidad: 'unidades', precio_unitario: 12.00, subtotal: 120.00 },
              { descripcion: 'Tortrix Barbacoa', codigo_barras: '74012222', cantidad: 50, unidad: 'unidades', precio_unitario: 1.50, subtotal: 75.00 }
            ],
            timestamp: Date.now() - 24 * 60 * 60 * 1000
          },
          {
            id: 'pedido-mock-2',
            creado_por: 'Don Carlos - Admin',
            fecha_pedido: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_entrega_estimada: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estado: 'recibido_completo',
            proveedor_nombre: 'Bimbo',
            items: [
              { descripcion: 'Pan Bimbo Grande', codigo_barras: '74011111', cantidad: 15, unidad: 'unidades', precio_unitario: 25.00, subtotal: 375.00 }
            ],
            timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000
          },
          {
            id: 'pedido-mock-3',
            creado_por: 'Don Carlos - Admin',
            fecha_pedido: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_entrega_estimada: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estado: 'pagado',
            proveedor_nombre: 'Dicana',
            items: [
              { descripcion: 'Leche Trebol Entera 1L', codigo_barras: '74010101', cantidad: 24, unidad: 'unidades', precio_unitario: 10.50, subtotal: 252.00 }
            ],
            timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000
          }
        ];
        for (const item of semilla) {
          await db.pedidos_pendientes.add(item);
        }
        lista = await db.pedidos_pendientes.toArray();
        await updatePendingCount();
      }
      setPedidos(lista);
    } catch (e) {
      console.error('Error cargando pedidos en Dexie:', e);
    }
  };

  useEffect(() => {
    loadPedidos();

    // Validar soporte de Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Persistir cambios de catálogo dinámico en localStorage
  useEffect(() => {
    localStorage.setItem('katy_smart_catalog', JSON.stringify(catalogo));
  }, [catalogo]);

  // Persistir repartidores sugeridos en localStorage
  useEffect(() => {
    localStorage.setItem('katy_smart_repartidores', JSON.stringify(repartidores));
  }, [repartidores]);

  // CALCULO DE TOTALES CREACION
  const totalCreacion = items.reduce((sum, item) => sum + item.subtotal, 0);

  // AGREGAR ITEM MANUAL
  const handleAgregarItemManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoItemDesc.trim()) {
      alert('Por favor introduce la descripción del producto.');
      return;
    }
    if (nuevoItemCant <= 0 || nuevoItemPrecio < 0) {
      alert('Ingresa cantidades y precios válidos.');
      return;
    }

    const item = {
      descripcion: nuevoItemDesc.trim(),
      codigo_barras: nuevoItemCodigo ? nuevoItemCodigo.trim() : undefined,
      cantidad: nuevoItemCant,
      unidad: nuevoItemUnidad,
      precio_unitario: nuevoItemPrecio,
      subtotal: nuevoItemCant * nuevoItemPrecio
    };

    setItems([...items, item]);
    // Limpiar campos individuales
    setNuevoItemDesc('');
    setNuevoItemCant(1);
    setNuevoItemUnidad('unidades');
    setNuevoItemPrecio(0);
    setNuevoItemCodigo('');
    showToast('🛒 Ítem agregado al pedido.');
  };

  // QUITAR ITEM
  const handleQuitarItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // PARSER DE VOZ / TEXTO INTELIGENTE
  const parseVoicePhrase = (phrase: string) => {
    const cleanPhrase = phrase.toLowerCase().trim();
    
    // Diccionario de números en español
    const numberWords: { [key: string]: number } = {
      "un": 1, "uno": 1, "una": 1, "un fardo": 1, "un fardo de": 1,
      "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
      "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
      "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
      "veinte": 20, "treinta": 30, "cuarenta": 40, "cincuenta": 50, "cien": 100
    };

    const unitWords: { [key: string]: string } = {
      "caja": "cajas", "cajas": "cajas",
      "fardo": "fardos", "fardos": "fardos",
      "libra": "libras", "libras": "libras",
      "unidad": "unidades", "unidades": "unidades",
      "paquete": "cajas", "paquetes": "cajas"
    };

    let cantidad = 1;
    let unidad = "unidades";
    let descripcion = phrase;

    const words = cleanPhrase.split(/\s+/);
    if (words.length > 0) {
      let index = 0;
      const firstWord = words[0];
      
      // Intentar parsear número
      if (/^\d+$/.test(firstWord)) {
        cantidad = parseInt(firstWord, 10);
        index = 1;
      } else if (numberWords[firstWord] !== undefined) {
        cantidad = numberWords[firstWord];
        index = 1;
      }

      if (index < words.length) {
        const nextWord = words[index];
        // Verificar si la siguiente palabra es una unidad
        if (unitWords[nextWord] !== undefined) {
          unidad = unitWords[nextWord];
          index++;
          // Saltar el "de" si existe (ej. "dos cajas de cloro")
          if (index < words.length && words[index] === "de") {
            index++;
          }
        } else if (nextWord === "de") {
          index++;
        }
      }

      // El resto de la cadena es la descripción
      if (index < words.length) {
        descripcion = words.slice(index).join(" ");
      }
    }

    // Capitalizar la descripción
    descripcion = descripcion.charAt(0).toUpperCase() + descripcion.slice(1);

    // Estimación dinámica de precio inteligente en base a descripción conocida
    let precio_unitario = 10.0;
    const lowerDesc = descripcion.toLowerCase();
    
    // Buscar si ya existe en el catálogo para autocompletar precio y unidad
    const catalogoCoincidencia = catalogo.find(p => lowerDesc.includes(p.descripcion.toLowerCase()) || p.descripcion.toLowerCase().includes(lowerDesc));
    if (catalogoCoincidencia) {
      precio_unitario = catalogoCoincidencia.precio;
      unidad = catalogoCoincidencia.unidad;
    } else {
      // Ajuste semántico simple si no está en catálogo
      if (lowerDesc.includes("cloro")) {
        precio_unitario = 8.5;
      } else if (lowerDesc.includes("jugo") || lowerDesc.includes("kerns")) {
        precio_unitario = 5.0;
      } else if (lowerDesc.includes("coca") || lowerDesc.includes("cola")) {
        precio_unitario = 12.0;
      } else if (lowerDesc.includes("pan") || lowerDesc.includes("bimbo")) {
        precio_unitario = 25.0;
      } else if (lowerDesc.includes("leche")) {
        precio_unitario = 10.50;
      }
    }

    return {
      descripcion,
      cantidad,
      unidad,
      precio_unitario,
      subtotal: cantidad * precio_unitario
    };
  };

  // PROCESAR ENTRADA DE VOZ (O FALLBACK)
  const handleProcesarFraseVoz = (frase: string) => {
    if (!frase.trim()) return;
    const itemParseado = parseVoicePhrase(frase);
    setItems([...items, itemParseado]);
    showToast(`🎙️ Añadido por voz: ${itemParseado.cantidad} ${itemParseado.unidad} de "${itemParseado.descripcion}"`);
    setTextVoiceFallback('');
    setVoiceTranscript('');
  };

  // DICTADO DE VOZ REAL (Web Speech API)
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-GT'; // Español Guatemala / LatAm
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(null);
      setVoiceTranscript('Escuchando...');
    };

    recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
      setVoiceError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setVoiceTranscript(resultText);
      handleProcesarFraseVoz(resultText);
    };

    recognition.start();
  };

  // SIMULACIÓN DE ESCANEO DE BARRAS
  const handleSimulateScan = (codigo: string) => {
    setManualBarcodeScan(codigo);
    
    // Buscar en catálogo dinámico
    const producto = catalogo.find(p => p.codigo === codigo);
    if (producto) {
      // Registrar de inmediato
      const itemExistente = items.find(i => i.codigo_barras === codigo);
      if (itemExistente) {
        // Incrementar cantidad
        setItems(items.map(i => i.codigo_barras === codigo ? {
          ...i,
          cantidad: i.cantidad + 1,
          subtotal: (i.cantidad + 1) * i.precio_unitario
        } : i));
        showToast(`➕ Se incrementó la cantidad de "${producto.descripcion}" a ${itemExistente.cantidad + 1}`);
      } else {
        // Agregar nuevo ítem
        const nuevo = {
          descripcion: producto.descripcion,
          codigo_barras: producto.codigo,
          cantidad: 1,
          unidad: producto.unidad,
          precio_unitario: producto.precio,
          subtotal: producto.precio
        };
        setItems([...items, nuevo]);
        showToast(`🎯 Escaneado con éxito: "${producto.descripcion}"`);
      }
      setShowScanner(false);
      setManualBarcodeScan('');
    } else {
      // Código desconocido, abrir formulario de registro en catálogo dinámico inteligente
      setUnknownBarcode(codigo);
      setNewProductDesc('');
      setNewProductPrice(0);
      setNewProductUnit('unidades');
    }
  };

  // AGREGAR CÓDIGO NUEVO AL CATÁLOGO DINÁMICO
  const handleGuardarNuevoProductoCatalogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unknownBarcode || !newProductDesc.trim()) {
      alert('Por favor introduce la descripción del producto.');
      return;
    }

    const nuevoProducto: BarcodeProduct = {
      codigo: unknownBarcode,
      descripcion: newProductDesc.trim(),
      precio: newProductPrice,
      unidad: newProductUnit
    };

    // Actualizar catálogo dinámico
    const nuevoCatalogo = [...catalogo, nuevoProducto];
    setCatalogo(nuevoCatalogo);

    // Agregar al pedido actual
    const nuevoItem = {
      descripcion: nuevoProducto.descripcion,
      codigo_barras: nuevoProducto.codigo,
      cantidad: 1,
      unidad: nuevoProducto.unidad,
      precio_unitario: nuevoProducto.precio,
      subtotal: nuevoProducto.precio
    };
    setItems([...items, nuevoItem]);

    showToast(`💾 "${nuevoProducto.descripcion}" guardado en el Catálogo Dinámico e ingresado al pedido.`);
    
    // Resetear estados
    setUnknownBarcode(null);
    setShowScanner(false);
    setManualBarcodeScan('');
  };

  // GUARDAR PEDIDO COMPLETO (Offline-First)
  const handleGuardarPedidoCompleto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedor.trim()) {
      alert('Por favor introduce el nombre del proveedor.');
      return;
    }
    if (items.length === 0) {
      alert('Por favor agrega al menos un ítem a la lista de compras.');
      return;
    }

    try {
      const pedidoId = crypto.randomUUID();
      const nuevoPedido: PedidoPendiente = {
        id: pedidoId,
        creado_por: user?.nombre || 'Sonia - Dependiente',
        fecha_pedido: new Date().toISOString().split('T')[0],
        fecha_entrega_estimada: fechaEntrega || undefined,
        estado: 'pendiente',
        proveedor_nombre: proveedor.trim(),
        items: items,
        timestamp: Date.now()
      };

      // Guardar en Dexie DB
      await db.pedidos_pendientes.add(nuevoPedido);
      await updatePendingCount();

      // Recargar lista y limpiar
      await loadPedidos();
      setProveedor('');
      setFechaEntrega('');
      setItems([]);
      
      showToast(
        isOnline 
          ? '🚀 Pedido creado y subido con éxito.' 
          : '📝 Guardado offline en Dexie DB. Se sincronizará automáticamente al conectar.'
      );
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error al guardar el pedido en IndexedDB.');
    }
  };

  // PREPARAR RECEPCIÓN
  const handleIniciarRecepcion = (pedido: PedidoPendiente) => {
    setSelectedPedido(pedido);
    setMontoPagado(pedido.items.reduce((sum, i) => sum + i.subtotal, 0));
    setRepartidorNombre('');
    
    // Inicializar cantidades recibidas con la cantidad original
    const cantidades: { [key: number]: number } = {};
    pedido.items.forEach((item, index) => {
      cantidades[index] = item.cantidad;
    });
    setRecepcionItems(cantidades);
    setShowRecepcionModal(true);
  };

  // GUARDAR RECEPCIÓN (Y PAGO OPCIONAL)
  const handleConfirmarRecepcion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPedido) return;

    try {
      // Contar cantidades recibidas totales
      let totalRecibidoCantidad = 0;
      Object.values(recepcionItems).forEach(qty => {
        totalRecibidoCantidad += qty;
      });

      // Crear registro de recepción pendiente
      const recepcionId = crypto.randomUUID();
      const nuevaRecepcion: RecepcionPendiente = {
        id: recepcionId,
        pedido_id: selectedPedido.id || '',
        cantidad_recibida: totalRecibidoCantidad,
        fecha_recepcion: new Date().toISOString().split('T')[0],
        fecha_pago: fechaPago || undefined,
        monto_pagado: montoPagado || undefined,
        empresa_despacho: repartidorNombre.trim() || undefined,
        registrado_por: user?.nombre || 'Sonia - Dependiente',
        timestamp: Date.now()
      };

      // Guardar recepcion en Dexie
      await db.recepciones_pendientes.add(nuevaRecepcion);

      // Determinar nuevo estado del pedido
      // Si hay fecha de pago y monto pagado, pasamos directo a 'pagado'. Si no, 'recibido_completo'
      const nuevoEstado: 'recibido_completo' | 'pagado' = (fechaPago && montoPagado > 0) ? 'pagado' : 'recibido_completo';

      // Actualizar el estado del pedido en Dexie
      if (selectedPedido.id) {
        await db.pedidos_pendientes.update(selectedPedido.id, {
          estado: nuevoEstado
        });
      }

      // Si se ingresó un repartidor nuevo, agregarlo al historial de autocompletado
      if (repartidorNombre.trim() && !repartidores.includes(repartidorNombre.trim())) {
        setRepartidores([...repartidores, repartidorNombre.trim()]);
      }

      await updatePendingCount();
      await loadPedidos();
      setShowRecepcionModal(false);
      setSelectedPedido(null);
      
      showToast(
        isOnline 
          ? `📦 Pedido recibido y registrado como ${nuevoEstado === 'pagado' ? 'Pagado' : 'Recibido'}.`
          : '📝 Recepción guardada localmente (Offline). Se sincronizará al recuperar señal.'
      );
    } catch (e) {
      console.error(e);
      alert('Error al registrar la recepción del pedido.');
    }
  };

  // Filtrar pedidos por pestañas
  const pedidosFiltrados = pedidos.filter(p => {
    if (activeTab === 'pendiente') return p.estado === 'pendiente' || p.estado === 'recibido_parcial';
    if (activeTab === 'recibido') return p.estado === 'recibido_completo';
    return p.estado === 'pagado';
  });

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 bg-purple-900 text-purple-100 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 border border-purple-700 transition-all">
          <Check className="w-5 h-5 text-emerald-400 animate-bounce" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-purple-500/25 rounded-xl border border-purple-500/30">
              <Package className="w-6 h-6 text-purple-300" />
            </span>
            <h2 className="text-2xl font-black tracking-tight">Módulo de Pedidos & Recepción</h2>
          </div>
          <p className="text-sm text-purple-200">
            Administra compras, controla la entrada de mercadería mediante códigos de barra, y agiliza el inventario dictando pedidos por voz.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Catálogo Dinámico Activo
          </span>
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-500/20">
            Fase 2 Desarrollada
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DE COMPRAS & CARGA */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <ListPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Nueva Lista de Compras</h3>
              </div>
              <div className="flex gap-2">
                {/* Botón de Escáner */}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-purple-100 hover:text-purple-600 transition-colors flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"
                  title="Escanear Código de Barras"
                >
                  <Barcode className="w-4 h-4" />
                  <span className="hidden sm:inline">Escanear</span>
                </button>

                {/* Botón de Voz */}
                <button
                  type="button"
                  onClick={() => setShowVoiceModal(true)}
                  className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40 hover:bg-purple-100 transition-colors flex items-center space-x-1.5 text-xs font-bold"
                  title="Dictado de compras por Voz"
                >
                  <Mic className="w-4 h-4" />
                  <span>Dictar por Voz</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleGuardarPedidoCompleto} className="space-y-6">
              {/* Proveedor y Fecha Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Nombre del Proveedor
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      placeholder="Ej. Coca-Cola, Bimbo, etc."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      required
                    />
                    {proveedor && !proveedoresSugeridos.includes(proveedor) && (
                      <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center">
                        <button
                          type="button"
                          onClick={() => setProveedor('')}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Sugerencias de Proveedores */}
                  {proveedor === '' && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {proveedoresSugeridos.map(prov => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => setProveedor(prov)}
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 hover:text-purple-600 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-400 rounded-md transition-colors"
                        >
                          {prov}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Fecha Entrega Estimada (Opcional)
                  </label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Agregar Ítem Manual */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/70 space-y-4">
                <div className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ingresar Ítem a la Lista</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Descripción del Producto</label>
                    <input
                      type="text"
                      value={nuevoItemDesc}
                      onChange={(e) => setNuevoItemDesc(e.target.value)}
                      placeholder="Ej. Cloro Magiablanca, Jugos Kerns"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Cant.</label>
                      <input
                        type="number"
                        min="1"
                        value={nuevoItemCant}
                        onChange={(e) => setNuevoItemCant(parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Unidad</label>
                      <select
                        value={nuevoItemUnidad}
                        onChange={(e) => setNuevoItemUnidad(e.target.value)}
                        className="w-full px-1.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="unidades">unidades</option>
                        <option value="cajas">cajas</option>
                        <option value="fardos">fardos</option>
                        <option value="libras">libras</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">P. Unitario</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={nuevoItemPrecio}
                        onChange={(e) => setNuevoItemPrecio(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500 text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Código de barras opcional:{' '}
                    <input
                      type="text"
                      placeholder="Ninguno"
                      value={nuevoItemCodigo}
                      onChange={(e) => setNuevoItemCodigo(e.target.value)}
                      className="px-2 py-0.5 max-w-[120px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAgregarItemManual}
                    className="px-4 py-2 bg-slate-900 dark:bg-purple-900 hover:bg-slate-800 dark:hover:bg-purple-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>
              </div>

              {/* LISTA DE ÍTEMS EN EL PEDIDO ACTUAL */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Artículos en el Pedido ({items.length})
                </div>

                {items.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-400 dark:text-slate-500 space-y-1">
                    <Package className="w-8 h-8 mx-auto stroke-1" />
                    <p className="text-xs font-medium">La lista de compras está vacía.</p>
                    <p className="text-[10px]">Usa el dictado por voz, escáner, o escribe arriba para agregar ítems.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 dark:border-slate-800/60 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800 dark:text-white">{item.descripcion}</p>
                          <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
                            <span>{item.cantidad} {item.unidad}</span>
                            <span>•</span>
                            <span>Q{item.precio_unitario.toFixed(2)} c/u</span>
                            {item.codigo_barras && (
                              <>
                                <span>•</span>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.5 rounded text-[9px] font-mono flex items-center gap-0.5">
                                  <Barcode className="w-2.5 h-2.5" /> {item.codigo_barras}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-bold text-slate-700 dark:text-purple-300">
                            Q{item.subtotal.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuitarItem(idx)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 rounded-lg text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Fila de Total */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-900/80 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Total Estimado del Pedido:</span>
                      <span className="text-base font-black text-purple-600 dark:text-purple-400">
                        Q{totalCreacion.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Guardar pedido button */}
              <button
                type="submit"
                disabled={items.length === 0}
                className={`w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md ${
                  items.length === 0 
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none' 
                    : 'bg-purple-600 dark:bg-purple-900 hover:bg-purple-700 dark:hover:bg-purple-800'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {isOnline 
                    ? 'Guardar & Enviar Pedido (Online)' 
                    : 'Guardar Pedido Offline (Dexie DB)'}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL / KANBAN & ACCIONES */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Historial de Pedidos</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                {pedidos.length} en total
              </span>
            </div>

            {/* PESTAÑAS DE ESTADO (KANBAN TABS) */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('pendiente')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'pendiente' 
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setActiveTab('recibido')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'recibido' 
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Recibidos
              </button>
              <button
                onClick={() => setActiveTab('pagado')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'pagado' 
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pagados
              </button>
            </div>

            {/* LISTADO DE PEDIDOS */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {pedidosFiltrados.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-400 dark:text-slate-500">
                  <Info className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 stroke-1 mb-2" />
                  <p className="text-xs font-medium">No hay pedidos en este estado.</p>
                  <p className="text-[10px]">Crea uno nuevo en el panel de la izquierda.</p>
                </div>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const totalPedido = pedido.items.reduce((sum, item) => sum + item.subtotal, 0);
                  return (
                    <div 
                      key={pedido.id} 
                      className={`p-4 rounded-xl border transition-all hover:border-purple-200 dark:hover:border-purple-900 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 shadow-sm relative group`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {pedido.proveedor_nombre}
                            </span>
                            {pedido.id?.startsWith('pedido-mock-') && (
                              <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded font-mono uppercase">demo</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span>Ref: #{pedido.id?.substring(0, 8)}</span>
                            <span>•</span>
                            <span>{pedido.fecha_pedido}</span>
                          </p>
                        </div>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          Q{totalPedido.toFixed(2)}
                        </span>
                      </div>

                      {/* Items resumidos */}
                      <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                        {pedido.items.slice(0, 2).map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="truncate max-w-[150px]">{item.descripcion}</span>
                            <span className="font-medium text-slate-400">{item.cantidad} {item.unidad}</span>
                          </div>
                        ))}
                        {pedido.items.length > 2 && (
                          <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold pt-0.5 text-right">
                            + {pedido.items.length - 2} productos más...
                          </p>
                        )}
                      </div>

                      {/* Info adicional / Acción */}
                      <div className="mt-4 flex items-center justify-between text-[11px] border-t border-slate-100 dark:border-slate-800/70 pt-3">
                        <div className="text-slate-400">
                          {pedido.estado === 'pendiente' && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Pendiente Recepción
                            </span>
                          )}
                          {pedido.estado === 'recibido_completo' && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                              Recibido (Sin pagar)
                            </span>
                          )}
                          {pedido.estado === 'pagado' && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Recibido y Pagado
                            </span>
                          )}
                        </div>

                        {pedido.estado === 'pendiente' && (
                          <button
                            type="button"
                            onClick={() => handleIniciarRecepcion(pedido)}
                            className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-900/50 text-xs font-bold transition-all flex items-center space-x-1"
                          >
                            <span>Recibir Mercadería</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL DE DICTADO POR VOZ (INTEGRAL CON ROBUSTO FALLBACK) ================= */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mic className="w-5 h-5 text-purple-300" />
                <h4 className="font-bold text-base">Dictado de Compras Inteligente</h4>
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="p-1 hover:bg-white/15 rounded-lg text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* DICTADO REAL */}
              {speechSupported ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                        isListening 
                          ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30 ring-4 ring-rose-500/20' 
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 hover:bg-purple-200'
                      }`}
                    >
                      {isListening ? (
                        <MicOff className="w-8 h-8 animate-bounce" />
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {isListening ? '🎙️ Escuchando... Di algo como:' : 'Pulsa el botón para iniciar'}
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      "dos fardos de jugos kerns", "un pan bimbo grande" o "5 cloro"
                    </p>
                  </div>

                  {voiceTranscript && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-semibold text-purple-800 dark:text-purple-300 font-mono">
                      "{voiceTranscript}"
                    </div>
                  )}

                  {voiceError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1 justify-center">
                      <AlertCircle className="w-4 h-4" /> {voiceError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold">Reconocimiento por voz no soportado en este navegador.</span> 
                    <p className="mt-1">
                      No te preocupes, abajo puedes probar la potencia del motor de dictado escribiendo la frase directamente. ¡La procesará de la misma forma!
                    </p>
                  </div>
                </div>
              )}

              {/* FALLBACK PROCESADOR TEXTO-VOZ */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Simulador / Fallback de Procesador de Voz (Escribir frase)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textVoiceFallback}
                    onChange={(e) => setTextVoiceFallback(e.target.value)}
                    placeholder="Escribe ej: un fardo de jugos kerns"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleProcesarFraseVoz(textVoiceFallback);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleProcesarFraseVoz(textVoiceFallback)}
                    className="px-4 py-2 bg-slate-900 dark:bg-purple-900 hover:bg-slate-800 dark:hover:bg-purple-800 text-white text-xs font-bold rounded-xl"
                  >
                    Procesar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setTextVoiceFallback('dos cloro magiablanca')}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-600 dark:text-slate-400 rounded"
                  >
                    "dos cloro magiablanca"
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextVoiceFallback('un fardo de jugos kerns')}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-600 dark:text-slate-400 rounded"
                  >
                    "un fardo de jugos kerns"
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextVoiceFallback('12 unidades de Tortrix Barbacoa')}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] text-slate-600 dark:text-slate-400 rounded"
                  >
                    "12 unidades de Tortrix Barbacoa"
                  </button>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowVoiceModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold rounded-xl"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL DE ESCANER DE CÓDIGO DE BARRAS (INTERACTIVO/DEMO) ================= */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-purple-300" />
                <h4 className="font-bold text-base">Escáner de Código de Barras PWA</h4>
              </div>
              <button
                onClick={() => {
                  setShowScanner(false);
                  setUnknownBarcode(null);
                }}
                className="p-1 hover:bg-white/15 rounded-lg text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {!unknownBarcode ? (
                <div className="space-y-6">
                  {/* Visor de Cámara de Simulación */}
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-purple-500 shadow-inner flex flex-col items-center justify-center">
                    
                    {/* Línea Láser Animada */}
                    <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse top-1/2 -translate-y-1/2"></div>
                    
                    {/* Guía Cuadrada */}
                    <div className="w-48 h-20 border-2 border-dashed border-white/50 rounded flex items-center justify-center">
                      <span className="text-[10px] text-white/60 font-mono tracking-wider">Alinea el código</span>
                    </div>

                    <div className="absolute bottom-3 text-[10px] text-emerald-400 bg-black/60 px-2 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Simulador de Cámara Activo
                    </div>
                  </div>

                  {/* Manual Barcode Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">
                      Ingresar Código Manual o Escaneado:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualBarcodeScan}
                        onChange={(e) => setManualBarcodeScan(e.target.value)}
                        placeholder="Ej. 74010011 o cualquiera"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSimulateScan(manualBarcodeScan);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSimulateScan(manualBarcodeScan)}
                        className="px-4 py-2 bg-purple-600 dark:bg-purple-900 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                      >
                        Escuchar
                      </button>
                    </div>
                  </div>

                  {/* Códigos Demo Rápidos */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                      Selecciona un código de demostración:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      {catalogo.map(prod => (
                        <button
                          key={prod.codigo}
                          type="button"
                          onClick={() => handleSimulateScan(prod.codigo)}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-slate-700/60 rounded-xl text-left text-xs transition-colors flex flex-col"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{prod.descripcion}</span>
                          <span className="font-mono text-[9px] text-slate-400 mt-0.5">{prod.codigo} (Q{prod.precio})</span>
                        </button>
                      ))}
                      
                      {/* Código Desconocido de Prueba */}
                      <button
                        type="button"
                        onClick={() => handleSimulateScan('74019999')}
                        className="p-2.5 bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-dashed border-rose-200 dark:border-rose-900/30 rounded-xl text-left text-xs transition-colors flex flex-col"
                      >
                        <span className="font-bold text-rose-700 dark:text-rose-400 truncate">Código Desconocido</span>
                        <span className="font-mono text-[9px] text-rose-400 mt-0.5">74019999 (No Registrado)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* REGISTRO DINÁMICO EN EL CATÁLOGO INTELIGENTE */
                <form onSubmit={handleGuardarNuevoProductoCatalogo} className="space-y-4">
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 text-xs rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-2">
                    <Info className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="font-bold">¡Código Desconocido Detectado!</span>
                      <p className="mt-0.5">Introduce la descripción y el precio del artículo para agregarlo a tu <strong>Catálogo Inteligente</strong>.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Código Detectado</label>
                    <input
                      type="text"
                      readOnly
                      value={unknownBarcode}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-mono text-xs cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Descripción del Producto *</label>
                    <input
                      type="text"
                      required
                      value={newProductDesc}
                      onChange={(e) => setNewProductDesc(e.target.value)}
                      placeholder="Ej. Jugo Kerns Durazno 330ml"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Precio Sugerido (Q) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500 text-center"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Unidad de Compra</label>
                      <select
                        value={newProductUnit}
                        onChange={(e) => setNewProductUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="unidades">unidades</option>
                        <option value="cajas">cajas</option>
                        <option value="fardos">fardos</option>
                        <option value="libras">libras</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUnknownBarcode(null)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                    >
                      Volver a Escanear
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                    >
                      Registrar & Agregar
                    </button>
                  </div>
                </form>
              )}

            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setShowScanner(false);
                  setUnknownBarcode(null);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 text-xs font-bold rounded-xl"
              >
                Cerrar Escáner
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL DE RECEPCIÓN Y PAGO DE PEDIDO ================= */}
      {showRecepcionModal && selectedPedido && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-in">
            
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-purple-300" />
                <h4 className="font-bold text-base">Recepción de Pedido: {selectedPedido.proveedor_nombre}</h4>
              </div>
              <button
                onClick={() => {
                  setShowRecepcionModal(false);
                  setSelectedPedido(null);
                }}
                className="p-1 hover:bg-white/15 rounded-lg text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarRecepcion} className="p-6 space-y-6">
              
              {/* LISTA DE ITEMS PARA CONSOLIDAR CANTIDADES RECIBIDAS */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Verificar cantidades de mercadería recibida:
                </span>
                
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPedido.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/40 dark:bg-slate-950/20 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{item.descripcion}</p>
                        <p className="text-[10px] text-slate-400">Pedido original: {item.cantidad} {item.unidad}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-semibold text-slate-400">Recibido:</span>
                        <input
                          type="number"
                          min="0"
                          value={recepcionItems[idx] !== undefined ? recepcionItems[idx] : item.cantidad}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setRecepcionItems({
                              ...recepcionItems,
                              [idx]: isNaN(val) ? 0 : val
                            });
                          }}
                          className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-center text-xs font-bold text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-400 text-[11px]">{item.unidad}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REPARTIDOR / EMPRESA QUE DESPACHÓ */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">
                  Nombre del Repartidor / Empresa que entregó
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={repartidorNombre}
                    onChange={(e) => setRepartidorNombre(e.target.value)}
                    placeholder="Ej. Don Juan (Camión Coca-Cola)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                {/* Repartidores sugeridos */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {repartidores.slice(0, 4).map(rep => (
                    <button
                      key={rep}
                      type="button"
                      onClick={() => setRepartidorNombre(rep)}
                      className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-[9px] text-slate-500 dark:text-slate-400 hover:text-purple-600 rounded border border-slate-200 dark:border-slate-700"
                    >
                      {rep}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECCIÓN DE FECHA Y MONTO DE PAGO */}
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl space-y-4">
                <div className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center space-x-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Registrar Pago (Opcional - Si se pagó al momento)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-purple-400 uppercase block">Fecha de Pago</label>
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-purple-400 uppercase block">Monto Pagado (Q)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={montoPagado}
                      onChange={(e) => setMontoPagado(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecepcionModal(false);
                    setSelectedPedido(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Confirmar Recepción
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
