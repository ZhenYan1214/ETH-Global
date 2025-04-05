import axios from 'axios'

// Mock data settings
const USE_MOCK_DATA = false // Enable when API connection fails
const MOCK_DELAY = 1500 // Mock delay time (milliseconds)

// Basic mock data
const MOCK_DATA = {
  '/tokens/list/137': {
    balances: [
      {
        token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        balance: '1000000000',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6
      },
      {
        token: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        balance: '500000000000000000',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18
      },
      {
        token: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        balance: '2000000000000000000',
        name: 'Wrapped Matic',
        symbol: 'WMATIC',
        decimals: 18
      }
    ]
  },
  '/tokens/prices/137': {
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': '1.00',
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619': '3500.00',
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': '0.75'
  },
  '/vault/info': {
    vaultAddress: '0x1234567890123456789012345678901234567890',
    shareToken: '0x0987654321098765432109876543210987654321',
    depositToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    totalValueLocked: '5000000000000',
    apy: '8.5',
    users: 24,
    totalShares: '4750000000000'
  }
}

// API configuration
const API_CONFIG = {
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKOFF_FACTOR: 2
  },
  TIMEOUT: 15000,
  DEBUG: import.meta.env.MODE === 'development'
}

// Create axios instance
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3011'}/api`,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Log requests in development environment
    if (API_CONFIG.DEBUG) {
      console.log(`[API] Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.data || {})
    }
    
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Return simpler data structure
    if (API_CONFIG.DEBUG) {
      console.log(`[API] Response from ${response.config.url}:`, response.data)
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
    
    // Log errors in development environment
    if (API_CONFIG.DEBUG) {
      console.error('[API] Response error:', errorResponse)
    }
    
    return Promise.reject(errorResponse)
  }
)

/**
 * Implements exponential backoff retry logic for API requests
 * @param {Function} apiCall - Function that returns a promise for the API call
 * @param {Object} options - Retry options
 * @returns {Promise} - Promise resolving to the API response
 */
async function withRetry(apiCall, options = {}) {
  const maxRetries = options.maxRetries || API_CONFIG.RETRY.MAX_RETRIES;
  const retryDelay = options.retryDelay || API_CONFIG.RETRY.RETRY_DELAY;
  const backoffFactor = options.backoffFactor || API_CONFIG.RETRY.BACKOFF_FACTOR;
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain status codes
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        break;
      }
      
      // Last attempt, don't wait
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate backoff time
      const delay = retryDelay * Math.pow(backoffFactor, attempt - 1);
      
      if (API_CONFIG.DEBUG) {
        console.warn(`[API] Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Get mock data based on URL
function getMockData(url) {
  // Extract path from URL
  const path = url.split('?')[0]
  
  // Handle special paths with parameters
  if (path.includes('/tokens/prices/137/')) {
    const addresses = path.split('/tokens/prices/137/')[1]
    const mockPrices = {}
    addresses.split(',').forEach(addr => {
      const lowerAddr = addr.toLowerCase()
      // Provide mock price for each address
      if (lowerAddr.includes('3c499c542cef5e3811e1192ce70d8cc03d5c3359')) {
        mockPrices[lowerAddr] = '1.00' // USDC
      } else if (lowerAddr.includes('7ceb23fd6bc0add59e62ac25578270cff1b9f619')) {
        mockPrices[lowerAddr] = '3500.00' // WETH
      } else if (lowerAddr.includes('0d500b1d8e8ef31e21c99d1db9a6444d3adf1270')) {
        mockPrices[lowerAddr] = '0.75' // WMATIC
      } else {
        mockPrices[lowerAddr] = '0.50' // Default value
      }
    })
    return mockPrices
  }
  
  // Handle wallet balance requests
  if (path.includes('/tokens/balances/')) {
    const pathParts = path.split('/tokens/balances/')[1].split('/')
    const chainId = pathParts[0]
    const walletAddress = pathParts[1]
    
    return {
      walletAddress,
      chainId,
      balances: [
        {
          token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
          balance: '1000000000',
          usdValue: 'N/A'
        },
        {
          token: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
          balance: '500000000000000000',
          usdValue: 'N/A'
        },
        {
          token: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
          balance: '2000000000000000000',
          usdValue: 'N/A'
        }
      ]
    }
  }
  
  // Handle user specific information
  if (path.includes('/vault/user/')) {
    return {
      userAddress: path.split('/vault/user/')[1],
      depositAmount: '500000000',  // 500 USDC
      shareAmount: '475000000',    // User shares
      depositValue: '500.00',      // USD value
      userPercentage: '10'         // Percentage of total shares
    }
  }
  
  // Handle deposit preview
  if (path === '/vault/preview-deposit') {
    return {
      srcAmount: '100000000',     // 100 USDC
      dstAmount: '95000000',      // Shares received
      expectedValueUSD: '100.00', // Expected USD value
      fee: '1.0',                 // Fee rate
      expectedAPY: '8.5'          // Expected APY
    }
  }
  
  // Basic mock data
  for (const key in MOCK_DATA) {
    if (path === key || path.startsWith(key)) {
      return MOCK_DATA[key]
    }
  }
  
  // If no matching mock data is found
  console.warn(`[API] No mock data found for path: ${path}`)
  return { message: 'Mock data not available' }
}

// API service methods
const apiService = {
  async get(endpoint, params = {}, retryOptions = {}) {
    return withRetry(
      () => api.get(endpoint, { params }),
      retryOptions
    );
  },
  
  async post(endpoint, data = {}, retryOptions = {}) {
    return withRetry(
      () => api.post(endpoint, data),
      retryOptions
    );
  },
  
  async put(endpoint, data = {}, retryOptions = {}) {
    return withRetry(
      () => api.put(endpoint, data),
      retryOptions
    );
  },
  
  async delete(endpoint, params = {}, retryOptions = {}) {
    return withRetry(
      () => api.delete(endpoint, { params }),
      retryOptions
    );
  }
}

export default apiService 