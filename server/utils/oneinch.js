const axios = require('axios')

const oneinchApi = axios.create({
  baseURL: process.env.ONEINCH_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
    'Accept': 'application/json'
  }
})

async function getTokenBalances(address, chainId = 1) {
  try {
    const response = await oneinchApi.get(`/${chainId}/tokens/balances`, {
      params: { address }
    })
    return response.data
  } catch (error) {
    console.error('Error fetching token balances:', error)
    throw error
  }
}

async function getTokenPrices(tokens, chainId = 1) {
  try {
    const response = await oneinchApi.get(`/${chainId}/tokens/prices`, {
      params: { tokens: tokens.join(',') }
    })
    return response.data
  } catch (error) {
    console.error('Error fetching token prices:', error)
    throw error
  }
}

async function getQuote(params) {
  try {
    const response = await oneinchApi.get('/quote', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching quote:', error)
    throw error
  }
}

async function getSwap(params) {
  try {
    const response = await oneinchApi.get('/swap', { params })
    return response.data
  } catch (error) {
    console.error('Error getting swap data:', error)
    throw error
  }
}

module.exports = {
  getTokenBalances,
  getTokenPrices,
  getQuote,
  getSwap
} 