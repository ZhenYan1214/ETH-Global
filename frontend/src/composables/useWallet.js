import { ref, onMounted } from 'vue'
import { ethers } from 'ethers'
import { useWalletStore } from '../store/wallet'

export function useWallet() {
  const walletStore = useWalletStore()
  const provider = ref(null)
  const signer = ref(null)
  const error = ref(null)

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask')
      }

      provider.value = new ethers.providers.Web3Provider(window.ethereum)
      await provider.value.send('eth_requestAccounts', [])
      signer.value = provider.value.getSigner()
      const address = await signer.value.getAddress()
      walletStore.setAddress(address)

      // Get initial balance
      const balance = await provider.value.getBalance(address)
      walletStore.setBalance(balance.toString())
    } catch (err) {
      error.value = err.message
      console.error('Error connecting wallet:', err)
    }
  }

  async function disconnectWallet() {
    walletStore.disconnect()
    provider.value = null
    signer.value = null
  }

  onMounted(async () => {
    if (window.ethereum) {
      provider.value = new ethers.providers.Web3Provider(window.ethereum)
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          await disconnectWallet()
        } else {
          const address = accounts[0]
          walletStore.setAddress(address)
          const balance = await provider.value.getBalance(address)
          walletStore.setBalance(balance.toString())
        }
      })

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })
    }
  })

  return {
    provider,
    signer,
    error,
    connectWallet,
    disconnectWallet
  }
} 