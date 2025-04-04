import axios from 'axios'

// Create an axios instance with defaults
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3011'}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    // if (localStorage.getItem('auth_token')) {
    //   config.headers.Authorization = `Bearer ${localStorage.getItem('auth_token')}`;
    // }
    
    // Log requests in development
    if (import.meta.env.MODE === 'development') {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.data || {})
    }
    
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    // Return just the data for cleaner usage
    if (import.meta.env.MODE === 'development') {
      console.log(`API Response from ${response.config.url}:`, response.data)
    }
    return response.data
  },
  (error) => {
    const errorResponse = {
      status: error.response?.status || 0,
      message: error.response?.data?.message || error.message || 'Unknown error occurred',
      errors: error.response?.data?.errors || [],
      originalError: error
    }
    
    // Log detailed error in development
    if (import.meta.env.MODE === 'development') {
      console.error('API Response Error:', errorResponse)
    }
    
    // Handle specific error codes
    if (errorResponse.status === 401) {
      // Handle unauthorized error (e.g., redirect to login)
      console.warn('Authentication required')
      // You might want to redirect to login or refresh token here
    }
    
    return Promise.reject(errorResponse)
  }
)

// API service methods for cleaner use
const apiService = {
  async get(endpoint, params = {}) {
    try {
      return await api.get(endpoint, { params })
    } catch (error) {
      throw error
    }
  },
  
  async post(endpoint, data = {}) {
    try {
      return await api.post(endpoint, data)
    } catch (error) {
      throw error
    }
  },
  
  async put(endpoint, data = {}) {
    try {
      return await api.put(endpoint, data)
    } catch (error) {
      throw error
    }
  },
  
  async delete(endpoint, params = {}) {
    try {
      return await api.delete(endpoint, { params })
    } catch (error) {
      throw error
    }
  }
}

export default apiService 