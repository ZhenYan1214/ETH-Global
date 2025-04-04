import { defineStore } from 'pinia'
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount,
  WebAuthnMode
} from '@circle-fin/modular-wallets-core'
import {
  createPublicClient,
} from 'viem'
import {
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction'
import { polygon } from 'viem/chains'
import { useMainStore } from './main'
import { useTokenStore } from './tokens'
import api from '../utils/api'

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    address: '',
    chainId: 137, // Default to Polygon
    isConnected: false,
    provider: null,
    signer: null,
    error: null,
    smartAccount: null,
    bundlerClient: null,
    isLoading: false,
    passkeyStatus: null, // 'pending' | 'created' | 'failed'
    retryCount: 0,
    client: null,
    credential: null,
    balance: '0',
    usernameInput: '',
    isRegistering: false
  }),

  getters: {
    isReady: (state) => state.bundlerClient !== null && state.isConnected,
    formattedAddress: (state) => {
      if (!state.address) return ''
      return `${state.address.substring(0, 6)}...${state.address.substring(state.address.length - 4)}`
    }
  },

  actions: {
    async connect(username = this.usernameInput) {
      if (!username) {
        this.error = 'Username is required'
        return { success: false, error: this.error }
      }
      
      return await this.connectWithPasskey(username, this.isRegistering ? WebAuthnMode.Register : WebAuthnMode.Login)
    },
    
    async connectWithPasskey(username, mode = WebAuthnMode.Login) {
      this.isLoading = true
      this.error = null
      this.passkeyStatus = 'pending'
      
      const mainStore = useMainStore()
      
      try {
        // Environment variables
        const clientKey = import.meta.env.VITE_CLIENT_KEY
        const clientUrl = import.meta.env.VITE_CLIENT_URL
        
        // 1. Create Passkey Transport
        const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)
        
        // 2. Register or login with a passkey
        this.credential = await toWebAuthnCredential({
          transport: passkeyTransport,
          mode: mode,
          username: username
        })

        // 3. Create modular transport for Polygon
        const modularTransport = toModularTransport(
          `${clientUrl}/polygon`,
          clientKey
        )

        // 4. Create client to connect to Polygon
        this.client = createPublicClient({
          chain: polygon,
          transport: modularTransport
        })

        // 5. Create Circle smart account
        this.smartAccount = await toCircleSmartAccount({
          client: this.client,
          owner: toWebAuthnAccount({
            credential: this.credential
          })
        })

        // 6. Create bundler client
        this.bundlerClient = createBundlerClient({
          smartAccount: this.smartAccount,
          chain: polygon,
          transport: modularTransport
        })

        // Set wallet address from smart account
        this.setAddress(this.smartAccount.address)
        
        // Fetch balance
        await this.fetchBalance()
        
        this.passkeyStatus = 'created'
        mainStore.showNotification('Wallet connected successfully', 'success')
        return { success: true }
      } catch (err) {
        this.error = err.message
        console.error('Error connecting wallet:', err)
        this.passkeyStatus = 'failed'
        mainStore.showNotification(`Connection failed: ${err.message}`, 'error')
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    async fetchBalance() {
      if (!this.isConnected || !this.client || !this.address) return '0'
      
      try {
        const balanceResult = await this.client.getBalance({
          address: this.address
        })
        
        this.setBalance(balanceResult.toString())
        return balanceResult.toString()
      } catch (err) {
        console.error('Error fetching balance:', err)
        return '0'
      }
    },

    async sendSwapTransaction({paymaster = true, maxFeePerGas = BigInt(50000000000), maxPriorityFeePerGas = BigInt(35000000000) }) {
      if (!this.isReady) {
        throw new Error('錢包未連接')
      }
      
      this.isLoading = true
      this.error = null
      
      const mainStore = useMainStore()
      const tokenStore = useTokenStore()
      
      try {
        // 檢查是否可以交換
        if (!tokenStore.canSwap) {
          throw new Error('無法進行交換，請檢查所選代幣和金額')
        }
        
        mainStore.showNotification('准備交換代幣...', 'info')
        
        // 判斷是單選還是多選模式
        const isMultiToken = tokenStore.selectedFromTokens.length > 0
        
        // 構建approve請求
        let approvePayload = {
          chainId: this.chainId || 137,
          userAddress: this.address
        }
        
        if (isMultiToken) {
          // 多選模式 - 不轉換 amount 為浮點數
          approvePayload.tokens = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.address)
          
          approvePayload.amounts = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.amount)
        } else {
          // 單選模式
          approvePayload.tokens = [tokenStore.selectedFromToken.address]
          approvePayload.amounts = [tokenStore.fromAmount]
        }
        
        console.log('Approve Payload:', approvePayload)
        
        // 調用approve API
        mainStore.showNotification('正在批准代幣使用權限...', 'info')
        const approveResponse = await api.post('/convert/approve', approvePayload)
        console.log('Approve Response:', approveResponse)
       
        // 構建swap請求
        let swapPayload = {
          chainId: this.chainId || 137,
          userAddress: this.address,
          dstTokenAddress: tokenStore.selectedToToken.address
        }
        
        if (isMultiToken) {
          // 多選模式 - 不轉換 amount 為浮點數
          swapPayload.tokens = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.address)
          
          swapPayload.amounts = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.amount)
        } else {
          // 單選模式
          swapPayload.tokens = [tokenStore.selectedFromToken.address]
          swapPayload.amounts = [tokenStore.fromAmount]
        }
        
        console.log('Swap Payload:', swapPayload)
        
        // 調用swap API
        mainStore.showNotification('正在準備交換交易...', 'info')
        const swapResponse = await api.post('/convert/swap', swapPayload)
        console.log('Swap Response:', swapResponse)
        
       
        

        const approveCalls = approveResponse.approveDatas.map((item) => ({
          data: item.data,
          to: item.to,
          value: BigInt(item.value)
        }));
        const depositCalls = swapResponse.swapDatas.map((item) => ({
          data: item.tx.data,
          to: item.tx.to,
          value: BigInt(item.tx.value)
        }));
        console.log(approveCalls,depositCalls)
        const calls = [...approveCalls, ...depositCalls]
        
       
        const hash = await this.bundlerClient.sendUserOperation({
          account:this.smartAccount,
          calls: calls,
          paymaster:true,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas
        });
        const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
          hash: hash,
        }) 
        console.log('Swap Transaction Receipt:', receipt)
        // 刷新餘額
        await this.fetchBalance()
        
        // 刷新代幣列表
        await tokenStore.fetchTokens()
        
        // 清空所選代幣
        if (isMultiToken) {
          tokenStore.clearSelectedFromTokens()
        } else {
          tokenStore.reset()
        }
        
        mainStore.showNotification('代幣交換成功！', 'success')
        return { 
          success: true, 
          approveHash, 
          approveReceipt, 
          swapHash, 
          swapReceipt 
        }
      } catch (err) {
        this.error = err.message
        console.error('交換交易失敗:', err)
        mainStore.showNotification(`交換失敗: ${err.message}`, 'error')
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    setAddress(newAddress) {
      this.address = newAddress
      this.isConnected = true
    },

    setBalance(newBalance) {
      this.balance = newBalance
    },

    disconnect() {
      this.address = ''
      this.isConnected = false
      this.balance = '0'
      this.credential = null
      this.smartAccount = null
      this.bundlerClient = null
      this.client = null
      this.passkeyStatus = null
      
      const mainStore = useMainStore()
      mainStore.showNotification('Wallet disconnected', 'info')
    },

    // Helper function to encode token transfers
    createTokenTransfer(to, tokenAddress, amount) {
  return {
        to: tokenAddress,
        data: `0xa9059cbb000000000000000000000000${to.slice(2).toLowerCase()}${amount.toString(16).padStart(64, '0')}`,
        value: BigInt(0)
      }
    }
  }
}) 