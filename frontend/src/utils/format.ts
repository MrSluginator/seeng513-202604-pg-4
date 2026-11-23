import { Time } from '../models/time.schema';

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

export function formatTimeRange(time: Time): string {
  if (time.start_time === null && time.end_time === null) return 'Invalid time';
  if (time.start_time === null)
    return timeFormatter.format(time.end_time as Date);
  if (time.end_time === null) return timeFormatter.format(time.start_time);
  return `${timeFormatter.format(time.start_time)} - ${timeFormatter.format(time.end_time)}`;
}

export function formatNumber(reviews: number): string {
  if (reviews < 1000) return `${reviews}`;
  if (reviews < 1_000_000) return `${(reviews / 1000).toFixed(1)}K`;
  return `${(reviews / 1_000_000).toFixed(1)}M`;
}
