import { defineStore } from 'pinia'
import api from '../utils/api'
import { useWalletStore } from './wallet'
import { useMainStore } from './main'

export const useTokenStore = defineStore('tokens', {
  state: () => ({
    tokens: [],
    allTokens: {},
    isLoading: false,
    isLoadingAllTokens: false,
    error: null,
    selectedFromToken: null,
    selectedFromTokens: [],
    selectedToToken: null,
    fromAmount: '',
    toAmount: '',
    exchangeRate: null,
    initialized: false,
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3011'
  }),
  
  getters: {
    hasTokens: (state) => state.tokens.length > 0,
    
    totalFromAmount: (state) => {
      if (state.selectedFromTokens.length === 0) return 0;
      
      return state.selectedFromTokens.reduce((total, token) => {
        const amount = token.amount || '0';
        const price = token.price || '0';
        
        const amountValue = amount === '' ? 0 : Number(amount);
        const priceValue = price === '' ? 0 : Number(price);
        return total + (amountValue * priceValue);
      }, 0);
    },
    
    canSwap: (state) => {
      if (state.selectedFromTokens.length > 0) {
        return state.selectedToToken && 
               state.selectedFromTokens.some(t => {
                 const amount = t.amount || '0';
                 return amount !== '' && amount !== '0';
               }) &&
               !state.isLoading;
      }
      
      return state.selectedFromToken && 
             state.selectedToToken && 
             state.fromAmount !== '' && 
             state.fromAmount !== '0' &&
             !state.isLoading;
    },
    
    isTokenSelected: (state) => (address) => {
      return state.selectedFromTokens.some(t => t.address.toLowerCase() === address.toLowerCase());
    }
  },
  
  actions: {
    async initialize() {
      if (this.initialized) return;
      
      try {
        console.log('Initializing token store...');
        await this.fetchAllTokens();
        this.initialized = true;
        console.log('Token store initialized successfully');
      } catch (error) {
        console.error('Failed to initialize token store:', error);
      }
    },
    
    async fetchAllTokens(chainId = 137) {
      this.isLoadingAllTokens = true;
      const mainStore = useMainStore();
      
      try {
        console.log(`Fetching all available tokens for chain ID: ${chainId}`);
        
        const endpoint = `/tokens/list/${chainId}`;
        console.log('All Tokens API endpoint:', endpoint);
        
        const response = await api.get(endpoint);
        
        if (!response.tokens) {
          throw new Error('Invalid token list response format');
        }
        
        const tokensCount = Object.keys(response.tokens).length;
        console.log('All Tokens API response received:', tokensCount, 'tokens');
        
        if (tokensCount === 0) {
          throw new Error('No tokens received from API');
        }
        
        this.allTokens = response.tokens;
        
        this.addPopularTokens();
        
        return response.tokens;
      } catch (error) {
        console.error('Failed to fetch all tokens:', error);
        mainStore.showNotification(`無法獲取代幣列表：${error.message || '未知錯誤'}`, 'error');
        return {};
      } finally {
        this.isLoadingAllTokens = false;
      }
    },
    
    addPopularTokens() {
      const popularTokenAddresses = [
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
        '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'
      ];
      
      const popularTokens = [];
      
      popularTokenAddresses.forEach(address => {
        const lowercaseAddress = address.toLowerCase();
        const token = this.allTokens[lowercaseAddress];
        
        if (token) {
          popularTokens.push({
            address: lowercaseAddress,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            balance: '0.0000',
            price: '0.00'
          });
        }
      });
      
      if (popularTokens.length > 0) {
        const existingAddresses = new Set(this.tokens.map(t => t.address.toLowerCase()));
        
        popularTokens.forEach(token => {
          if (!existingAddresses.has(token.address)) {
            this.tokens.push(token);
          }
        });
        
        console.log('Added popular tokens to tokens list:', popularTokens.length);
      }
    },
    
    getTokenDetails(tokenAddress) {
      if (!tokenAddress || !this.allTokens) return null;
      return this.allTokens[tokenAddress.toLowerCase()] || null;
    },
    
    async fetchTokens(chainId = 137) {
      this.isLoading = true
      this.tokens = []
      this.error = null
      
      const walletStore = useWalletStore()
      const mainStore = useMainStore()
      
      if (!walletStore.isConnected) {
        this.error = 'Wallet not connected'
        mainStore.showNotification('Please connect your wallet first', 'warning')
        this.isLoading = false
        return
      }
      
      try {
        console.log(`Fetching tokens for wallet: ${walletStore.address}`)
        
        const balanceEndpoint = `/tokens/balances/${chainId}/${walletStore.address}`
        console.log('Balance API endpoint:', balanceEndpoint)
        
        const balanceResponse = await api.get(balanceEndpoint)
        console.log('Balance API response:', balanceResponse)
        
        if (!balanceResponse.balances) {
          throw new Error('Invalid API response format')
        }
        
        const filteredTokens = balanceResponse.balances.filter(token => {
          const balance = token.balance || '0'
          return balance !== '' && balance !== '0'
        })
        
        if (filteredTokens.length === 0) {
          console.log('No tokens found with balance')
          this.error = 'No tokens found with balance'
          this.isLoading = false
          return
        }
        
        const tokenAddresses = filteredTokens.map(token => token.token).join(',')
        const priceEndpoint = `/tokens/prices/${chainId}/${tokenAddresses}`
        console.log('Price API endpoint:', priceEndpoint)
        
        const priceResponse = await api.get(priceEndpoint)
        console.log('Price API response:', priceResponse)
        
        this.tokens = filteredTokens.map(token => ({
          address: token.token,
          balance: token.balance,
          price: priceResponse[token.token] || '0.00'
        }))
        
        console.log('Final token list:', this.tokens)
      } catch (error) {
        console.error('Failed to fetch tokens:', error)
        this.error = error.response?.data?.message || error.message || 'Failed to fetch tokens'
        mainStore.showNotification(`Failed to fetch tokens: ${this.error}`, 'error')
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchTokenPrice(address, chainId = 137) {
      try {
        const priceEndpoint = `/tokens/prices/${chainId}/${address.toLowerCase()}`;
        const priceResponse = await api.get(priceEndpoint);
        
        if (priceResponse && priceResponse[address.toLowerCase()]) {
          return priceResponse[address.toLowerCase()];
        }
        return '0.00';
      } catch (error) {
        console.error('Failed to fetch token price:', error);
        return '0.00';
      }
    },
    
    selectFromToken(address) {
      // 如果是用戶代幣列表中的代幣
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedFromToken = token;
        this.calculateExchangeRate();
        return;
      } 
      
      if (this.allTokens[address.toLowerCase()]) {
        // 如果是所有代幣列表中的代幣
        const tokenInfo = this.allTokens[address.toLowerCase()];
        this.selectedFromToken = {
          address: address.toLowerCase(),
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
          balance: '0.0000',
          price: '0.00'
        };
        
        // 獲取價格信息
        this.fetchTokenPrice(address).then(price => {
          if (this.selectedFromToken && this.selectedFromToken.address === address.toLowerCase()) {
            this.selectedFromToken.price = price;
            this.calculateExchangeRate();
          }
        });
        
        this.calculateExchangeRate();
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    selectToToken(address) {
      // 如果是用戶代幣列表中的代幣
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedToToken = token;
        this.calculateExchangeRate();
        return;
      }
      
      if (this.allTokens[address.toLowerCase()]) {
        // 如果是所有代幣列表中的代幣
        const tokenInfo = this.allTokens[address.toLowerCase()];
        this.selectedToToken = {
          address: address.toLowerCase(),
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
          balance: '0.0000',
          price: '0.00'
        };
        
        // 獲取價格信息
        this.fetchTokenPrice(address).then(price => {
          if (this.selectedToToken && this.selectedToToken.address === address.toLowerCase()) {
            this.selectedToToken.price = price;
            this.calculateExchangeRate();
          }
        });
        
        this.calculateExchangeRate();
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    swapTokens() {
      const temp = this.selectedFromToken
      this.selectedFromToken = this.selectedToToken
      this.selectedToToken = temp
      
      this.fromAmount = ''
      this.toAmount = ''
      
      this.calculateExchangeRate()
    },
    
    calculateExchangeRate() {
      if (!this.selectedFromToken || !this.selectedToToken) {
        this.exchangeRate = null
        return
      }
      
      try {
        const fromPrice = parseFloat(this.selectedFromToken.price)
        const toPrice = parseFloat(this.selectedToToken.price)
        
        if (fromPrice > 0 && toPrice > 0) {
          this.exchangeRate = (fromPrice / toPrice).toFixed(6)
          this.calculateToAmount()
        } else {
          this.exchangeRate = 'Unknown'
        }
      } catch (error) {
        console.error('Error calculating exchange rate:', error)
        this.exchangeRate = 'Error'
      }
    },
    
    calculateToAmount() {
      if (!this.fromAmount || !this.exchangeRate || this.exchangeRate === 'Unknown' || this.exchangeRate === 'Error') {
        this.toAmount = ''
        return
      }
      
      // 使用 Number 替代 parseFloat，並確保處理空字符串的情況
      const amount = this.fromAmount === '' ? 0 : Number(this.fromAmount)
      const rate = this.exchangeRate === '' ? 0 : Number(this.exchangeRate)
      
      if (!isNaN(amount) && !isNaN(rate)) {
        this.toAmount = (amount * rate).toFixed(6)
      } else {
        this.toAmount = ''
      }
    },
    
    setFromAmount(amount) {
      this.fromAmount = amount
      this.calculateToAmount()
    },
    
    async approveToken() {
      if (!this.canSwap) return
      
      const mainStore = useMainStore()
      
      try {
        console.log('Approving token transfer...')
        
        const payload = {
          chainId: 137,
          tokens: [this.selectedFromToken.address],
          amounts: [this.fromAmount]
        }
        
        console.log('Approval request payload:', payload)
        const response = await api.post('/convert/approve', payload)
        
        console.log('Approval response:', response)
        return response
      } catch (error) {
        console.error('Token approval failed:', error)
        const errorMsg = error.response?.data?.message || error.message || 'Token approval failed'
        mainStore.showNotification(`Approval failed: ${errorMsg}`, 'error')
        throw new Error(errorMsg)
      }
    },
    
    async executeSwap() {
      const walletStore = useWalletStore()
      const mainStore = useMainStore()
      
      try {
        console.log('Executing swap...')
        console.log('From token:', this.selectedFromToken.address)
        console.log('To token:', this.selectedToToken.address)
        console.log('Amount:', this.fromAmount)
        
        const payload = {
          chainId: 137,
          userAddress: walletStore.address,
          tokens: [this.selectedFromToken.address],
          amounts: [this.fromAmount],
          dstTokenAddress: this.selectedToToken.address
        }
        
        console.log('Swap request payload:', payload)
        const response = await api.post('/convert/swap', payload)
        
        console.log('Swap response:', response)
        return response
      } catch (error) {
        console.error('Swap execution failed:', error)
        const errorMsg = error.response?.data?.message || error.message || 'Swap execution failed'
        mainStore.showNotification(`Swap failed: ${errorMsg}`, 'error')
        throw new Error(errorMsg)
      }
    },
    
    reset() {
      this.selectedFromToken = null
      this.selectedToToken = null
      this.fromAmount = ''
      this.toAmount = ''
      this.exchangeRate = null
    },
    
    // 添加代幣到多選列表
    toggleFromToken(address) {
      // 檢查 token 是否已在選擇列表中
      const index = this.selectedFromTokens.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
      
      // 如果已選擇，則移除
      if (index !== -1) {
        this.selectedFromTokens.splice(index, 1);
        // 如果列表已空，重置狀態
        if (this.selectedFromTokens.length === 0) {
          this.fromAmount = '';
          this.toAmount = '';
        } else {
          // 重新計算交換比率
          this.calculateMultiTokenExchangeRate();
        }
        return;
      }
      
      // 如果未選擇，則添加
      // 先查找 token 詳情
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        // 添加到選擇列表，初始設置 amount 為 0
        this.selectedFromTokens.push({
          ...token,
          amount: '0'
        });
        
        this.calculateMultiTokenExchangeRate();
        return;
      }
      
      // 嘗試從 allTokens 中查找
      if (this.allTokens[address.toLowerCase()]) {
        const tokenInfo = this.allTokens[address.toLowerCase()];
        const newToken = {
          address: address.toLowerCase(),
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
          balance: '0.0000',
          price: '0.00',
          amount: '0'
        };
        
        // 獲取價格信息
        this.fetchTokenPrice(address).then(price => {
          const tokenIndex = this.selectedFromTokens.findIndex(t => t.address === address.toLowerCase());
          if (tokenIndex !== -1) {
            this.selectedFromTokens[tokenIndex].price = price;
            this.calculateMultiTokenExchangeRate();
          }
        });
        
        this.selectedFromTokens.push(newToken);
        this.calculateMultiTokenExchangeRate();
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    // 更新多選 token 的數量
    updateFromTokenAmount(address, amount) {
      const index = this.selectedFromTokens.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
      if (index !== -1) {
        this.selectedFromTokens[index].amount = String(amount);
        this.calculateMultiTokenExchangeRate();
      }
    },
    
    // 計算多選 token 的交換比率
    calculateMultiTokenExchangeRate() {
      if (this.selectedFromTokens.length === 0 || !this.selectedToToken) {
        this.exchangeRate = null;
        this.toAmount = '';
        return;
      }
      
      try {
        // 計算所有選擇的 from tokens 的價值總額，避免直接使用 parseFloat
        const totalFromValue = this.selectedFromTokens.reduce((total, token) => {
          const amount = token.amount || '0';
          const price = token.price || '0';
          
          // 只在計算時轉換為數字
          const amountValue = amount === '' ? 0 : Number(amount);
          const priceValue = price === '' ? 0 : Number(price);
          
          return total + (amountValue * priceValue);
        }, 0);
        
        const toPrice = Number(this.selectedToToken.price || '0');
        
        if (totalFromValue > 0 && toPrice > 0) {
          // 計算能獲得的目標 token 數量，最後才轉換為字符串
          this.toAmount = (totalFromValue / toPrice).toFixed(6);
        } else {
          this.toAmount = '';
        }
      } catch (error) {
        console.error('Error calculating multi-token exchange rate:', error);
        this.toAmount = '';
      }
    },
    
    // 清空所有已選擇的 from tokens
    clearSelectedFromTokens() {
      this.selectedFromTokens = [];
      this.fromAmount = '';
      this.toAmount = '';
      this.exchangeRate = null;
    }
  }
}) 