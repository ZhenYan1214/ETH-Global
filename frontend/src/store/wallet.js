import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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


export const useWalletStore = defineStore('wallet', () => {
  // State
  const address = ref('')
  const isConnected = ref(false)
  const balance = ref('0')
  const credential = ref(null)
  const smartAccount = ref(null)
  const bundlerClient = ref(null)
  const client = ref(null)
  const error = ref(null)
  const isLoading = ref(false)
  const usernameInput = ref('')
  const isRegistering = ref(false)

  // Environment variables
  const clientKey = import.meta.env.VITE_CLIENT_KEY || 'demo-key'
  const clientUrl = import.meta.env.VITE_CLIENT_URL || 'https://demo.circle.com/api'

  // Computed
  const isReady = computed(() => bundlerClient.value !== null && isConnected.value)

  // Actions
  async function connect(username = usernameInput.value) {
    if (!username) {
      error.value = 'Username is required'
      return { success: false, error: error.value }
    }
    
    return await connectWithPasskey(username, isRegistering.value ? WebAuthnMode.Register : WebAuthnMode.Login)
  }
  
  async function connectWithPasskey(username, mode = WebAuthnMode.Login) {
    isLoading.value = true
    error.value = null
    
    try {
      // For demo or development purpose, simulate a successful connection
      // This is a workaround for the missing API keys
      if (import.meta.env.DEV && !clientKey.startsWith('LIVE_CLIENT_KEY')) {
        // Set dummy address for development
        setAddress('0x' + Math.random().toString(36).substring(2, 15))
        setBalance('1000000000000000000') // 1 ETH
        
        // Create a mock bundler client for development
        bundlerClient.value = createBundlerClient({})
        
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        return { success: true }
      }

      // 1. Create Passkey Transport
      const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)
      
      // 2. Register or login with a passkey
      credential.value = await toWebAuthnCredential({
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
      client.value = createPublicClient({
        chain: polygon,
        transport: modularTransport
      })

      // 5. Create Circle smart account
      smartAccount.value = await toCircleSmartAccount({
        client: client.value,
        owner: toWebAuthnAccount({
          credential: credential.value
        })
      })

      // 6. Create bundler client
      bundlerClient.value = createBundlerClient({
        smartAccount: smartAccount.value,
        chain: polygon,
        transport: modularTransport
      })

      // Set wallet address from smart account
      setAddress(smartAccount.value.address)
      
      // Fetch balance
      await fetchBalance()
      
      return { success: true }
    } catch (err) {
      error.value = err.message
      console.error('Error connecting wallet:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchBalance() {
    if (!isConnected.value || !client.value || !address.value) return '0'
    
    try {
      const balanceResult = await client.value.getBalance({
        address: address.value
      })
      
      setBalance(balanceResult.toString())
      return balanceResult.toString()
    } catch (err) {
      console.error('Error fetching balance:', err)
      return '0'
    }
  }

  async function sendTransaction({ calls, paymaster = true, maxFeePerGas = BigInt(1000000000), maxPriorityFeePerGas = BigInt(5000000) }) {
    if (!isReady.value) {
      throw new Error('Wallet not connected')
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      // Send transaction through bundler
      const hash = await bundlerClient.value.sendUserOperation({
        account: smartAccount.value,
        calls: calls,
        paymaster: paymaster,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas
      })
      
      // Wait for receipt
      const { receipt } = await bundlerClient.value.waitForUserOperationReceipt({
        hash: hash
      })
      
      // Refresh balance after transaction
      await fetchBalance()
      
      return { success: true, hash, receipt }
    } catch (err) {
      error.value = err.message
      console.error('Error sending transaction:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

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
    credential.value = null
    smartAccount.value = null
    bundlerClient.value = null
    client.value = null
  }

  // Helper function to encode token transfers
  function createTokenTransfer(to, tokenAddress, amount) {
    return {
      to: tokenAddress,
      data: `0xa9059cbb000000000000000000000000${to.slice(2).toLowerCase()}${amount.toString(16).padStart(64, '0')}`,
      value: BigInt(0)
    }
  }

  return {
    // State
    address,
    isConnected,
    balance,
    error,
    isLoading,
    usernameInput,
    isRegistering,
    
    // Computed
    isReady,
    
    // Actions
    connect,
    connectWithPasskey,
    fetchBalance,
    sendTransaction,
    disconnect,
    setAddress,
    setBalance,
    
    // Helper
    createTokenTransfer
  }
}) 