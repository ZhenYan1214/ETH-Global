const axios = require('axios')

const multibaasApi = axios.create({
  baseURL: process.env.MULTIBAAS_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.MULTIBAAS_API_KEY}`,
    'Content-Type': 'application/json'
  }
})

async function getEvents(contractAddress, eventName, fromBlock, toBlock) {
  try {
    const response = await multibaasApi.get('/events', {
      params: {
        contract: contractAddress,
        event: eventName,
        fromBlock,
        toBlock
      }
    })
    return response.data
  } catch (error) {
    console.error('Error fetching events:', error)
    throw error
  }
}

async function getTransaction(txHash) {
  try {
    const response = await multibaasApi.get(`/transactions/${txHash}`)
    return response.data
  } catch (error) {
    console.error('Error fetching transaction:', error)
    throw error
  }
}

async function getContractState(contractAddress) {
  try {
    const response = await multibaasApi.get(`/contracts/${contractAddress}/state`)
    return response.data
  } catch (error) {
    console.error('Error fetching contract state:', error)
    throw error
  }
}

module.exports = {
  getEvents,
  getTransaction,
  getContractState
} 