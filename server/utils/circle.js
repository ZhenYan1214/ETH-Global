const axios = require('axios')

const circleApi = axios.create({
  baseURL: process.env.CIRCLE_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
    'Content-Type': 'application/json'
  }
})

async function createWallet(data) {
  try {
    const response = await circleApi.post('/wallets', data)
    return response.data
  } catch (error) {
    console.error('Error creating wallet:', error)
    throw error
  }
}

async function getWallet(walletId) {
  try {
    const response = await circleApi.get(`/wallets/${walletId}`)
    return response.data
  } catch (error) {
    console.error('Error getting wallet:', error)
    throw error
  }
}

async function listWallets() {
  try {
    const response = await circleApi.get('/wallets')
    return response.data
  } catch (error) {
    console.error('Error listing wallets:', error)
    throw error
  }
}

async function createTransfer(data) {
  try {
    const response = await circleApi.post('/transfers', data)
    return response.data
  } catch (error) {
    console.error('Error creating transfer:', error)
    throw error
  }
}

async function getTransfer(transferId) {
  try {
    const response = await circleApi.get(`/transfers/${transferId}`)
    return response.data
  } catch (error) {
    console.error('Error getting transfer:', error)
    throw error
  }
}

module.exports = {
  createWallet,
  getWallet,
  listWallets,
  createTransfer,
  getTransfer
} 