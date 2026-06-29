import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // sends the HTTP-only JWT cookie automatically
})

// ── Jobs ───────────────────────────────────────────────────────────────────
export const jobsApi = {
  list:   (params) => api.get('/jobs/', { params }),
  get:    (id)     => api.get(`/jobs/${id}`),
  create: (data)   => api.post('/jobs/', data),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  delete: (id)     => api.delete(`/jobs/${id}`),
  stats:  ()       => api.get('/jobs/stats/summary'),
  scrape: (url)    => api.post('/jobs/scrape', { url }),
  analyze: (id)    => api.post(`/jobs/${id}/analyze`),
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  me:     () => api.get('/users/me'),
  update: (data) => api.patch('/users/me', data),
  uploadCv: (formData) => api.post('/users/me/upload-cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  logout: () => axios.post('/auth/logout', {}, { withCredentials: true }),
}

export default api
