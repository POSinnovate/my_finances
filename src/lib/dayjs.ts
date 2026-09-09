import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.locale('es');
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export const COLOMBIA_TZ = 'America/Bogota';

export default dayjs;

/**
 * Retorna la fecha actual en formato YYYY-MM-DD en la zona horaria de Colombia.
 */
export function getTodayColombiaDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: COLOMBIA_TZ }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Formatea el detalle completo de un movimiento (día de la semana, fecha en español y hora colombiana).
 */
export function formatMovementDetailDate(
  dateStr: string | Date | null | undefined,
  createdAtStr?: string | Date | null | undefined
): {
  dayName: string;
  formattedDate: string;
  timeFormatted: string;
  isRecent: boolean;
} {
  if (!dateStr) {
    return { dayName: '', formattedDate: 'Sin fecha', timeFormatted: '', isRecent: false };
  }

  // Extraer únicamente YYYY-MM-DD para evitar desplazamientos por desfases UTC
  let ymd = '';
  if (typeof dateStr === 'string') {
    ymd = dateStr.split('T')[0];
  } else if (dateStr instanceof Date) {
    try {
      ymd = new Intl.DateTimeFormat('en-CA', { timeZone: COLOMBIA_TZ }).format(dateStr);
    } catch {
      ymd = dateStr.toISOString().split('T')[0];
    }
  }

  const d = dayjs.tz ? dayjs.tz(ymd, COLOMBIA_TZ) : dayjs(ymd);
  if (!d.isValid()) {
    return { dayName: '', formattedDate: String(dateStr), timeFormatted: '', isRecent: false };
  }

  const rawDayName = d.format('dddd');
  const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);
  const formattedDate = d.format('D [de] MMMM [de] YYYY');

  // La hora se extrae de created_at si está disponible, ajustada a hora colombiana
  let timeFormatted = '';
  const timeSource = createdAtStr || (typeof dateStr === 'string' && dateStr.includes('T') ? dateStr : null);
  if (timeSource) {
    try {
      timeFormatted = dayjs.utc(timeSource).tz(COLOMBIA_TZ).format('h:mm A');
    } catch {
      timeFormatted = dayjs(timeSource).format('h:mm A');
    }
  }

  const todayYmd = getTodayColombiaDate();
  const today = dayjs.tz ? dayjs.tz(todayYmd, COLOMBIA_TZ) : dayjs(todayYmd);
  const diffDays = Math.abs(today.diff(d, 'day'));

  return {
    dayName,
    formattedDate,
    timeFormatted,
    isRecent: diffDays <= 2,
  };
}

/**
 * Formatea fechas cortas legibles en español ('Hoy', 'Ayer', '31 ago', etc.)
 * utilizando la zona horaria colombiana sin desfases de UTC.
 */
export function formatShortDateSpanish(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'Sin fecha';

  let ymd = '';
  if (typeof dateStr === 'string') {
    ymd = dateStr.split('T')[0];
  } else if (dateStr instanceof Date) {
    try {
      ymd = new Intl.DateTimeFormat('en-CA', { timeZone: COLOMBIA_TZ }).format(dateStr);
    } catch {
      ymd = dateStr.toISOString().split('T')[0];
    }
  }

  const d = dayjs.tz ? dayjs.tz(ymd, COLOMBIA_TZ) : dayjs(ymd);
  if (!d.isValid()) return String(dateStr);

  const todayYmd = getTodayColombiaDate();
  const today = dayjs.tz ? dayjs.tz(todayYmd, COLOMBIA_TZ) : dayjs(todayYmd);

  const diffDays = today.diff(d, 'day');

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays === -1) return 'Mañana';

  if (d.year() === today.year()) {
    return d.format('D MMM');
  }
  return d.format('D MMM YYYY');
}
