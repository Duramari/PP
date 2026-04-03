// ═══════════════════════════════════════════════════════════════
// DIALBEE FRONTEND — API Client
// src/lib/api.ts
// ═══════════════════════════════════════════════════════════════

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User, Business, Lead, LeadDistribution, Category, Country, City,
  Review, Subscription, SearchResponse, AuthTokens
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ── Request interceptor: inject JWT ──────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dialbee_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh token ─────────────────
api.interceptors.response.use(
  (response) => response.data.data ?? response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('dialbee_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data.data;

        localStorage.setItem('dialbee_access_token', accessToken);
        localStorage.setItem('dialbee_refresh_token', newRefresh);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('dialbee_access_token');
        localStorage.removeItem('dialbee_refresh_token');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// ── Auth API ──────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; fullName: string; role?: string; countryCode?: string }) =>
    api.post<AuthTokens>('/auth/register', data),

  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get<User>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, otp, newPassword }),
};

// ── Business API ──────────────────────────────────────────────
export const businessApi = {
  search: (params: {
    q?: string; categoryId?: string; city?: string;
    countryCode?: string; minRating?: number;
    lat?: number; lng?: number; radiusKm?: number;
    sortBy?: string; page?: number; limit?: number;
  }) => api.get<SearchResponse>('/businesses/search', { params }),

  getBySlug: (slug: string) =>
    api.get<Business>(`/businesses/${slug}`),

  // Owner
  create: (data: any) => api.post<Business>('/owner/businesses', data),

  getMyBusinesses: () => api.get<Business[]>('/owner/businesses'),

  update: (id: string, data: any) =>
    api.patch<Business>(`/owner/businesses/${id}`, data),

  getDashboardStats: (id: string) =>
    api.get(`/owner/businesses/${id}/stats`),

  uploadMedia: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return api.post(`/owner/businesses/${id}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Leads API ─────────────────────────────────────────────────
export const leadsApi = {
  submit: (data: {
    businessId: string; customerName?: string;
    customerPhone?: string; customerEmail?: string;
    customerMessage?: string; source?: string;
    urgency?: string; searchQuery?: string;
  }) => api.post<Lead>('/leads', data),

  getBusinessLeads: (bizId: string, page = 1, status?: string) =>
    api.get(`/owner/businesses/${bizId}/leads`, { params: { page, status } }),

  updateStatus: (distId: string, status: string) =>
    api.patch(`/owner/leads/${distId}/status`, { status }),

  getWallet: (bizId: string) =>
    api.get(`/owner/businesses/${bizId}/wallet`),
};

// ── Categories API ────────────────────────────────────────────
export const categoriesApi = {
  getAll: () => api.get<Category[]>('/categories'),
  getBySlug: (slug: string) => api.get<Category>(`/categories/${slug}`),
};

// ── Locations API ─────────────────────────────────────────────
export const locationsApi = {
  getCountries: () => api.get<Country[]>('/countries'),
  getCities: (countryCode: string) =>
    api.get<City[]>(`/countries/${countryCode}/cities`),
};

// ── Payments API ──────────────────────────────────────────────
export const paymentsApi = {
  getPlans: (countryCode: string) =>
    api.get('/plans', { params: { countryCode } }),

  createCheckout: (businessId: string, planId: string) =>
    api.post<{ checkoutUrl: string }>('/subscriptions/checkout', { businessId, planId }),

  getMySubscription: () => api.get<Subscription>('/subscriptions/me'),

  cancelSubscription: () => api.delete('/subscriptions/me'),
};

// ── Admin API ─────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),

  getBusinesses: (params?: any) =>
    api.get('/admin/businesses', { params }),

  moderateBusiness: (id: string, action: string, reason?: string) =>
    api.patch(`/admin/businesses/${id}`, { action, reason }),

  getUsers: (params?: any) => api.get('/admin/users', { params }),
  suspendUser: (id: string) => api.patch(`/admin/users/${id}/suspend`),

  getLeads: (page = 1) => api.get('/admin/leads', { params: { page } }),
  getPayments: (page = 1) => api.get('/admin/payments', { params: { page } }),
};

export default api;
