const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE_URL = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/$/, '')}/api/v1`;
export const AUTH_TOKEN_KEY = 'steakz-auth-token-v1';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let message = `API Error: ${response.status} ${response.statusText}`;

        try {
          const errorBody = await response.json();
          message = errorBody.message || errorBody.error || message;
        } catch {
          // Keep the HTTP status message when the backend does not send JSON.
        }

        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  get(endpoint, options) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  patch(endpoint, data, options) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

const api = new ApiClient(API_BASE_URL);

// Auth endpoints
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  registerCustomer: (data) => api.post('/auth/register-customer', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// Users endpoints
export const usersApi = {
  getUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Branches endpoints
export const branchesApi = {
  getBranches: () => api.get('/branches'),
  getBranchById: (id) => api.get(`/branches/${id}`),
  createBranch: (data) => api.post('/branches', data),
  updateBranch: (id, data) => api.patch(`/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/branches/${id}`),
};

// Menu endpoints
export const menuApi = {
  getMenuItems: (branchId) => api.get(`/menu${branchId ? `?branchId=${branchId}` : ''}`),
  getMenuItemById: (id) => api.get(`/menu/${id}`),
  createMenuItem: (data) => api.post('/menu', data),
  updateMenuItem: (id, data) => api.patch(`/menu/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/menu/${id}`),
};

// Bookings endpoints
export const bookingsApi = {
  getBookings: (branchId) => api.get(`/bookings${branchId ? `?branchId=${branchId}` : ''}`),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  createBooking: (data) => api.post('/bookings', data),
  updateBooking: (id, data) => api.patch(`/bookings/${id}/status`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
};

// Orders endpoints
export const ordersApi = {
  getOrders: (branchId) => api.get(`/orders${branchId ? `?branchId=${branchId}` : ''}`),
  getOrderById: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.patch(`/orders/${id}/status`, data),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
};

// Staff endpoints
export const staffApi = {
  getStaffMembers: (branchId) => api.get(`/staff${branchId ? `?branchId=${branchId}` : ''}`),
};

// Shifts endpoints
export const shiftsApi = {
  getShifts: (branchId) => api.get(`/shifts${branchId ? `?branchId=${branchId}` : ''}`),
  createShift: (data) => api.post('/shifts', data),
  updateShift: (id, data) => api.patch(`/shifts/${id}`, data),
};

export default api;
