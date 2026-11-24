import { HttpErrorResponse } from "@angular/common/http";
import { ValidatorFn } from "@angular/forms";
import { z } from "zod";

export const UUID_RE = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}/;

export function isUUID(id: string): boolean {
  return UUID_RE.test(id);
}

export const PHONE_RE = /^[\d+()\-. ]{7,20}$/;

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

function readDetail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return null;
  const detail = (body as { detail: unknown }).detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => (typeof d?.msg === 'string' ? d.msg : null))
      .filter((m): m is string => m !== null);
    return messages.length ? messages.join('. ') : null;
  }
  return null;
}

export function getErrorMessage(err: unknown, fallback = DEFAULT_MESSAGE): string {
  if (err instanceof z.ZodError) {
    return 'Please check your details and try again.';
  }

  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Check your connection.';
    if (err.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return readDetail(err.error) ?? fallback;
  }

  return fallback;
}

export function zodValidator(schema: z.ZodType): ValidatorFn {
  return (control) => {
    const result = schema.safeParse(control.value);
    return result.success ? null : { zod: result.error.issues[0].message};
  };
}
