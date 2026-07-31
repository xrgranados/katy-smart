import Dexie, { type Table } from 'dexie';

// Interfaces de la cola offline
export interface CortePendiente {
  id?: string; // UUID autogenerado temporalmente para reconciliación
  caja_fisica_id: string;
  dependiente_id: string;
  turno: 'manana' | 'tarde';
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  estado: 'abierto' | 'cerrado';
  notas?: string;
  detalles: Array<{ rubro_id: string; monto_contado: number }>;
  pagos: Array<{ proveedor: string; monto: number; descripcion?: string }>;
  timestamp: number;
}

export interface PedidoPendiente {
  id?: string;
  creado_por: string;
  fecha_pedido: string;
  fecha_entrega_estimada?: string;
  estado: 'pendiente' | 'recibido_parcial' | 'recibido_completo' | 'pagado';
  proveedor_nombre: string;
  items: Array<{
    descripcion: string;
    codigo_barras?: string;
    cantidad: number;
    unidad: string;
    precio_unitario: number;
    subtotal: number;
  }>;
  timestamp: number;
}

export interface MovimientoPendiente {
  id?: string;
  cliente_id: string;
  persona_id: string; // Puede ser el cliente principal o un familiar
  tipo: 'cargo' | 'abono';
  monto: number;
  fecha_hora: string;
  registrado_por: string;
  descripcion_items: string;
  timestamp: number;
}

export interface RecepcionPendiente {
  id?: string;
  pedido_id: string;
  cantidad_recibida: number;
  fecha_recepcion: string;
  fecha_pago?: string;
  monto_pagado?: number;
  empresa_despacho?: string;
  registrado_por: string;
  timestamp: number;
}

export interface Notificacion {
  id?: string;
  tipo: 'fiado' | 'oferta' | 'recordatorio_pago' | 'sistema';
  titulo: string;
  mensaje: string;
  destinatario: string; // 'todos' (Todos los clientes), 'dependientes', or client_id (e.g. 'feed0000-cafe-babe-0000-000000000000')
  leida: number; // 0 para no leída, 1 para leída
  fecha: string;
}

// Inicialización de la base de datos Dexie para Katy Smart
export class KatySmartDexie extends Dexie {
  cortes_pendientes!: Table<CortePendiente, string>;
  pedidos_pendientes!: Table<PedidoPendiente, string>;
  movimientos_pendientes!: Table<MovimientoPendiente, string>;
  recepciones_pendientes!: Table<RecepcionPendiente, string>;
  notificaciones!: Table<Notificacion, string>;

  constructor() {
    super('KatySmartDB');
    this.version(1).stores({
      cortes_pendientes: 'id, fecha, turno, timestamp',
      pedidos_pendientes: 'id, proveedor_nombre, timestamp',
      movimientos_pendientes: 'id, cliente_id, timestamp',
      recepciones_pendientes: 'id, pedido_id, timestamp',
      notificaciones: 'id, destinatario, tipo, leida, fecha'
    });
  }
}

export const db = new KatySmartDexie();
