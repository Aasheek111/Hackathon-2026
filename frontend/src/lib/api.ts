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
    if (error.response && error.response.status === 401 && hadToken) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
