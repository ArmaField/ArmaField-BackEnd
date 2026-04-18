import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Return a human-readable relative time string for the given date. */
export function timeAgo(date: Date, locale?: string): string {
  const now = Date.now();
  const seconds = Math.floor((now - date.getTime()) / 1000);
  const isRu = locale === "ru";

  if (seconds < 60) return isRu ? "только что" : "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    if (isRu) return `${minutes} ${ruPlural(minutes, "минуту", "минуты", "минут")} назад`;
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (isRu) return `${hours} ${ruPlural(hours, "час", "часа", "часов")} назад`;
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    if (isRu) return `${days} ${ruPlural(days, "день", "дня", "дней")} назад`;
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);
  if (isRu) return `${months} ${ruPlural(months, "месяц", "месяца", "месяцев")} назад`;
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/** Russian plural helper: 1 минуту, 2 минуты, 5 минут */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs >= 11 && abs <= 19) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Format a number with dot thousands separators (1.000.000). */
export function fmt(n: number): string {
  return n.toLocaleString("de-DE");
}
