'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Calendar, MapPin } from 'lucide-react';

interface Evento {
  id: number;
  cliente_id: number;
  estado: string;
  fecha_inicio_evento: string;
  fecha_fin_evento: string;
  direccion_evento: string;
  gran_total: number;
  cliente: {
    nombre_razon_social: string;
  };
}

interface KanbanBoardProps {
  eventos: Evento[];
  onEventClick: (eventoId: number) => void;
  onEstadoChange: (eventoId: number, nuevoEstado: string) => Promise<void>;
}

const ESTADOS_KANBAN = [
  { id: 'COTIZACION', label: 'Cotización', color: 'rgba(56, 189, 248, 1)' },
  { id: 'CONFIRMADO_RESERVADO', label: 'Confirmado', color: 'rgba(16, 185, 129, 1)' },
  { id: 'EN_TRANSITO', label: 'En Tránsito', color: 'rgba(245, 158, 11, 1)' },
  { id: 'FINALIZADO', label: 'Finalizado', color: 'rgba(16, 185, 129, 1)' },
  { id: 'PAGADO_CERRADO', label: 'Pagado', color: 'rgba(99, 102, 241, 1)' },
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(val);
};

export default function KanbanBoard({ eventos, onEventClick, onEstadoChange }: KanbanBoardProps) {
  const [mounted, setMounted] = useState(false);
  const [optimisticEventos, setOptimisticEventos] = useState<Evento[]>(eventos);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOptimisticEventos(eventos);
  }, [eventos]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const eventoId = Number(draggableId);
    const nuevoEstado = destination.droppableId;
    const oldEstado = source.droppableId;

    // Optimistic UI update
    setOptimisticEventos(prev => 
      prev.map(ev => ev.id === eventoId ? { ...ev, estado: nuevoEstado } : ev)
    );

    try {
      await onEstadoChange(eventoId, nuevoEstado);
    } catch (error) {
      // Rollback
      setOptimisticEventos(prev => 
        prev.map(ev => ev.id === eventoId ? { ...ev, estado: oldEstado } : ev)
      );
    }
  };

  if (!mounted) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tablero...</div>;

  return (
    <div style={{ display: 'flex', gap: '16px', paddingBottom: '16px', minHeight: '600px' }}>
      <DragDropContext onDragEnd={onDragEnd}>
        {ESTADOS_KANBAN.map(col => {
          const colEventos = optimisticEventos.filter(ev => ev.estado === col.id);
          
          return (
            <div key={col.id} style={{
              flex: '1',
              minWidth: '280px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-muted)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-muted)',
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{col.label}</h3>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  {colEventos.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.03)' : 'transparent',
                      transition: 'background 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      minHeight: '150px'
                    }}
                  >
                    {colEventos.map((ev, index) => (
                      <Draggable key={ev.id.toString()} draggableId={ev.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onEventClick(ev.id)}
                            className="glass-card"
                            style={{
                              padding: '16px',
                              cursor: 'grab',
                              transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                              boxShadow: snapshot.isDragging ? '0 10px 25px rgba(0,0,0,0.5)' : undefined,
                              ...provided.draggableProps.style,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{ev.id}</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: col.color }}>
                                {formatCurrency(ev.gran_total)}
                              </span>
                            </div>
                            
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
                              {ev.cliente?.nombre_razon_social}
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <Calendar size={12} />
                                <span>{new Date(ev.fecha_inicio_evento).toLocaleDateString()}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <MapPin size={12} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span style={{ lineHeight: 1.3 }}>{ev.direccion_evento}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}
