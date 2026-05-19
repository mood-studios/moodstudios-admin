/** Strip trailing slashes and optional /api suffix from the REST base URL. */
function apiOriginFromEnv() {
  const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
  if (!raw) return '';
  return raw.replace(/\/api\/?$/i, '');
}

/** Socket.IO server origin (no /api). */
export function getSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim().replace(/\/$/, '');
  if (explicit) return explicit;

  const fromApi = apiOriginFromEnv();
  if (fromApi) return fromApi;

  if (import.meta.env.DEV) return 'http://localhost:5000';

  return window.location.origin;
}

export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
  if (raw) return raw.endsWith('/api') ? raw : `${raw}/api`;
  return '/api';
}
