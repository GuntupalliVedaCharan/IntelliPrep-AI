import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const resumeAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/resumes/upload', formData);
  },
  list: () => api.get('/resumes'),
  get: (id) => api.get(`/resumes/${id}`),
  delete: (id) => api.delete(`/resumes/${id}`),
};

export const interviewAPI = {
  start: (data) => api.post('/interviews/start', data),
  list: () => api.get('/interviews'),
  get: (id) => api.get(`/interviews/${id}`),
  answer: (id, data) => api.post(`/interviews/${id}/answer`, data),
  complete: (id) => api.post(`/interviews/${id}/complete`),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  recommendations: () => api.get('/dashboard/recommendations'),
};

export default api;
