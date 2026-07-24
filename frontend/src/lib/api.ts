import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = !!localStorage.getItem('token');
    // Only treat this as "your session expired" if we actually had a token -
    // a 401 with no token just means an unauthenticated request, which
    // ProtectedRoute already handles via normal SPA routing. Forcing a hard
    // reload here on every 401 was yanking users off pages they were
    // legitimately allowed to be on (e.g. a transient request racing app init).
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    if (error.response && error.response.status === 401 && hadToken && !isAuthEndpoint) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const RAG_SERVICE_URL = import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:8100';

/**
 * Generated-image URLs come in two shapes: our own relative /static/images/...
 * path (Gemini/pollinations, downloaded and re-served locally), or a full
 * external URL when the source is hotlinked directly (Unsplash - faster and
 * saves our own storage/bandwidth, per the provider's own guidelines against
 * re-hosting). Prefixing an already-absolute URL with our host would break
 * it, so only prefix when it isn't one already.
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : `${RAG_SERVICE_URL}${path}`;
}

export default api;
