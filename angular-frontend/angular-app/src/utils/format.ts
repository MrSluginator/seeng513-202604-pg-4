import { DateRange } from "../models/types";

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export function number2Time(time: number): Date {
  const date = new Date();
  date.setHours(Math.floor(time));
  date.setMinutes((time - Math.floor(time)) * 60);
  return date;
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatTimeRange(time: DateRange): string {
  if (time instanceof Date) return timeFormatter.format(time);
  return `${timeFormatter.format(time.start)} - ${timeFormatter.format(time.end)}`;
}

export function formatNumber(reviews: number): string {
  if (reviews < 1000) return `${reviews}`;
  if (reviews < 1_000_000) return `${(reviews / 1000).toFixed(1)}K`;
  return `${(reviews / 1_000_000).toFixed(1)}M`;
}