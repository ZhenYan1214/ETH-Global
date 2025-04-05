import { defineStore } from 'pinia'
import { useWalletStore } from './wallet'
import { useMainStore } from './main'
import { piggyVaultAbi } from '../assets/abi'
import { ethers } from 'ethers'
import axios from 'axios'

// 設置 API 基礎 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com';

// 創建 API 客戶端
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const useVaultStore = defineStore('vault', {
  state: () => ({
    vaultAddress: "0xa72cFe5dCa3f2bEB1fD8a90C02e224897a821552",
    abi: piggyVaultAbi,
    assets: [],
    transactions: [],
    isLoading: false,
    error: null,
    selectedAsset: null,
    balances: {},
    totalBalance: '0',
    portfolioHistory: [],
    depositPreview: null,
    depositStatus: null,
    transactionHash: null,
    isTransacting: false
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
    // 新增：預覽存款交易
    async previewDeposit(tokens) {
      this.isLoading = true;
      this.error = null;
      
      const walletStore = useWalletStore();
      const mainStore = useMainStore();
      
      if (!walletStore.isConnected) {
        this.error = '請先連接錢包';
        this.isLoading = false;
        mainStore.showNotification('請先連接錢包', 'warning');
        return null;
      }
      
      try {
        console.log("預覽存款交易:", tokens);
        
        // 調用 walletStore 的 prepareDepositTransaction 方法來獲取預覽數據
        const result = await walletStore.prepareDepositTransaction();
        
        if (!result.success) {
          throw new Error(result.error || '獲取預覽數據失敗');
        }
        
        // 從預覽數據中獲取需要的信息
        const { previewData } = result;
        const totalValue = parseFloat(previewData.formattedAmount.replace(/,/g, ''));
        
        // 創建預覽數據
        this.depositPreview = {
          fromTokens: tokens,
          toToken: {
            symbol: 'USDC',
            address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
          },
          fromAmount: totalValue.toString(),
          toAmount: previewData.formattedAmount,
          fromUsdValue: totalValue.toString(),
          toUsdValue: totalValue.toString(),
          priceImpact: '0',
          exchangeRate: '1.00',
          networkCost: 'Sponsored',
          expectedReceive: previewData.formattedAmount,
          expirationTime: '30'
        };
        
        console.log("Deposit Preview:", this.depositPreview);
        return this.depositPreview;
      } catch (err) {
        this.error = err.message;
        console.error('獲取存款預覽失敗:', err);
        mainStore.showNotification('獲取存款預覽失敗: ' + err.message, 'error');
        return null;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 新增：執行存款交易
    async executeDeposit() {
      this.isTransacting = true;
      this.depositStatus = 'pending';
      this.error = null;
      
      const walletStore = useWalletStore();
      const mainStore = useMainStore();
      
      if (!walletStore.isConnected) {
        this.error = '請先連接錢包';
        this.isTransacting = false;
        this.depositStatus = 'error';
        mainStore.showNotification('請先連接錢包', 'error');
        return false;
      }
      
      if (!this.depositPreview) {
        this.error = '沒有存款預覽數據';
        this.isTransacting = false;
        this.depositStatus = 'error';
        mainStore.showNotification('沒有存款預覽數據', 'error');
        return false;
      }
      
      try {
        // 調用 walletStore 的 executeDepositTransaction 方法執行實際交易
        console.log("執行存款交易");
        
        // 執行存款交易
        const result = await walletStore.executeDepositTransaction();
        
        if (result && result.success) {
          // 交易成功
          this.depositStatus = 'success';
          this.transactionHash = result.hash || ('0x' + Math.random().toString(16).substring(2, 42));
          
          mainStore.showNotification('存款交易成功！', 'success');
          return true;
        } else {
          // 交易失敗
          throw new Error(result?.error || '交易執行失敗');
        }
      } catch (err) {
        this.error = err.message;
        this.depositStatus = 'error';
        console.error('存款交易失敗:', err);
        mainStore.showNotification('存款交易失敗: ' + err.message, 'error');
        return false;
      } finally {
        this.isTransacting = false;
      }
    },
    
    resetDepositState() {
      this.depositPreview = null;
      this.depositStatus = null;
      this.transactionHash = null;
      this.error = null;
      this.isTransacting = false;
    },

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
          decimals: 18,
          price: 3500
        },
        {
          name: 'USD Coin',
          symbol: 'USDC',
          address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
          logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
          decimals: 6,
          price: 1
        },
        {
          name: 'Piggy Token',
          symbol: 'PIG',
          address: '0xc4660f40ba6fe89b3ba7ded44cf1db73d731c95e',
          logo: 'https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png',
          decimals: 18,
          price: 0.5
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