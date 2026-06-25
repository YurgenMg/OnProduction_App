'use client';

import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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

interface EventsCalendarProps {
  eventos: Evento[];
  onEventClick: (eventoId: number) => void;
}

const getEventColor = (estado: string) => {
  switch (estado) {
    case 'COTIZACION': return 'var(--color-info)';
    case 'CONFIRMADO_RESERVADO': return 'var(--color-success)';
    case 'EN_TRANSITO': return 'var(--color-warning)';
    case 'FINALIZADO': return 'var(--color-success)';
    case 'PAGADO_CERRADO': return 'var(--accent-primary)';
    default: return 'var(--accent-secondary)';
  }
};

export default function EventsCalendar({ eventos, onEventClick }: EventsCalendarProps) {
  const calendarEvents = eventos.map(ev => ({
    id: ev.id,
    title: `${ev.cliente?.nombre_razon_social} - #${ev.id}`,
    start: new Date(ev.fecha_inicio_evento),
    end: new Date(ev.fecha_fin_evento),
    estado: ev.estado,
    resource: ev
  }));

  const eventStyleGetter = (event: any) => {
    const backgroundColor = getEventColor(event.estado);
    const style = {
      backgroundColor,
      borderRadius: '6px',
      opacity: 0.9,
      color: '#fff',
      border: '0px',
      display: 'block',
      padding: '2px 6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      fontSize: '12px',
      fontWeight: 600,
    };
    return { style };
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px', height: '75vh' }}>
      <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', color: 'var(--text-primary)' }}
        messages={{
          next: 'Sig',
          previous: 'Ant',
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          agenda: 'Agenda',
          date: 'Fecha',
          time: 'Hora',
          event: 'Evento',
          noEventsInRange: 'No hay eventos en este rango.',
        }}
        culture="es"
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event: any) => onEventClick(event.id)}
      />
    </div>
  );
}
