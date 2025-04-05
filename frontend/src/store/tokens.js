import { defineStore } from 'pinia'
import api from '../utils/api'
import { useWalletStore } from './wallet'
import { useMainStore } from './main'
import { formatBalance, formatCurrency, formatAddress } from '../utils/formatter'

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
    
    // 格式化代幣餘額，將 Wei 轉換為可讀格式
    formattedBalances: (state) => {
      const result = {};
      
      state.tokens.forEach(token => {
        const address = token.address.toLowerCase();
        const tokenInfo = state.allTokens[address];
        const decimals = tokenInfo?.decimals || 18;
        
        try {
          const rawBalance = token.balance || '0';
          const balanceValue = formatBalance(rawBalance, decimals);
          const numValue = parseFloat(balanceValue);
          
          if (numValue < 0.000001 && numValue > 0) {
            result[address] = '<0.000001';
          } else {
            result[address] = numValue.toLocaleString('en-US', {
              maximumFractionDigits: 6,
              minimumFractionDigits: 2
            });
          }
        } catch (error) {
          console.error('Error formatting balance for', address, error);
          result[address] = '0.00';
        }
      });
      
      return result;
    },
    
    // 格式化代幣價格
    formattedPrices: (state) => {
      const result = {};
      
      state.tokens.forEach(token => {
        try {
          const address = token.address.toLowerCase();
          result[address] = formatCurrency(parseFloat(token.price) || 0);
        } catch (error) {
          console.error(`格式化價格錯誤: ${token.address}`, error);
          result[token.address.toLowerCase()] = '$0.00';
        }
      });
      
      return result;
    },
    
    // 格式化代幣完整信息
    formattedTokens: (state) => {
      return state.tokens.map(token => {
        try {
          const address = token.address.toLowerCase();
          const tokenInfo = state.allTokens[address];
          const decimals = tokenInfo?.decimals || 18;
          const rawBalance = token.balance || '0';
          
          // 處理餘額
          const balanceValue = formatBalance(rawBalance, decimals);
          const numBalance = parseFloat(balanceValue);
          
          let formattedBalance;
          if (numBalance < 0.000001 && numBalance > 0) {
            formattedBalance = '<0.000001';
          } else {
            formattedBalance = numBalance.toLocaleString('en-US', {
              maximumFractionDigits: 6,
              minimumFractionDigits: 2
            });
          }
          
          // 處理價格 (USD)
          const price = parseFloat(token.price || '0');
          const formattedPrice = formatCurrency(price);
          
          // 計算代幣價值 (USD)
          const tokenValue = numBalance * price;
          const valueUSD = tokenValue < 0.01 && tokenValue > 0
            ? '< $0.01'
            : formatCurrency(tokenValue);
          
          return {
            ...token,
            formattedBalance,
            formattedPrice,
            valueUSD,
            // 添加原始值方便调试
            rawPrice: token.price,
            rawBalance: token.balance
          };
        } catch (error) {
          console.error('Error formatting token data for', token.address, error);
          return {
            ...token,
            formattedBalance: '0.00',
            formattedPrice: '$0.00',
            valueUSD: '$0.00'
          };
        }
      });
    },
    
    // 計算多選代幣的總價值
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
    
    // 檢查是否可以執行交換
    canSwap: (state) => {
      // 多選模式
      if (state.selectedFromTokens.length > 0) {
        return state.selectedToToken && 
               state.selectedFromTokens.some(t => {
                 const amount = t.amount || '0';
                 return amount !== '' && amount !== '0';
               }) &&
               !state.isLoading;
      }
      
      // 單選模式
      return state.selectedFromToken && 
             state.selectedToToken && 
             state.fromAmount !== '' && 
             state.fromAmount !== '0' &&
             !state.isLoading;
    },
    
    // 檢查代幣是否被選中
    isTokenSelected: (state) => (address) => 
      state.selectedFromTokens.some(t => t.address.toLowerCase() === address.toLowerCase())
  },
  
  actions: {
    // 初始化 token store
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
    
    // 獲取所有可用代幣列表
    async fetchAllTokens(chainId = 137) {
      this.isLoadingAllTokens = true;
      const mainStore = useMainStore();
      
      try {
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
    
    // 添加熱門代幣到列表
    addPopularTokens() {
      const popularTokenAddresses = [
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // MATIC
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
        '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // WBTC
        '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'  // DAI
      ];
      
      // 篩選有效的熱門代幣
      const popularTokens = popularTokenAddresses
        .map(address => address.toLowerCase())
        .filter(address => this.allTokens[address])
        .map(address => {
          const token = this.allTokens[address];
          return {
            address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            balance: '0.0000',
            price: '0.00'
          };
        });
      
      if (popularTokens.length > 0) {
        const existingAddresses = new Set(this.tokens.map(t => t.address.toLowerCase()));
        
        // 添加尚未存在的熱門代幣
        popularTokens.forEach(token => {
          if (!existingAddresses.has(token.address)) {
            this.tokens.push(token);
          }
        });
        
        console.log('Added popular tokens to tokens list:', popularTokens.length);
      }
    },
    
    // 獲取代幣詳情
    getTokenDetails(tokenAddress) {
      if (!tokenAddress || !this.allTokens) return null;
      return this.allTokens[tokenAddress.toLowerCase()] || null;
    },
    
    // 獲取用戶持有的代幣列表
    async fetchTokens(chainId = 137) {
      this.isLoading = true;
      this.tokens = [];
      this.error = null;
      
      const walletStore = useWalletStore();
      const mainStore = useMainStore();
      
      if (!walletStore.isConnected) {
        this.error = 'Wallet not connected';
        mainStore.showNotification('Please connect your wallet first', 'warning');
        this.isLoading = false;
        return;
      }
      
      try {
        // 獲取錢包餘額
        const balanceEndpoint = `/tokens/balances/${chainId}/${walletStore.address}`;
        console.log('請求代幣餘額:', balanceEndpoint);
        const balanceResponse = await api.get(balanceEndpoint);
        
        if (!balanceResponse.balances) {
          throw new Error('Invalid API response format');
        }
        
        console.log('餘額響應:', balanceResponse.balances.length, '個代幣');
        
        // 過濾有餘額的代幣
        const filteredTokens = balanceResponse.balances.filter(token => {
          const balance = token.balance || '0';
          return balance !== '' && balance !== '0';
        });
        
        console.log('過濾後有餘額的代幣:', filteredTokens.length, '個');
        
        if (filteredTokens.length === 0) {
          this.error = 'No tokens found with balance';
          this.isLoading = false;
          return;
        }
        
        // 準備代幣地址數組用於批量查詢價格
        const tokenAddresses = filteredTokens.map(token => token.token.toLowerCase());
        console.log('準備批量查詢價格: 共', tokenAddresses.length, '個代幣');
        
        // 使用批量查詢方法獲取所有代幣價格
        const priceMap = await this.fetchTokenPrice(tokenAddresses, chainId);
        console.log('批量查詢價格完成', Object.keys(priceMap).length, '個結果');
        
        // 組合代幣信息，確保價格正確處理
        this.tokens = filteredTokens.map(token => {
          const address = token.token.toLowerCase();
          const price = priceMap[address] || '0';
          
          const tokenInfo = {
            address: token.token,
            balance: token.balance,
            price: price
          };
          
          // 確保代幣信息正確
          console.log(`代幣 ${address} 餘額: ${token.balance}, 價格: ${price}`);
          
          return tokenInfo;
        });
        
        console.log('設置完成: 共', this.tokens.length, '個代幣');
        
        // 檢查是否所有代幣都有價格
        const tokensWithoutPrice = this.tokens.filter(token => !token.price || token.price === '0');
        if (tokensWithoutPrice.length > 0) {
          console.warn('以下代幣沒有價格:', tokensWithoutPrice.map(t => t.address));
        }
      } catch (error) {
        console.error('獲取代幣失敗:', error);
        this.error = error.response?.data?.message || error.message || 'Failed to fetch tokens';
        mainStore.showNotification(`Failed to fetch tokens: ${this.error}`, 'error');
      } finally {
        this.isLoading = false;
      }
    },
    
    // 獲取單個或多個代幣價格
    async fetchTokenPrice(addresses, chainId = 137) {
      // 如果請求為空，直接返回空對象
      if (!addresses || (Array.isArray(addresses) && addresses.length === 0)) {
        return {};
      }
      console.log('fetchTokenPrice 被触发，地址:', Array.isArray(addresses) ? addresses : [addresses]);
      
      const addressArray = Array.isArray(addresses) ? addresses : [addresses];
      const normalizedAddresses = addressArray.map(addr => addr.toLowerCase());
      
      console.log('獲取價格: 共', normalizedAddresses.length, '個代幣');
      
      try {
        // 將地址連接成逗號分隔的字符串
        const addressesString = normalizedAddresses.join(',');
        const priceEndpoint = `/tokens/prices/${chainId}/${addressesString}`;
        
        console.log('價格API請求:', priceEndpoint);
        
        // 執行API請求獲取價格
        const response = await api.get(priceEndpoint);
        console.log('價格API響應:', response);
        
        // 如果API響應為空或無效，返回空對象
        if (!response) {
          console.error('價格API返回空響應');
          return {};
        }
        
        // 處理API返回的結果 - 確保所有地址都有價格（即使是0）
        const result = {};
        
        normalizedAddresses.forEach(address => {
          // 獲取API返回的價格或默認為0
          const price = response[address] || '0';
          result[address] = price;
          
          // 記錄每個代幣獲取到的價格
          console.log(`代幣 ${address} 價格: ${price}`);
        });
        
        // 如果只獲取一個代幣價格，返回價格值
        if (normalizedAddresses.length === 1 && !Array.isArray(addresses)) {
          return result[normalizedAddresses[0]];
        }
        
        // 否則返回價格映射
        return result;
      } catch (error) {
        console.error('獲取價格失敗:', error);
        
        // 生成默認結果
        if (Array.isArray(addresses) || normalizedAddresses.length > 1) {
          const defaultResult = {};
          normalizedAddresses.forEach(address => {
            defaultResult[address] = '0';
          });
          return defaultResult;
        }
        
        return '0';
      }
    },
    
    // 同時更新來源和目標代幣的價格
    async updateSwapTokenPrices() {
      const addresses = new Set();
      
      // 收集需要更新價格的代幣地址
      if (this.selectedFromToken) {
        addresses.add(this.selectedFromToken.address.toLowerCase());
      }
      
      if (this.selectedToToken) {
        addresses.add(this.selectedToToken.address.toLowerCase());
      }
      
      // 如果有多選模式的代幣，也加入
      this.selectedFromTokens.forEach(token => {
        addresses.add(token.address.toLowerCase());
      });
      
      const uniqueAddresses = [...addresses];
      
      if (uniqueAddresses.length === 0) {
        console.log('沒有需要更新價格的代幣');
        return;
      }
      
      console.log('更新交換代幣價格:', uniqueAddresses.join(', '));
      
      // 獲取最新價格
      const priceMap = await this.fetchTokenPrice(uniqueAddresses);
      
      // 更新代幣價格
      this.updatePricesWithMap(priceMap);
      
      return priceMap;
    },
    
    // 使用價格映射更新代幣價格
    updatePricesWithMap(priceMap) {
      if (!priceMap || Object.keys(priceMap).length === 0) {
        console.log('沒有有效的價格數據可更新');
        return;
      }
      
      // 更新tokens數組中的價格
      this.tokens.forEach((token, index) => {
        const address = token.address.toLowerCase();
        if (priceMap[address]) {
          this.tokens[index].price = priceMap[address];
          console.log(`更新代幣列表中 ${address} 價格為 ${priceMap[address]}`);
        }
      });
      
      // 更新selectedFromToken
      if (this.selectedFromToken) {
        const fromAddress = this.selectedFromToken.address.toLowerCase();
        if (priceMap[fromAddress]) {
          this.selectedFromToken.price = priceMap[fromAddress];
          console.log(`更新來源代幣 ${fromAddress} 價格為 ${priceMap[fromAddress]}`);
        }
      }
      
      // 更新selectedToToken
      if (this.selectedToToken) {
        const toAddress = this.selectedToToken.address.toLowerCase();
        if (priceMap[toAddress]) {
          this.selectedToToken.price = priceMap[toAddress];
          console.log(`更新目標代幣 ${toAddress} 價格為 ${priceMap[toAddress]}`);
        }
      }
      
      // 更新多選代幣價格
      this.selectedFromTokens.forEach((token, index) => {
        const address = token.address.toLowerCase();
        if (priceMap[address]) {
          this.selectedFromTokens[index].price = priceMap[address];
          console.log(`更新多選代幣 ${address} 價格為 ${priceMap[address]}`);
        }
      });
      
      // 重新計算匯率
      if (this.selectedFromToken && this.selectedToToken) {
        this.calculateExchangeRate();
      }
      
      if (this.selectedFromTokens.length > 0 && this.selectedToToken) {
        this.calculateMultiTokenExchangeRate();
      }
    },
    
    // 根據給定的地址更新多個代幣的價格
    async updateTokenPrices(addresses, chainId = 137) {
      if (!addresses || (Array.isArray(addresses) && addresses.length === 0)) {
        console.log('沒有地址需要更新價格');
        return;
      }
      
      const addressesToFetch = Array.isArray(addresses) ? addresses : [addresses];
      console.log('更新以下代幣價格:', addressesToFetch.join(', '));
      
      // 獲取最新價格
      const priceMap = await this.fetchTokenPrice(addressesToFetch, chainId);
      
      // 使用統一方法更新價格
      this.updatePricesWithMap(priceMap);
      
      return priceMap;
    },
    
    // 選擇要交換的來源代幣
    selectFromToken(address) {
      // 從用戶持有的代幣中查找
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedFromToken = token;
        this.calculateExchangeRate();
        return;
      } 
      
      // 從所有代幣中查找
      if (this.allTokens[address.toLowerCase()]) {
        const tokenInfo = this.allTokens[address.toLowerCase()];
        this.selectedFromToken = {
          address: address.toLowerCase(),
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
          balance: '0.0000',
          price: '0.00'
        };
        
        // 同時更新來源和目標代幣的價格
        this.updateSwapTokenPrices();
        
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    // 選擇要交換的目標代幣
    selectToToken(address) {
      // 從用戶持有的代幣中查找
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedToToken = token;
        this.calculateExchangeRate();
        return;
      }
      
      // 從所有代幣中查找
      if (this.allTokens[address.toLowerCase()]) {
        const tokenInfo = this.allTokens[address.toLowerCase()];
        this.selectedToToken = {
          address: address.toLowerCase(),
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
          balance: '0.0000',
          price: '0.00'
        };
        
        // 同時更新來源和目標代幣的價格
        this.updateSwapTokenPrices();
        
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    // 交換來源和目標代幣
    swapTokens() {
      const temp = this.selectedFromToken;
      this.selectedFromToken = this.selectedToToken;
      this.selectedToToken = temp;
      
      this.fromAmount = '';
      this.toAmount = '';
      
      // 交換後更新價格
      this.updateSwapTokenPrices();
    },
    
    // 計算交換比率
    calculateExchangeRate() {
      if (!this.selectedFromToken || !this.selectedToToken) {
        this.exchangeRate = null;
        return;
      }
      
      try {
        // 確保價格為有效數值
        const fromPrice = parseFloat(this.selectedFromToken.price) || 0;
        const toPrice = parseFloat(this.selectedToToken.price) || 0;
        
        // 檢查價格是否有效
        if (fromPrice <= 0 || toPrice <= 0) {
          console.warn(`無效的價格: fromPrice=${fromPrice}, toPrice=${toPrice}`);
          this.exchangeRate = null;
          return;
        }
        
        // 計算匯率 (1個來源代幣可兌換多少目標代幣)
        this.exchangeRate = (fromPrice / toPrice).toFixed(6);
        console.log(`匯率: 1 ${this.selectedFromToken.symbol || '來源代幣'} = ${this.exchangeRate} ${this.selectedToToken.symbol || '目標代幣'}`);
        
        // 如果有輸入數量，計算輸出數量
        this.calculateToAmount();
      } catch (error) {
        console.error('計算匯率錯誤:', error);
        this.exchangeRate = null;
      }
    },
    
    // 計算兌換後的目標代幣數量
    calculateToAmount() {
      // 如果沒有有效匯率或來源數量，則清空目標數量
      if (!this.exchangeRate || !this.fromAmount || this.exchangeRate === null) {
        this.toAmount = '';
        return;
      }
      
      try {
        // 解析數量和匯率為數值
        const amount = parseFloat(this.fromAmount) || 0;
        const rate = parseFloat(this.exchangeRate) || 0;
        
        // 檢查數值有效性
        if (amount <= 0 || rate <= 0) {
          this.toAmount = '';
          return;
        }
        
        // 計算目標數量並格式化
        const result = amount * rate;
        this.toAmount = result.toFixed(6);
        console.log(`計算兌換: ${amount} * ${rate} = ${this.toAmount}`);
      } catch (error) {
        console.error('計算目標數量錯誤:', error);
        this.toAmount = '';
      }
    },
    
    // 設置要交換的來源代幣數量
    setFromAmount(amount) {
      this.fromAmount = amount;
      this.calculateToAmount();
    },
    
    // Token 授權
    async approveToken() {
      if (!this.canSwap) return;
      
      const mainStore = useMainStore();
      
      try {
        const payload = {
          chainId: 137,
          tokens: [this.selectedFromToken.address],
          amounts: [this.fromAmount]
        };
        
        const response = await api.post('/convert/approve', payload);
        return response;
      } catch (error) {
        console.error('Token approval failed:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Token approval failed';
        mainStore.showNotification(`Approval failed: ${errorMsg}`, 'error');
        throw new Error(errorMsg);
      }
    },
    
    // 執行代幣交換
    async executeSwap() {
      const walletStore = useWalletStore();
      const mainStore = useMainStore();
      
      try {
        const payload = {
          chainId: 137,
          userAddress: walletStore.address,
          tokens: [this.selectedFromToken.address],
          amounts: [this.fromAmount],
          dstTokenAddress: this.selectedToToken.address
        };
        
        const response = await api.post('/convert/swap', payload);
        return response;
      } catch (error) {
        console.error('Swap execution failed:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Swap execution failed';
        mainStore.showNotification(`Swap failed: ${errorMsg}`, 'error');
        throw new Error(errorMsg);
      }
    },
    
    // 重置交換狀態
    reset() {
      this.selectedFromToken = null;
      this.selectedToToken = null;
      this.fromAmount = '';
      this.toAmount = '';
      this.exchangeRate = null;
    },
    
    // 添加/移除多選代幣
    toggleFromToken(address) {
      // 檢查是否已選擇
      const index = this.selectedFromTokens.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
      
      // 如果已選擇，則移除
      if (index !== -1) {
        this.selectedFromTokens.splice(index, 1);
        
        if (this.selectedFromTokens.length === 0) {
          this.fromAmount = '';
          this.toAmount = '';
        } else {
          this.calculateMultiTokenExchangeRate();
        }
        return;
      }
      
      // 如果未選擇，則添加
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedFromTokens.push({
          ...token,
          amount: '0'
        });
        
        this.calculateMultiTokenExchangeRate();
        return;
      }
      
      // 嘗試從所有代幣中查找
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
        
        this.selectedFromTokens.push(newToken);
        
        // 更新新增代幣的價格以及其他相關代幣
        this.updateSwapTokenPrices();
        
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    // 更新多選代幣數量
    updateFromTokenAmount(address, amount) {
      const index = this.selectedFromTokens.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
      if (index !== -1) {
        this.selectedFromTokens[index].amount = String(amount);
        this.calculateMultiTokenExchangeRate();
      }
    },
    
    // 計算多代幣交換比率
    calculateMultiTokenExchangeRate() {
      if (this.selectedFromTokens.length === 0 || !this.selectedToToken) {
        this.exchangeRate = null;
        this.toAmount = '';
        return;
      }
      
      try {
        // 計算所有來源代幣的總價值
        let totalFromValue = 0;
        let hasValidAmount = false;
        
        // 遍歷所有選定的代幣
        this.selectedFromTokens.forEach(token => {
          // 獲取代幣數量和價格
          const amount = parseFloat(token.amount) || 0;
          const price = parseFloat(token.price) || 0;
          
          // 只有有效數值才納入計算
          if (amount > 0 && price > 0) {
            totalFromValue += amount * price;
            hasValidAmount = true;
          }
        });
        
        // 如果沒有有效輸入或總價值為0，清空輸出
        if (!hasValidAmount || totalFromValue <= 0) {
          this.toAmount = '';
          return;
        }
        
        // 獲取目標代幣價格
        const toPrice = parseFloat(this.selectedToToken.price) || 0;
        
        // 如果目標代幣價格無效，清空輸出
        if (toPrice <= 0) {
          console.warn('目標代幣價格無效:', toPrice);
          this.toAmount = '';
          return;
        }
        
        // 計算可兌換的目標代幣數量
        const toAmount = totalFromValue / toPrice;
        this.toAmount = toAmount.toFixed(6);
        
        console.log(`多代幣兌換: 總價值$${totalFromValue.toFixed(2)} / $${toPrice} = ${this.toAmount} ${this.selectedToToken.symbol || '目標代幣'}`);
      } catch (error) {
        console.error('計算多代幣匯率錯誤:', error);
        this.toAmount = '';
      }
    },
    
    // 清空已選擇的多選代幣
    clearSelectedFromTokens() {
      this.selectedFromTokens = [];
      this.fromAmount = '';
      this.toAmount = '';
      this.exchangeRate = null;
    },

    // 批量获取多个代币价格
    async batchFetchTokenPrices(addresses, chainId = 137) {
      if (!addresses || addresses.length === 0) return {};
      
      console.log('批量获取代币价格:', addresses);
      return await this.fetchTokenPrice(addresses, chainId);
    },

    // 根据给定的地址更新多个代币的价格
    updateTokenPrices(addresses, chainId = 137) {
      if (!addresses || addresses.length === 0) return;
      
      const addressesToFetch = Array.isArray(addresses) ? addresses : [addresses];
      console.log('更新以下代币价格:', addressesToFetch);
      
      this.batchFetchTokenPrices(addressesToFetch, chainId).then(priceMap => {
        // 更新 tokens 数组中的价格
        this.tokens.forEach(token => {
          const address = token.address.toLowerCase();
          if (priceMap[address]) {
            token.price = priceMap[address];
            console.log(`更新代币 ${address} 价格为 ${token.price}`);
          }
        });
        
        // 检查并更新 selectedFromToken 价格
        if (this.selectedFromToken && priceMap[this.selectedFromToken.address.toLowerCase()]) {
          this.selectedFromToken.price = priceMap[this.selectedFromToken.address.toLowerCase()];
          console.log(`更新来源代币 ${this.selectedFromToken.address} 价格为 ${this.selectedFromToken.price}`);
        }
        
        // 检查并更新 selectedToToken 价格
        if (this.selectedToToken && priceMap[this.selectedToToken.address.toLowerCase()]) {
          this.selectedToToken.price = priceMap[this.selectedToToken.address.toLowerCase()];
          console.log(`更新目标代币 ${this.selectedToToken.address} 价格为 ${this.selectedToToken.price}`);
        }
        
        // 更新多选模式下的代币价格
        this.selectedFromTokens.forEach((token, index) => {
          const address = token.address.toLowerCase();
          if (priceMap[address]) {
            this.selectedFromTokens[index].price = priceMap[address];
            console.log(`更新多选代币 ${address} 价格为 ${this.selectedFromTokens[index].price}`);
          }
        });
        
        // 重新计算汇率
        this.calculateExchangeRate();
        if (this.selectedFromTokens.length > 0) {
          this.calculateMultiTokenExchangeRate();
        }
      });
    }
  }
}) 