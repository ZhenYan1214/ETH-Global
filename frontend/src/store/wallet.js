import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWalletStore = defineStore('wallet', () => {
  const address = ref('')
  const isConnected = ref(false)
  const balance = ref('0')

  function setAddress(newAddress) {
    address.value = newAddress
    isConnected.value = true
  }

  function setBalance(newBalance) {
    balance.value = newBalance
  }

  function disconnect() {
    address.value = ''
    isConnected.value = false
    balance.value = '0'
  }

  return {
    address,
    isConnected,
    balance,
    setAddress,
    setBalance,
    disconnect
  }
}) 