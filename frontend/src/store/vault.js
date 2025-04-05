import { defineStore } from 'pinia'
import { useWalletStore } from './wallet'
import { piggyVaultAbi } from '../assets/abi'
export const useVaultStore = defineStore('vault', {
  state: () => ({
    valutAddress: "0xa72cFe5dCa3f2bEB1fD8a90C02e224897a821552",
    abi: piggyVaultAbi,
    assets: [],
    transactions: [],
    isLoading: false,
    error: null,
    selectedAsset: null,
    balances: {},
    totalBalance: '0',
    portfolioHistory: []
  }),

  getters: {
    hasAssets: (state) => state.assets.length > 0,
    sortedAssets: (state) => [...state.assets].sort((a, b) => {
      const balanceA = parseFloat(state.balances[a.address] || '0')
      const balanceB = parseFloat(state.balances[b.address] || '0')
      return balanceB - balanceA
    }),
    formattedTotalBalance: (state) => {
      try {
        // Format with 2 decimal places
        return parseFloat(state.totalBalance).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      } catch {
        return '0.00'
      }
    }
  },

  actions: {
    async fetchAssets() {
      const walletStore = useWalletStore()
      if (!walletStore.isConnected) return

      this.isLoading = true
      this.error = null

      try {
        // For development/demo, create some sample assets
        if (import.meta.env.DEV) {
          await this.loadSampleAssets()
          return
        }

        // In production, you would fetch real assets from an API or blockchain
        // Example:
        // const response = await fetch(`https://api.example.com/assets?address=${walletStore.address}`)
        // this.assets = await response.json()
        
        // For now, we'll just use sample data
        await this.loadSampleAssets()
      } catch (err) {
        this.error = err.message
        console.error('Error fetching assets:', err)
      } finally {
        this.isLoading = false
      }
    },

    async loadSampleAssets() {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Sample assets data
      this.assets = [
        {
          name: 'Ethereum',
          symbol: 'ETH',
          address: 'native',
          logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
          decimals: 18
        },
        {
          name: 'USD Coin',
          symbol: 'USDC',
          address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
          logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
          decimals: 6
        },
        {
          name: 'Piggy Token',
          symbol: 'PIG',
          address: '0xc4660f40ba6fe89b3ba7ded44cf1db73d731c95e',
          logo: 'https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png',
          decimals: 18
        }
      ]

      // Sample balances
      this.balances = {
        'native': '1000000000000000000', // 1 ETH
        '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d': '5000000', // 5 USDC
        '0xc4660f40ba6fe89b3ba7ded44cf1db73d731c95e': '1000000000000000000000' // 1000 PIG
      }

      // Calculate total balance (simplified, in real app would convert to USD)
      this.calculateTotalBalance()

      // Sample transaction history
      this.transactions = [
        {
          hash: '0x1234...5678',
          type: 'receive',
          asset: 'ETH',
          amount: '0.5',
          timestamp: Date.now() - 86400000 * 2, // 2 days ago
          status: 'completed'
        },
        {
          hash: '0xabcd...efgh',
          type: 'send',
          asset: 'USDC',
          amount: '10',
          timestamp: Date.now() - 86400000, // 1 day ago
          status: 'completed'
        },
        {
          hash: '0x8765...4321',
          type: 'swap',
          fromAsset: 'ETH',
          toAsset: 'PIG',
          fromAmount: '0.1',
          toAmount: '100',
          timestamp: Date.now() - 3600000, // 1 hour ago
          status: 'completed'
        }
      ]

      // Sample portfolio history (7 days)
      this.portfolioHistory = Array(7).fill(0).map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        
        // Generate a random value around $1000 with some variation
        const baseValue = 1000
        const randomFactor = 0.9 + (Math.random() * 0.2) // Between 0.9 and 1.1
        
        return {
          date: date.toISOString().split('T')[0],
          value: (baseValue * randomFactor).toFixed(2)
        }
      })
    },

    calculateTotalBalance() {
      // In a real app, you would convert all assets to a common denomination (e.g., USD)
      // For this demo, we'll use a simplified approach
      
      let total = 0
      
      // ETH price in USD (simplified)
      const ethPrice = 2000
      const pigPrice = 0.5
      
      // Add ETH value
      const ethBalance = parseFloat(this.balances['native'] || '0') / 1e18
      total += ethBalance * ethPrice
      
      // Add USDC value (1:1 with USD)
      const usdcBalance = parseFloat(this.balances['0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'] || '0') / 1e6
      total += usdcBalance
      
      // Add PIG value
      const pigBalance = parseFloat(this.balances['0xc4660f40ba6fe89b3ba7ded44cf1db73d731c95e'] || '0') / 1e18
      total += pigBalance * pigPrice
      
      this.totalBalance = total.toString()
    },

    selectAsset(assetAddress) {
      this.selectedAsset = this.assets.find(asset => asset.address === assetAddress) || null
    },

    async refreshBalances() {
      const walletStore = useWalletStore()
      if (!walletStore.isConnected) return

      this.isLoading = true

      try {
        // In a real app, you would fetch current balances from the blockchain
        // For this demo, we'll just refresh the sample data
        await this.loadSampleAssets()
      } catch (err) {
        console.error('Error refreshing balances:', err)
      } finally {
        this.isLoading = false
      }
    },

    formatTokenAmount(amount, decimals, maxDecimals = 4) {
      if (!amount) return '0'
      
      // Convert from wei to token units
      const value = parseFloat(amount) / Math.pow(10, decimals)
      
      // Format with appropriate decimal places
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals
      })
    },

    getAssetBalance(assetAddress) {
      const rawBalance = this.balances[assetAddress] || '0'
      const asset = this.assets.find(a => a.address === assetAddress)
      
      if (!asset) return '0'
      
      return this.formatTokenAmount(rawBalance, asset.decimals)
    }
  }
}) 