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


export const useWalletStore = defineStore('wallet', {
  state: () => ({
    address: '',
    chainId: null,
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
    isReady: (state) => state.bundlerClient !== null && state.isConnected
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
      
      try {
        // Environment variables
        const clientKey = import.meta.env.VITE_CLIENT_KEY || 'demo-key'
        const clientUrl = import.meta.env.VITE_CLIENT_URL || 'https://demo.circle.com/api'
        
    
        console.log("help")
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
        return { success: true }
      } catch (err) {
        this.error = err.message
        console.error('Error connecting wallet:', err)
        this.passkeyStatus = 'failed'
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

    async sendTransaction({ calls, paymaster = true, maxFeePerGas = BigInt(1000000000), maxPriorityFeePerGas = BigInt(5000000) }) {
      if (!this.isReady) {
        throw new Error('Wallet not connected')
      }
      
      this.isLoading = true
      this.error = null
      
      try {
        // Send transaction through bundler
        const hash = await this.bundlerClient.sendUserOperation({
          account: this.smartAccount,
          calls: calls,
          paymaster: paymaster,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas
        })
        
        // Wait for receipt
        const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
          hash: hash
        })
        
        // Refresh balance after transaction
        await this.fetchBalance()
        
        return { success: true, hash, receipt }
      } catch (err) {
        this.error = err.message
        console.error('Error sending transaction:', err)
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