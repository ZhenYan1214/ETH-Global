import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    isLoading: false,
    walletAddress: null,
    balance: null,
  }),
  
  actions: {
    setLoading(status) {
      this.isLoading = status
    },
    
    setWalletAddress(address) {
      this.walletAddress = address
    },
    
    setBalance(balance) {
      this.balance = balance
    },
  },
  
  getters: {
    isConnected: (state) => !!state.walletAddress,
  },
}) 