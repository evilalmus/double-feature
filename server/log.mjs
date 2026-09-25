export function log(event, fields = {}) {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);

  console.log(
    `${new Date().toISOString()} ${event}${parts.length ? ` ${parts.join(' ')}` : ''}`
  );
}