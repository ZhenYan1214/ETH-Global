import axios from 'axios'

// 模擬數據設置
const USE_MOCK_DATA = true // 當API連接失敗時啟用
const MOCK_DELAY = 1500 // 模擬延遲時間 (毫秒)

// 基本模擬數據
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

// 創建 axios 實例
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3011'}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 開發環境下記錄請求
    if (import.meta.env.MODE === 'development') {
      console.log(`[API] 請求: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.data || {})
    }
    
    return config
  },
  (error) => {
    console.error('[API] 請求錯誤:', error)
    return Promise.reject(error)
  }
)

// 回應攔截器
api.interceptors.response.use(
  (response) => {
    // 返回更簡潔的數據結構
    if (import.meta.env.MODE === 'development') {
      console.log(`[API] 回應來自 ${response.config.url}:`, response.data)
    }
    return response.data
  },
  (error) => {
    const errorResponse = {
      status: error.response?.status || 0,
      message: error.response?.data?.message || error.message || '發生未知錯誤',
      errors: error.response?.data?.errors || [],
      originalError: error
    }
    
    // 開發環境下記錄錯誤
    if (import.meta.env.MODE === 'development') {
      console.error('[API] 回應錯誤:', errorResponse)
    }
    
    return Promise.reject(errorResponse)
  }
)

// 根據 URL 獲取模擬數據
function getMockData(url) {
  // 從 URL 中提取路徑
  const path = url.split('?')[0]
  
  // 處理特殊路徑,例如帶有參數的路徑
  if (path.includes('/tokens/prices/137/')) {
    const addresses = path.split('/tokens/prices/137/')[1]
    const mockPrices = {}
    addresses.split(',').forEach(addr => {
      const lowerAddr = addr.toLowerCase()
      // 為每個地址提供模擬價格
      if (lowerAddr.includes('3c499c542cef5e3811e1192ce70d8cc03d5c3359')) {
        mockPrices[lowerAddr] = '1.00' // USDC
      } else if (lowerAddr.includes('7ceb23fd6bc0add59e62ac25578270cff1b9f619')) {
        mockPrices[lowerAddr] = '3500.00' // WETH
      } else if (lowerAddr.includes('0d500b1d8e8ef31e21c99d1db9a6444d3adf1270')) {
        mockPrices[lowerAddr] = '0.75' // WMATIC
      } else {
        mockPrices[lowerAddr] = '0.50' // 默認值
      }
    })
    return mockPrices
  }
  
  // 處理用戶特定資訊
  if (path.includes('/vault/user/')) {
    return {
      userAddress: path.split('/vault/user/')[1],
      depositAmount: '500000000',  // 500 USDC
      shareAmount: '475000000',    // 用戶份額
      depositValue: '500.00',      // USD 值
      userPercentage: '10'         // 佔總份額的百分比
    }
  }
  
  // 處理預覽存款
  if (path === '/vault/preview-deposit') {
    return {
      srcAmount: '100000000',     // 100 USDC
      dstAmount: '95000000',      // 獲得的份額
      expectedValueUSD: '100.00', // 預期USD值
      fee: '1.0',                 // 費率
      expectedAPY: '8.5'          // 預期APY
    }
  }
  
  // 基本模擬數據
  for (const key in MOCK_DATA) {
    if (path === key || path.startsWith(key)) {
      return MOCK_DATA[key]
    }
  }
  
  // 如果沒有匹配的模擬數據
  console.warn(`[API] 沒有找到路徑的模擬數據: ${path}`)
  return { message: '模擬數據不可用' }
}

// API 服務方法
const apiService = {
  async get(endpoint, params = {}) {
    try {
      // 嘗試實際API調用
      return await api.get(endpoint, { params })
    } catch (error) {
      // 如果API連接失敗且啟用了模擬數據
      if (USE_MOCK_DATA) {
        console.warn(`[API] 使用 ${endpoint} 的模擬數據`)
        
        // 模擬延遲
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
        
        // 返回模擬數據
        return getMockData(endpoint)
      }
      
      // 如果未啟用模擬數據，繼續拋出錯誤
      throw error
    }
  },
  
  async post(endpoint, data = {}) {
    try {
      return await api.post(endpoint, data)
    } catch (error) {
      // 如果API連接失敗且啟用了模擬數據
      if (USE_MOCK_DATA && endpoint === '/vault/preview-deposit') {
        console.warn(`[API] 使用 ${endpoint} 的模擬數據`)
        
        // 模擬延遲
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
        
        // 返回預覽存款的模擬數據
        return getMockData(endpoint)
      }
      
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