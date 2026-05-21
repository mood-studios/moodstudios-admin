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

export const blockedDayApi = {
  list: (params = {}) => {
    const q = queryString(params);
    return apiFetch(`/blocked-days${q ? `?${q}` : ''}`);
  },
  block: (date, reason = '') =>
    apiFetch('/blocked-days', {
      method: 'POST',
      body: JSON.stringify({ date, reason }),
    }),
  unblock: (id) => apiFetch(`/blocked-days/${id}`, { method: 'DELETE' }),
};

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
  createForCustomer: (body) =>
    apiFetch('/bookings/admin', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const userApi = {
  getAll: (params = {}) => {
    const q = queryString(params);
    return apiFetch(`/users${q ? `?${q}` : ''}`);
  },
  getById: (id) => apiFetch(`/users/${id}`),
  getCustomers: () => apiFetch('/users/customers'),
  createCustomer: (body) =>
    apiFetch('/users/customers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  changePassword: (currentPassword, newPassword) =>
    apiFetch('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
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
  downloadAlbum: async (albumId, filename = 'album') => {
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_BASE}/gallery/${albumId}/download`, {
      credentials: 'include',
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Download failed');
    }
    const blob = await res.blob();
    const safe = String(filename).replace(/[^\w\-]+/g, '_').slice(0, 80) || 'album';
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${safe}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  },
};

export const chatApi = {
  getInboxStats: () => apiFetch('/chat/inbox-stats'),
  markRead: (roomId) =>
    apiFetch('/chat/read', { method: 'PATCH', body: JSON.stringify({ roomId }) }),
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
