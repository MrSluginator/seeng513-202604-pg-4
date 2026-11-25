export function isUUID(id: string): boolean {
  const UUID_RE = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}/;
  return UUID_RE.test(id);
}
