import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    isLoading: false,
    appName: 'MSCA Wallet',
    theme: 'light',
    error: null,
    notification: {
      show: false,
      message: '',
      color: 'success',
      timeout: 5000
    }
  }),
  
  actions: {
    setLoading(status) {
      this.isLoading = status
    },
    
    setError(error) {
      this.error = error
    },
    
    clearError() {
      this.error = null
    },
    
    showNotification(message, color = 'success', timeout = 5000) {
      this.notification = {
        show: true,
        message,
        color,
        timeout
      }
    },
    
    clearNotification() {
      this.notification.show = false
    },
    
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    }
  }
}) 