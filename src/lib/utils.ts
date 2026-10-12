import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseLocalDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [year, month, day] = cleanStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  }
  return new Date(dateInput);
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(date: string | Date): string {
  const d = parseLocalDate(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateFull(date: string | Date): string {
  const d = parseLocalDate(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' && !date.includes('T') ? parseLocalDate(date) : new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function getToday(): string {
  return toLocalDateString(new Date());
}

export function getWeekStart(date: string | Date = new Date()): string {
  const d = parseLocalDate(date);
  const day = d.getDay();
  // Monday start: if day is 0 (Sunday), diff is -6; else diff is 1 - day
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return toLocalDateString(monday);
}

export function getWeekEnd(date: string | Date = new Date()): string {
  const monday = parseLocalDate(getWeekStart(date));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return toLocalDateString(sunday);
}

export function isToday(date: string): boolean {
  return date.split('T')[0] === getToday();
}

export function isOverdue(date: string): boolean {
  return date.split('T')[0] < getToday();
}


export function getAreaColor(areaSlug: string): string {
  const colors: Record<string, string> = {
    career: '#3b82f6',
    learning: '#8b5cf6',
    fitness: '#22c55e',
    finance: '#eab308',
    relationships: '#ec4899',
    'personal-projects': '#f97316',
  };
  return colors[areaSlug] || '#6b7280';
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
