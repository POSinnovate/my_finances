import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';

dayjs.locale('es');
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export default dayjs;

export function formatMovementDetailDate(dateStr: string | Date | null | undefined): {
  dayName: string;
  formattedDate: string;
  timeFormatted: string;
  isRecent: boolean;
} {
  if (!dateStr) {
    return { dayName: '', formattedDate: 'Sin fecha', timeFormatted: '', isRecent: false };
  }

  const d = dayjs(dateStr);
  if (!d.isValid()) {
    return { dayName: '', formattedDate: String(dateStr), timeFormatted: '', isRecent: false };
  }

  const rawDayName = d.format('dddd');
  const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);
  const formattedDate = d.format('D [de] MMMM [de] YYYY');
  const timeFormatted = d.format('h:mm A');

  const diffDays = Math.abs(dayjs().diff(d, 'day'));

  return {
    dayName,
    formattedDate,
    timeFormatted,
    isRecent: diffDays <= 2,
  };
}

export function formatShortDateSpanish(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'Sin fecha';
  const d = dayjs(dateStr);
  if (!d.isValid()) return String(dateStr);

  const today = dayjs().startOf('day');
  const target = d.startOf('day');
  const diffDays = today.diff(target, 'day');

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays === -1) return 'Mañana';

  if (d.year() === dayjs().year()) {
    return d.format('D MMM');
  }
  return d.format('D MMM YYYY');
}
