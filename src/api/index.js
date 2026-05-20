import { apiFetch, getToken } from './client';

export const authApi = {
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch('/auth/me'),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  verifyOtp: (email, otp) =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
};

const queryString = (params = {}) =>
  new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();

export const bookingApi = {
  getAll: (params = {}) => {
    const q = queryString(params);
    return apiFetch(`/bookings${q ? `?${q}` : ''}`);
  },
  getOne: (id) => apiFetch(`/bookings/${id}`),
  getAvailability: (date, durationMinutes, excludeBookingId) => {
    const params = new URLSearchParams({ date, durationMinutes: String(durationMinutes) });
    if (excludeBookingId) params.set('excludeBookingId', excludeBookingId);
    return apiFetch(`/bookings/availability?${params}`);
  },
  updateStatus: (id, status) =>
    apiFetch(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  reschedule: (id, bookingDate, bookingTime) =>
    apiFetch(`/bookings/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ bookingDate, bookingTime }),
    }),
};

export const userApi = {
  getAll: (params = {}) => {
    const q = queryString(params);
    return apiFetch(`/users${q ? `?${q}` : ''}`);
  },
  getById: (id) => apiFetch(`/users/${id}`),
  getCustomers: () => apiFetch('/users/customers'),
  update: (id, body) =>
    apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
};

export const activityLogApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return apiFetch(`/activity-logs${q ? `?${q}` : ''}`);
  },
  meta: () => apiFetch('/activity-logs/meta'),
};

export const categoryApi = {
  list: (params = {}) => {
    const q = queryString(params);
    return apiFetch(`/categories${q ? `?${q}` : ''}`);
  },
  create: (body) => apiFetch('/categories', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/categories/${id}`, { method: 'DELETE' }),
};

export const featuredPhotoApi = {
  list: () => apiFetch('/featured-photos'),
  save: (photos) =>
    apiFetch('/featured-photos', {
      method: 'PUT',
      body: JSON.stringify({ photos }),
    }),
  toggleVisibility: (id) =>
    apiFetch(`/featured-photos/${id}/visibility`, { method: 'PATCH' }),
};

export const serviceApi = {
  list: (params = {}) => {
    const q = queryString(params);
    return apiFetch(`/services${q ? `?${q}` : ''}`);
  },
  create: (body) => apiFetch('/services', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/services/${id}`, { method: 'DELETE' }),
  toggleVisibility: (id) => apiFetch(`/services/${id}/visibility`, { method: 'PATCH' }),
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_BASE}/services/upload-image`, {
      method: 'POST',
      credentials: 'include',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Image upload failed');
    return data;
  },
  uploadImages: async (files) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_BASE}/services/upload-images`, {
      method: 'POST',
      credentials: 'include',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Image upload failed');
    return data;
  },
};

export const galleryApi = {
  getByBooking: (bookingId) => apiFetch(`/gallery/booking/${bookingId}`),
  createAlbum: (bookingId, albumName) =>
    apiFetch('/gallery', {
      method: 'POST',
      body: JSON.stringify({ bookingId, albumName }),
    }),
  uploadPhotos: async (albumId, files) => {
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_BASE}/gallery/${albumId}/photos`, {
      method: 'POST',
      credentials: 'include',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
  deletePhoto: (albumId, photoId) =>
    apiFetch(`/gallery/${albumId}/photos/${photoId}`, { method: 'DELETE' }),
  deleteAlbum: (id) => apiFetch(`/gallery/${id}`, { method: 'DELETE' }),
};

export const chatApi = {
  getPartners: () => apiFetch('/chat/partners'),
  getHistory: (receiverId, bookingId) => {
    const params = new URLSearchParams({ receiverId: String(receiverId) });
    if (bookingId) params.set('bookingId', String(bookingId));
    return apiFetch(`/chat/history?${params}`);
  },
  sendMessage: (receiverId, message, bookingId) =>
    apiFetch('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiverId: String(receiverId),
        message,
        ...(bookingId ? { bookingId: String(bookingId) } : {}),
      }),
    }),
  getConversations: () => apiFetch('/chat/conversations'),
};

export const notificationApi = {
  list: () => apiFetch('/notifications'),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiFetch('/notifications/read-all', { method: 'PATCH' }),
};
