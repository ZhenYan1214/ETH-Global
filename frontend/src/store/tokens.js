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
    toTokenFee:null,
    predictToAmount: null,
    fromAmount: '',
    toAmount: '',
    exchangeRate: null,
    initialized: false,
    lastFetchTimestamp: 0,
    tokenCacheExpiry: 60000, // 1 minute cache expiry
    cachedBalances: null,
    cachedPrices: {},
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3011'
  }),
  
  getters: {
    hasTokens: (state) => state.tokens.length > 0,
    
    // Format token balances, convert Wei to readable format
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
    
    // Format token prices
    formattedPrices: (state) => {
      const result = {};
      
      state.tokens.forEach(token => {
        try {
          const address = token.address.toLowerCase();
          result[address] = formatCurrency(parseFloat(token.price) || 0);
        } catch (error) {
          console.error(`Error formatting price: ${token.address}`, error);
          result[token.address.toLowerCase()] = '$0.00';
        }
      });
      
      return result;
    },
    
    // Format complete token information
    formattedTokens: (state) => {
      return state.tokens.map(token => {
        try {
          const address = token.address.toLowerCase();
          const tokenInfo = state.allTokens[address];
          const decimals = tokenInfo?.decimals || 18;
          const rawBalance = token.balance || '0';
          
          // Process balance
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
          
          // Process price (USD)
          const price = parseFloat(token.price || '0');
          const formattedPrice = formatCurrency(price);
          
          // Calculate token value (USD)
          const tokenValue = numBalance * price;
          const valueUSD = tokenValue < 0.01 && tokenValue > 0
            ? '< $0.01'
            : formatCurrency(tokenValue);
          
          return {
            ...token,
            formattedBalance,
            formattedPrice,
            valueUSD,
            // Add raw values for debugging
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
    
    // Calculate total value of selected tokens
    totalFromAmount: (state) => {
      if (state.selectedFromTokens.length === 0) return 0;
      
      return state.selectedFromTokens.reduce((total, token) => {
        const amount = token.amount || '0';
        const price = token.price || '0';
        
        // If amount or price is invalid, skip this token
        if (amount === '' || amount === '0' || parseFloat(price) <= 0) {
          return total;
        }
        
        // Get token decimals
        const address = token.address.toLowerCase();
        const tokenInfo = state.allTokens[address];
        const decimals = tokenInfo?.decimals || 18;
        
        // Convert from smallest unit to standard unit based on decimals
        const normalizedAmount = parseFloat(amount) / Math.pow(10, decimals);
        
        // Calculate USD value and add to total
        const tokenValue = normalizedAmount * parseFloat(price);
        
        return total + tokenValue;
      }, 0);
    },
    
    // Check if swap can be executed
    canSwap: (state) => {
      // Multi-select mode
      if (state.selectedFromTokens.length > 0) {
        return state.selectedToToken && 
               state.selectedFromTokens.some(t => {
                 const amount = t.amount || '0';
                 return amount !== '' && amount !== '0';
               }) &&
               !state.isLoading;
      }
      
      // Single-select mode
      return state.selectedFromToken && 
             state.selectedToToken && 
             state.fromAmount !== '' && 
             state.fromAmount !== '0' &&
             !state.isLoading;
    },
    
    // Check if token is selected
    isTokenSelected: (state) => (address) => 
      state.selectedFromTokens.some(t => t.address.toLowerCase() === address.toLowerCase())
  },
  
  actions: {
    // Initialize token store
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
    
    // Storage for caching
    saveToCache(key, data, expiry = this.tokenCacheExpiry) {
      try {
        const cacheItem = {
          data,
          expiry: Date.now() + expiry
        };
        localStorage.setItem(`token_cache_${key}`, JSON.stringify(cacheItem));
        console.log(`Cached data for ${key}`);
      } catch (e) {
        console.warn('Failed to save to cache:', e);
      }
    },
    
    getFromCache(key) {
      try {
        const cached = localStorage.getItem(`token_cache_${key}`);
        if (!cached) return null;
        
        const cacheItem = JSON.parse(cached);
        if (Date.now() > cacheItem.expiry) {
          // Cache expired
          localStorage.removeItem(`token_cache_${key}`);
          return null;
        }
        
        console.log(`Using cached data for ${key}`);
        return cacheItem.data;
      } catch (e) {
        console.warn('Failed to read from cache:', e);
        return null;
      }
    },
    
    // Fetch all available tokens
    async fetchAllTokens(chainId = 137) {
      this.isLoadingAllTokens = true;
      const mainStore = useMainStore();
      
      try {
        // Check cache first
        const cachedTokens = this.getFromCache(`all_tokens_${chainId}`);
        if (cachedTokens && Object.keys(cachedTokens).length > 0) {
          this.allTokens = cachedTokens;
          this.addPopularTokens();
          this.isLoadingAllTokens = false;
          return cachedTokens;
        }
        
        const endpoint = `/tokens/list/${chainId}`;
        console.log('All Tokens API endpoint:', endpoint);
        
        const response = await api.get(endpoint);
        
        if (!response || !response.tokens) {
          throw new Error('Invalid token list response format');
        }
        
        const tokensCount = Object.keys(response.tokens).length;
        console.log('All Tokens API response received:', tokensCount, 'tokens');
        
        if (tokensCount === 0) {
          throw new Error('No tokens received from API');
        }
        
        this.allTokens = response.tokens;
        
        // Cache the tokens for 1 hour (tokens list changes less frequently)
        this.saveToCache(`all_tokens_${chainId}`, response.tokens, 3600000);
        
        this.addPopularTokens();
        
        return response.tokens;
      } catch (error) {
        console.error('Failed to fetch all tokens:', error);
        mainStore.showNotification(`Unable to get token list: ${error.message || 'Unknown error'}`, 'error');
        
        // Try to load from local storage even if expired as a last resort
        try {
          const key = `token_cache_all_tokens_${chainId}`;
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheItem = JSON.parse(cached);
            console.log('Using expired cache as fallback for token list');
            this.allTokens = cacheItem.data;
            this.addPopularTokens();
            return cacheItem.data;
          }
        } catch (e) {
          console.warn('Failed to load expired cache:', e);
        }
        
        return {};
      } finally {
        this.isLoadingAllTokens = false;
      }
    },
    
    // Add popular tokens to the list
    addPopularTokens() {
      const popularTokenAddresses = [
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // MATIC
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
        '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // WBTC
        '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'  // DAI
      ];
      
      // Filter valid popular tokens
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
        
        // Add popular tokens that don't already exist
        popularTokens.forEach(token => {
          if (!existingAddresses.has(token.address)) {
            this.tokens.push(token);
          }
        });
        
        console.log('Added popular tokens to tokens list:', popularTokens.length);
      }
    },
    
    // Get token details
    getTokenDetails(tokenAddress) {
      if (!tokenAddress || !this.allTokens) return null;
      return this.allTokens[tokenAddress.toLowerCase()] || null;
    },
    
    // Fetch tokens held by the user
    async fetchTokens(chainId = 137) {
      this.isLoading = true;
      this.error = null;
      
      const walletStore = useWalletStore();
      const mainStore = useMainStore();
      
      if (!walletStore.isConnected) {
        this.error = 'Wallet not connected';
        mainStore.showNotification('Please connect your wallet first', 'warning');
        this.isLoading = false;
        return;
      }
      
      // Check if we have cached data that's still fresh
      const cacheKey = `balances_${chainId}_${walletStore.address}`;
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData && cachedData.length > 0) {
        this.tokens = cachedData;
        console.log('Using cached token balances:', cachedData.length, 'tokens');
        this.isLoading = false;
        
        // Refresh prices for cached tokens in background
        this.refreshTokenPrices(chainId).catch(e => {
          console.warn('Background price update failed:', e);
        });
        
        return;
      }
      
      try {
        // Get wallet balances with timeout handling
        const balanceEndpoint = `/tokens/balances/${chainId}/${walletStore.address}`;
        console.log('Requesting token balances:', balanceEndpoint);
        
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API request timed out')), 15000);
        });
        
        // Race the actual request against the timeout
        const balanceResponse = await Promise.race([
          api.get(balanceEndpoint),
          timeoutPromise
        ]);
        
        // Check if balanceResponse is valid and has the expected structure
        if (!balanceResponse || !balanceResponse.balances || !Array.isArray(balanceResponse.balances)) {
          console.error('Invalid API response format:', balanceResponse);
          throw new Error('Invalid API response format');
        }
        
        console.log('Balance response:', balanceResponse.balances.length, 'tokens');
        
        // Filter tokens with balances
        const filteredTokens = balanceResponse.balances.filter(token => {
          const balance = token.balance || '0';
          return balance !== '' && balance !== '0';
        });
        
        console.log('Filtered tokens with balance:', filteredTokens.length);
        
        if (filteredTokens.length === 0) {
          this.error = 'No tokens found with balance';
          this.isLoading = false;
          return;
        }
        
        // Save filtered balances for use in case of price API failure
        this.cachedBalances = filteredTokens;
        
        // Prepare token addresses for batch price query
        const tokenAddresses = filteredTokens.map(token => token.token.toLowerCase());
        console.log('Preparing batch price query for', tokenAddresses.length, 'tokens');
        
        // Use batch query method to get all token prices
        const priceMap = await this.fetchTokenPrice(tokenAddresses, chainId);
        console.log('Batch price query completed with', Object.keys(priceMap).length, 'results');
        
        // Combine token information
        this.tokens = filteredTokens.map(token => {
          const address = token.token.toLowerCase();
          const price = priceMap[address] || '0';
          
          const tokenInfo = {
            address: token.token,
            balance: token.balance,
            price: price
          };
          
          // Ensure token information is correct
          console.log(`Token ${address} balance: ${token.balance}, price: ${price}`);
          
          return tokenInfo;
        });
        
        // Cache the results
        this.saveToCache(cacheKey, this.tokens);
        
        console.log('Setup complete:', this.tokens.length, 'tokens');
        
        // Check if all tokens have prices
        const tokensWithoutPrice = this.tokens.filter(token => !token.price || token.price === '0');
        if (tokensWithoutPrice.length > 0) {
          console.warn('The following tokens have no price:', tokensWithoutPrice.map(t => t.address));
        }
        
        // Update last fetch timestamp
        this.lastFetchTimestamp = Date.now();
        
      } catch (error) {
        console.error('Failed to fetch tokens:', error);
        
        // Try to use cached balances with fallback prices
        if (this.cachedBalances && this.cachedBalances.length > 0) {
          console.log('Using cached balances as fallback');
          this.tokens = this.cachedBalances.map(token => {
            const address = token.token.toLowerCase();
            const cachedPrice = this.cachedPrices[address] || '0';
            
            return {
              address: token.token,
              balance: token.balance,
              price: cachedPrice
            };
          });
          
          mainStore.showNotification('Using cached token data. Some prices may be outdated.', 'warning');
        } else {
          // Handle different error scenarios
          if (error.message === 'API request timed out') {
            this.error = 'Connection to server timed out. Please try again later.';
          } else if (error.status === 401 || error.status === 403) {
            this.error = 'Authentication failed. Please reconnect your wallet.';
          } else if (error.status >= 500) {
            this.error = 'Server error. Our team has been notified.';
          } else {
            this.error = error.response?.data?.message || error.message || 'Failed to fetch tokens';
          }
          
          mainStore.showNotification(`Failed to fetch tokens: ${this.error}`, 'error');
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    // Background refresh of token prices
    async refreshTokenPrices(chainId = 137) {
      if (!this.tokens || this.tokens.length === 0) return;
      
      try {
        const tokenAddresses = this.tokens.map(token => token.address.toLowerCase());
        const priceMap = await this.fetchTokenPrice(tokenAddresses, chainId);
        
        // Update prices in place
        this.tokens.forEach((token, index) => {
          const address = token.address.toLowerCase();
          if (priceMap[address]) {
            this.tokens[index].price = priceMap[address];
            // Also cache the price
            this.cachedPrices[address] = priceMap[address];
          }
        });
        
        // Cache updated tokens
        const walletStore = useWalletStore();
        const cacheKey = `balances_${chainId}_${walletStore.address}`;
        this.saveToCache(cacheKey, this.tokens);
        
        console.log('Background price refresh completed');
      } catch (error) {
        console.warn('Background price refresh failed:', error);
      }
    },
    
    // Get price for single or multiple tokens
    async fetchTokenPrice(addresses, chainId = 137) {
      // If request is empty, return empty object
      if (!addresses || (Array.isArray(addresses) && addresses.length === 0)) {
        return {};
      }
      
      const addressArray = Array.isArray(addresses) ? addresses : [addresses];
      const normalizedAddresses = addressArray.map(addr => addr.toLowerCase());
      
      console.log('fetchTokenPrice triggered, addresses:', Array.isArray(addresses) ? addresses : [addresses]);
      
      try {
        // Connect addresses into comma-separated string
        const addressesString = normalizedAddresses.join(',');
        const priceEndpoint = `/tokens/prices/${chainId}/${addressesString}`;
        
        console.log('Price API request:', priceEndpoint);
        
        // Execute API request to get prices with timeout handling
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Price API request timed out')), 15000);
        });
        
        // Race the actual request against the timeout
        const response = await Promise.race([
          api.get(priceEndpoint),
          timeoutPromise
        ]);
        
        console.log('Price API response:', response);
        
        // If API response is empty or invalid, return empty object
        if (!response) {
          console.error('Price API returned empty response');
          return {};
        }
        
        // Process API response - ensure all addresses have prices (even if 0)
        const result = {};
        
        normalizedAddresses.forEach(address => {
          // Get price from API response or default to 0
          const price = response[address] || '0';
          result[address] = price;
          
          // Log price for each token
          console.log(`Token ${address} price: ${price}`);
        });
        
        // If only one token price is requested, return price value
        if (normalizedAddresses.length === 1 && !Array.isArray(addresses)) {
          return result[normalizedAddresses[0]];
        }
        
        // Otherwise return price mapping
        return result;
      } catch (error) {
        console.error('Error fetching prices:', error);
        
        // Show price error notification but don't break the flow
        const mainStore = useMainStore();
        if (error.message === 'Price API request timed out') {
          mainStore.showNotification('Token price update timed out. Prices may be outdated.', 'warning');
        } else {
          mainStore.showNotification('Failed to update token prices. Using cached values.', 'warning');
        }
        
        // Generate default result
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
    
    // Update prices for source and target tokens simultaneously
    async updateSwapTokenPrices() {
      const addresses = new Set();
      
      // Collect addresses of tokens that need price updates
      if (this.selectedFromToken) {
        addresses.add(this.selectedFromToken.address.toLowerCase());
      }
      
      if (this.selectedToToken) {
        addresses.add(this.selectedToToken.address.toLowerCase());
      }
      
      // Also include tokens in multi-select mode
      this.selectedFromTokens.forEach(token => {
        addresses.add(token.address.toLowerCase());
      });
      
      const uniqueAddresses = [...addresses];
      
      if (uniqueAddresses.length === 0) {
        console.log('No tokens need price updates');
        return;
      }
      
      console.log('Updating swap token prices:', uniqueAddresses.join(', '));
      
      // Get latest prices
      const priceMap = await this.fetchTokenPrice(uniqueAddresses);
      
      // Update token prices
      this.updatePricesWithMap(priceMap);
      
      return priceMap;
    },
    
    // Update token prices using price map
    updatePricesWithMap(priceMap) {
      if (!priceMap || Object.keys(priceMap).length === 0) {
        console.log('No valid price data to update');
        return;
      }
      
      // Update prices in tokens array
      this.tokens.forEach((token, index) => {
        const address = token.address.toLowerCase();
        if (priceMap[address]) {
          this.tokens[index].price = priceMap[address];
          console.log(`Updated token list price for ${address} to ${priceMap[address]}`);
        }
      });
      
      // Update selectedFromToken
      if (this.selectedFromToken) {
        const fromAddress = this.selectedFromToken.address.toLowerCase();
        if (priceMap[fromAddress]) {
          this.selectedFromToken.price = priceMap[fromAddress];
          console.log(`Updated source token ${fromAddress} price to ${priceMap[fromAddress]}`);
        }
      }
      
      // Update selectedToToken
      if (this.selectedToToken) {
        const toAddress = this.selectedToToken.address.toLowerCase();
        if (priceMap[toAddress]) {
          this.selectedToToken.price = priceMap[toAddress];
          console.log(`Updated target token ${toAddress} price to ${priceMap[toAddress]}`);
        }
      }
      
      // Update multi-select token prices
      this.selectedFromTokens.forEach((token, index) => {
        const address = token.address.toLowerCase();
        if (priceMap[address]) {
          this.selectedFromTokens[index].price = priceMap[address];
          console.log(`Updated multi-select token ${address} price to ${priceMap[address]}`);
        }
      });
      
      // Recalculate exchange rate
      if (this.selectedFromToken && this.selectedToToken) {
        this.calculateExchangeRate();
      }
      
      if (this.selectedFromTokens.length > 0 && this.selectedToToken) {
        this.calculateMultiTokenExchangeRate();
      }
    },
    
    // Update prices for multiple tokens based on given addresses
    async updateTokenPrices(addresses, chainId = 137) {
      if (!addresses || (Array.isArray(addresses) && addresses.length === 0)) {
        console.log('No addresses to update prices for');
        return;
      }
      
      const addressesToFetch = Array.isArray(addresses) ? addresses : [addresses];
      console.log('Updating prices for the following tokens:', addressesToFetch.join(', '));
      
      // Get latest prices
      const priceMap = await this.fetchTokenPrice(addressesToFetch, chainId);
      
      // Use unified method to update prices
      this.updatePricesWithMap(priceMap);
      
      return priceMap;
    },
    
    // Calculate exchange rate
    calculateExchangeRate() {
      if (!this.selectedFromToken || !this.selectedToToken) {
        this.exchangeRate = null;
        return;
      }
      
      try {
        // Ensure prices are valid numbers
        const fromPrice = parseFloat(this.selectedFromToken.price) || 0;
        const toPrice = parseFloat(this.selectedToToken.price) || 0;
        
        // Check if prices are valid
        if (fromPrice <= 0 || toPrice <= 0) {
          console.warn(`Invalid prices: fromPrice=${fromPrice}, toPrice=${toPrice}`);
          this.exchangeRate = null;
          return;
        }
        
        // Calculate exchange rate (how many target tokens per 1 source token)
        this.exchangeRate = (fromPrice / toPrice).toFixed(6);
        console.log(`Exchange rate: 1 ${this.selectedFromToken.symbol || 'source token'} = ${this.exchangeRate} ${this.selectedToToken.symbol || 'target token'}`);
        
        // If there's an input amount, calculate output amount
        this.calculateToAmount();
      } catch (error) {
        console.error('Error calculating exchange rate:', error);
        this.exchangeRate = null;
      }
    },
    
    // Calculate target token amount after exchange
    calculateToAmount() {
      // If no valid exchange rate or source amount, clear target amount
      if (!this.exchangeRate || !this.fromAmount || this.exchangeRate === null) {
        this.toAmount = '';
        return;
      }
      
      try {
        // Parse amount and rate as numbers
        const amount = parseFloat(this.fromAmount) || 0;
        const rate = parseFloat(this.exchangeRate) || 0;
        
        // Check value validity
        if (amount <= 0 || rate <= 0) {
          this.toAmount = '';
          return;
        }
        
        // Calculate target amount and format
        const result = amount * rate;
        this.toAmount = result.toFixed(6);
        console.log(`Calculate exchange: ${amount} * ${rate} = ${this.toAmount}`);
      } catch (error) {
        console.error('Error calculating target amount:', error);
        this.toAmount = '';
      }
    },
    
    // Calculate exchange rate for multiple tokens
    calculateMultiTokenExchangeRate() {
      if (this.selectedFromTokens.length === 0 || !this.selectedToToken) {
        this.exchangeRate = null;
        this.toAmount = '';
        return;
      }
      
      try {
        // Calculate total value of all source tokens
        let totalFromValue = 0;
        let hasValidAmount = false;
        
        // Iterate through all selected tokens
        this.selectedFromTokens.forEach(token => {
          // Get token amount and price
          const amount = token.amount || '0';
          const price = parseFloat(token.price) || 0;
          console.log('token.price', token.price);
          console.log('amount', amount);  
          // Only include valid values in calculation
          if (amount !== '' && amount !== '0' && price > 0) {
            // Get token decimals from allTokens
            const address = token.address.toLowerCase();
            const tokenInfo = this.allTokens[address];
            const decimals = tokenInfo?.decimals || 18;
            
            // Convert from smallest unit (wei) to normal unit based on decimals
            const normalizedAmount = parseFloat(amount) / Math.pow(10, decimals);
            
            // Calculate token value in USD
            const tokenValue = normalizedAmount * price;
            console.log(`Token ${address}: ${normalizedAmount} * $${price} = $${tokenValue}`);
            
            totalFromValue += tokenValue;
            hasValidAmount = true;
          }
        });
        
        // If no valid input or total value is 0, clear output
        if (!hasValidAmount || totalFromValue <= 0) {
          console.log('No valid amounts to calculate exchange rate');
          this.toAmount = '';
          return;
        }
        
        // Get target token price
        const toPrice = parseFloat(this.selectedToToken.price) || 0;
        
        // If target token price is invalid, clear output
        if (toPrice <= 0) {
          console.warn('Target token price is invalid:', toPrice);
          this.toAmount = '';
          return;
        }
        
        // Get target token decimals
        const toAddress = this.selectedToToken.address.toLowerCase();
        const toTokenInfo = this.allTokens[toAddress];
        const toDecimals = toTokenInfo?.decimals || 18;
        
        // Calculate exchangeable target token amount in normal units
        const toAmountNormal = totalFromValue / toPrice;
        
        // Format to 6 decimal places for display
        this.toAmount = toAmountNormal.toFixed(6);
        
        console.log(`Multi-token exchange: Total value $${totalFromValue.toFixed(2)} / $${toPrice} = ${this.toAmount} ${this.selectedToToken.symbol || 'target token'}`);
      } catch (error) {
        console.error('Error calculating multi-token exchange rate:', error);
        this.toAmount = '';
      }
    },
    
    // Select source token to swap
    selectFromToken(address) {
      // Find in user's tokens
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedFromToken = token;
        this.calculateExchangeRate();
        return;
      } 
      
      // Find in all tokens
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
        
        // Update source and target token prices
        this.updateSwapTokenPrices();
        
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    // Select target token to swap
    selectToToken(address) {
      // Find in user's tokens
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedToToken = token;
        this.calculateExchangeRate();
        return;
      }
      
      // Find in all tokens
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
        
        // Update source and target token prices
        this.updateSwapTokenPrices();
        
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    // Swap source and target tokens
    swapTokens() {
      const temp = this.selectedFromToken;
      this.selectedFromToken = this.selectedToToken;
      this.selectedToToken = temp;
      
      this.fromAmount = '';
      this.toAmount = '';
      
      // Update prices after swap
      this.updateSwapTokenPrices();
    },
    
    // Set source token amount
    setFromAmount(amount) {
      this.fromAmount = amount;
      this.calculateToAmount();
    },
    
    // Token approval with enhanced error handling
    async approveToken() {
      if (!this.canSwap) return;
      
      const mainStore = useMainStore();
      
      try {
        // For multi-select mode
        if (this.selectedFromTokens.length > 0) {
          const tokens = [];
          const amounts = [];
          
          this.selectedFromTokens.forEach(token => {
            if (token.amount && token.amount !== '0') {
              tokens.push(token.address);
              amounts.push(token.amount);
            }
          });
          
          if (tokens.length === 0) {
            throw new Error('No valid token amounts selected');
          }
          
          const payload = {
            chainId: 137,
            tokens,
            amounts
          };
          
          const response = await api.post('/convert/approve', payload);
          return response;
        } else {
          // For single-select mode
          const payload = {
            chainId: 137,
            tokens: [this.selectedFromToken.address],
            amounts: [this.fromAmount]
          };
          
          const response = await api.post('/convert/approve', payload);
          return response;
        }
      } catch (error) {
        console.error('Token approval failed:', error);
        
        // Enhanced error handling with more specific messages
        let errorMsg;
        if (error.status === 400) {
          errorMsg = error.response?.data?.message || 'Invalid approval parameters';
        } else if (error.status === 401 || error.status === 403) {
          errorMsg = 'Authentication error. Please reconnect your wallet.';
        } else if (error.status === 429) {
          errorMsg = 'Too many requests. Please try again later.';
        } else if (error.status >= 500) {
          errorMsg = 'Server error. Our team has been notified.';
        } else {
          errorMsg = error.response?.data?.message || error.message || 'Token approval failed';
        }
        
        mainStore.showNotification(`Approval failed: ${errorMsg}`, 'error');
        throw new Error(errorMsg);
      }
    },
    
    // Execute token swap
    async executeSwap() {
      const walletStore = useWalletStore();
      const mainStore = useMainStore();
      
      try {
        // For multi-select mode
        if (this.selectedFromTokens.length > 0) {
          const tokens = [];
          const amounts = [];
          
          this.selectedFromTokens.forEach(token => {
            if (token.amount && token.amount !== '0') {
              tokens.push(token.address);
              amounts.push(token.amount);
            }
          });
          
          if (tokens.length === 0) {
            throw new Error('No valid token amounts selected');
          }
          
          const payload = {
            chainId: 137,
            userAddress: walletStore.address,
            tokens,
            amounts,
            dstTokenAddress: this.selectedToToken.address
          };
          
          const response = await api.post('/convert/swap', payload);
          return response;
        } else {
          // For single-select mode
          const payload = {
            chainId: 137,
            userAddress: walletStore.address,
            tokens: [this.selectedFromToken.address],
            amounts: [this.fromAmount],
            dstTokenAddress: this.selectedToToken.address
          };
          
          const response = await api.post('/convert/swap', payload);
          return response;
        }
      } catch (error) {
        console.error('Swap execution failed:', error);
        
        // Enhanced error handling with more specific messages
        let errorMsg;
        if (error.status === 400) {
          errorMsg = error.response?.data?.message || 'Invalid swap parameters';
        } else if (error.status === 401 || error.status === 403) {
          errorMsg = 'Authentication error. Please reconnect your wallet.';
        } else if (error.status === 429) {
          errorMsg = 'Too many requests. Please try again later.';
        } else if (error.status >= 500) {
          errorMsg = 'Server error. Our team has been notified.';
        } else {
          errorMsg = error.response?.data?.message || error.message || 'Swap execution failed';
        }
        
        mainStore.showNotification(`Swap failed: ${errorMsg}`, 'error');
        throw new Error(errorMsg);
      }
    },
    
    // Reset swap state
    reset() {
      this.selectedFromToken = null;
      this.selectedToToken = null;
      this.fromAmount = '';
      this.toAmount = '';
      this.exchangeRate = null;
    },
    
    // Add/remove multi-select token
    toggleFromToken(address) {
      // Check if already selected
      const index = this.selectedFromTokens.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
      
      // If already selected, remove it
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
      
      // If not selected, add it
      const token = this.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
      
      if (token) {
        this.selectedFromTokens.push({
          ...token,
          amount: token.balance // 使用代幣的完整餘額作為默認金額
        });
        
        this.calculateMultiTokenExchangeRate();
        return;
      }
      
      // Try to find in all tokens
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
        
        // Update new token price and other related tokens
        this.updateSwapTokenPrices();
        
        return;
      }
      
      console.error('Token not found:', address);
    },
    
    // Update multi-select token amount
    updateFromTokenAmount(address, amount) {
      const index = this.selectedFromTokens.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
      if (index !== -1) {
        this.selectedFromTokens[index].amount = String(amount);
        this.calculateMultiTokenExchangeRate();
      }
    },
    
    // Clear selected multi-select tokens
    clearSelectedFromTokens() {
      this.selectedFromTokens = [];
      this.fromAmount = '';
      this.toAmount = '';
      this.exchangeRate = null;
    },
    
    // 確保單選和多選模式之間的狀態同步
    syncTokenSelectionState() {
      // 檢查是否有單選選擇
      if (this.selectedFromToken && !this.selectedFromTokens.some(t => 
          t.address.toLowerCase() === this.selectedFromToken.address.toLowerCase())) {
        // 如果單選有值，但多選沒有對應的代幣，則添加到多選中
        this.selectedFromTokens.push({
          ...this.selectedFromToken,
          amount: this.fromAmount
        });
        console.log('已將單選代幣同步到多選模式', this.selectedFromToken);
      }
      
      // 檢查多選模式
      if (this.selectedFromTokens.length === 1 && !this.selectedFromToken) {
        // 如果多選只有一個代幣，但單選為空，則設置單選
        const token = this.selectedFromTokens[0];
        this.selectedFromToken = token;
        this.fromAmount = token.amount;
        console.log('已將多選代幣同步到單選模式', token);
      }
      
      // 如果從單選切換到多選，確保金額一致
      if (this.selectedFromToken && this.selectedFromTokens.length > 0) {
        const matchingToken = this.selectedFromTokens.find(t => 
          t.address.toLowerCase() === this.selectedFromToken.address.toLowerCase());
        
        if (matchingToken && this.fromAmount !== matchingToken.amount) {
          // 更新多選中的金額與單選保持一致
          matchingToken.amount = this.fromAmount;
          console.log('已同步代幣金額', this.fromAmount);
        }
      }
      
      return {
        singleMode: !!this.selectedFromToken,
        multiMode: this.selectedFromTokens.length > 0,
        tokensCount: this.selectedFromTokens.length
      };
    },
    
    // Batch fetch multiple token prices
    async batchFetchTokenPrices(addresses, chainId = 137) {
      if (!addresses || addresses.length === 0) return {};
      
      console.log('Batch fetch token prices:', addresses);
      return await this.fetchTokenPrice(addresses, chainId);
    }
  }
}) 