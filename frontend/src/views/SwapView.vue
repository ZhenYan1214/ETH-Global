<template>
  <div class="swap-container">
    <!-- Navigation Bar -->
    <NavigationBar 
      :navigationItems="navigationItems"
      :showBackButton="true"
      backRoute="/home"
      :showWallet="true"
      :tokens="tokenStore.tokens"
      @logout="handleLogout"
    />

    <div class="content-container">
      <!-- Notifications -->
      <v-snackbar
        v-model="mainStore.notification.show"
        :color="mainStore.notification.color"
        :timeout="mainStore.notification.timeout"
        top
      >
        {{ mainStore.notification.message }}
        <template #actions>
          <v-btn text @click="mainStore.clearNotification()">Close</v-btn>
        </template>
      </v-snackbar>

      <!-- Swap Card -->
      <v-card class="swap-card">
        <v-card-title class="card-title d-flex align-center">
          <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
          <span>Swap</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <!-- From Token Section -->
          <section class="from-section mb-5">
            <div class="d-flex justify-space-between align-center mb-3">
              <h3 class="text-subtitle-1 font-weight-medium">Input Token</h3>
              <v-btn 
                variant="text" 
                color="primary" 
                size="small" 
                density="compact"
                @click="showFromTokenList = true"
                class="select-btn"
              >
                {{ tokenStore.selectedFromTokens.length > 0 
                   ? `Selected ${tokenStore.selectedFromTokens.length} tokens` 
                   : 'Select Token' }}
                <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
              </v-btn>
            </div>

            <!-- Single Select Mode -->
            <template v-if="tokenStore.selectedFromTokens.length === 0">
              <SingleTokenCard 
                v-if="tokenStore.selectedFromToken"
                :token="tokenStore.selectedFromToken"
                v-model="tokenStore.fromAmount"
                @max="setMaxAmount(tokenStore.selectedFromToken.address)"
              />
              <EmptyTokenCard v-else />
            </template>

            <!-- Multi-Select Mode -->
            <MultiTokenCard 
              v-else
              :tokens="tokenStore.selectedFromTokens"
              :totalValue="tokenStore.totalFromAmount"
              @updateAmount="updateFromTokenAmount"
              @removeToken="tokenStore.toggleFromToken"
              @max="setMaxAmount"
            />
          </section>

          <!-- Swap Arrow -->
          <div class="swap-arrow-container my-4">
            <v-btn icon size="small" @click="swapTokens" class="swap-arrow-btn" elevation="1">
              <v-icon>mdi-swap-vertical</v-icon>
            </v-btn>
          </div>

          <!-- To Token Input -->
          <section class="to-section mb-5">
            <div class="d-flex justify-space-between align-center mb-3">
              <h3 class="text-subtitle-1 font-weight-medium">You Will Receive</h3>
            </div>
            
            <v-text-field
              v-model="tokenStore.toAmount"
              label="To"
              variant="outlined"
              type="number"
              min="0"
              readonly
              class="to-amount-field"
            >
              <template #append>
                <v-btn
                  class="token-select-btn"
                  @click="toTokenDialog = true"
                  variant="tonal"
                  rounded
                >
                  <div v-if="tokenStore.selectedToToken" class="d-flex align-center">
                    <v-avatar size="24" class="mr-1">
                      <v-img
                        :src="getTokenLogo(tokenStore.selectedToToken.address)"
                        @error="handleImageError"
                      />
                    </v-avatar>
                    <span class="token-symbol ml-1">{{ getTokenSymbol(tokenStore.selectedToToken.address) }}</span>
                  </div>
                  <span v-else>Select</span>
                  <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
                </v-btn>
              </template>
            </v-text-field>
          </section>

          <!-- Wallet Info and Swap Button -->
          <div v-if="walletStore.isConnected" class="info-box my-3">
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-1">mdi-wallet</v-icon>
              <span class="text-caption">{{ walletStore.formattedAddress }}</span>
            </div>
          </div>

          <SwapButton 
            :buttonText="swapButtonText"
            :disabled="!walletStore.isConnected ? false : !canSwap"
            :loading="isSwapping"
            :step="swapStep"
            :error="swapError"
            @click="walletStore.isConnected ? performSwap() : router.push('/')"
          />
        </v-card-text>
      </v-card>
    </div>

    <!-- Token Selection Dialogs -->
    <FromTokenDialog 
      v-model="showFromTokenList"
      :tokens="filteredFromTokens"
      :searchText="fromTokenSearchText"
      :loading="tokenStore.isLoading"
      :isSelected="tokenStore.isTokenSelected"
      :hasSelectedTokens="tokenStore.selectedFromTokens.length > 0"
      @update:search="fromTokenSearchText = $event"
      @select="selectTokenWithFullAmount"
      @clearAll="tokenStore.clearSelectedFromTokens"
    />

    <ToTokenDialog
      v-model="toTokenDialog"
      :tokens="filteredAllTokens"
      :searchText="tokenSearchText"
      :loading="tokenStore.isLoadingAllTokens"
      :selectedToken="tokenStore.selectedToToken?.address"
      @update:search="tokenSearchText = $event"
      @select="selectToToken"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useTokenStore } from '@/store/tokens'
import { useWalletStore } from '@/store/wallet'
import { useMainStore } from '@/store/main'
import NavigationBar from '@/components/NavigationBar.vue'

// Lazy-load components for better performance
const SingleTokenCard = defineAsyncComponent(() => import('@/components/swap/SingleTokenCard.vue'))
const EmptyTokenCard = defineAsyncComponent(() => import('@/components/swap/EmptyTokenCard.vue'))
const MultiTokenCard = defineAsyncComponent(() => import('@/components/swap/MultiTokenCard.vue'))
const SwapButton = defineAsyncComponent(() => import('@/components/swap/SwapButton.vue'))
const FromTokenDialog = defineAsyncComponent(() => import('@/components/swap/FromTokenDialog.vue'))
const ToTokenDialog = defineAsyncComponent(() => import('@/components/swap/ToTokenDialog.vue'))

// Initialize stores
const tokenStore = useTokenStore()
const walletStore = useWalletStore()
const mainStore = useMainStore()
const router = useRouter()

// Navigation items
const navigationItems = [
  { icon: 'mdi-history', title: 'History', route: '/history' }
]

// UI state
const showFromTokenList = ref(false)
const toTokenDialog = ref(false)
const fromTokenSearchText = ref('')
const tokenSearchText = ref('')

// Swap state
const isSwapping = ref(false)
const swapStep = ref('initial') // 'initial', 'approving', 'swapping', 'complete', 'error'
const swapError = ref('')

// Computed properties
const canSwap = computed(() => 
  walletStore.isConnected && tokenStore.canSwap && !isSwapping.value
)

const swapButtonText = computed(() => {
  if (!walletStore.isConnected) return 'Connect Wallet'
  
  // Multi-select mode
  if (tokenStore.selectedFromTokens.length > 0) {
    if (!tokenStore.selectedToToken) return 'Select "To" Token'
    if (!tokenStore.selectedFromTokens.some(t => {
      const amount = t.amount || '0'
      return amount !== '' && amount !== '0'
    })) return 'Enter Amount'
  } 
  // Single-select mode
  else {
    if (!tokenStore.selectedFromToken || !tokenStore.selectedToToken) return 'Select Tokens'
    const amount = tokenStore.fromAmount || '0'
    if (amount === '' || amount === '0') return 'Enter Amount'
  }
  
  // Processing states
  if (isSwapping.value) {
    if (swapStep.value === 'approving') return 'Approving...'
    if (swapStep.value === 'swapping') return 'Swapping...'
  }
  
  return 'Swap Now'
})

// Token filtering
const filteredFromTokens = computed(() => {
  if (!fromTokenSearchText.value) return tokenStore.formattedTokens;
  
  const searchText = fromTokenSearchText.value.toLowerCase();
  return tokenStore.formattedTokens.filter(token => {
    const symbol = getTokenSymbol(token.address).toLowerCase();
    const name = getTokenName(token.address).toLowerCase();
    const address = token.address.toLowerCase();
    return symbol.includes(searchText) || 
           name.includes(searchText) || 
           address.includes(searchText);
  });
})

const filteredAllTokens = computed(() => {
  if (!tokenStore.allTokens) return {};
  
  // Return limited results for performance
  if (!tokenSearchText.value) {
    const topTokens = {};
    let count = 0;
    
    for (const [address, token] of Object.entries(tokenStore.allTokens)) {
      if (count >= 100) break;
      topTokens[address] = token;
      count++;
    }
    return topTokens;
  }
  
  // Filter by search text
  const searchText = tokenSearchText.value.toLowerCase();
  const filtered = {};
  
  for (const [address, token] of Object.entries(tokenStore.allTokens)) {
    if (address.toLowerCase().includes(searchText) ||
      (token.name && token.name.toLowerCase().includes(searchText)) ||
      (token.symbol && token.symbol.toLowerCase().includes(searchText))
    ) {
      filtered[address] = token;
    }
    
    // Limit results for performance
    if (Object.keys(filtered).length >= 100) break;
  }
  
  return filtered;
})

// Watchers
watch(() => tokenStore.fromAmount, () => tokenStore.calculateToAmount())

watch(() => walletStore.isConnected, async (isConnected) => {
  if (isConnected) {
    await tokenStore.fetchTokens()
  } else if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
})

// Lifecycle hooks
onMounted(async () => {
  if (!walletStore.isConnected) {
    mainStore.showNotification('Please connect your wallet first', 'warning')
    router.push('/')
    return
  }
  
  try {
    // Initialize token store if needed
    if (!tokenStore.initialized) {
      console.log('SwapView: Initializing token store...')
      await tokenStore.initialize()
    }
    
    // Load tokens and prices
    await tokenStore.fetchTokens()
    
    // Update prices for selected tokens
    if (tokenStore.selectedFromToken || tokenStore.selectedToToken || 
        tokenStore.selectedFromTokens.length > 0) {
      await tokenStore.updateSwapTokenPrices()
    }
  } catch (error) {
    console.error('Failed to fetch tokens:', error)
    mainStore.showNotification(`Failed to load tokens: ${error.message}`, 'error')
  }
})

// Token helpers
function getTokenSymbol(address) {
  if (!address) return '???'
  
  const userToken = tokenStore.tokens.find(t => 
    t.address.toLowerCase() === address.toLowerCase())
  
  if (userToken?.symbol) return userToken.symbol
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()]
  return tokenInfo ? tokenInfo.symbol : '???'
}

function getTokenName(address) {
  if (!address) return 'Unknown Token'
  
  const userToken = tokenStore.tokens.find(t => 
    t.address.toLowerCase() === address.toLowerCase())
  
  if (userToken?.name) return userToken.name
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()]
  return tokenInfo ? tokenInfo.name : 'Unknown Token'
}

function getTokenLogo(address) {
  if (!address) return 'https://via.placeholder.com/40'
  
  const userToken = tokenStore.tokens.find(t => 
    t.address.toLowerCase() === address.toLowerCase())
  
  if (userToken?.logoURI) return userToken.logoURI
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()]
  return tokenInfo?.logoURI ? tokenInfo.logoURI : 'https://via.placeholder.com/40'
}

// Formatting helpers
function formatBalance(balance, decimals = 18) {
  const balanceStr = String(balance || '0')
  if (balanceStr === '' || balanceStr === '0') return '0'
  
  try {
    const normalizedBalance = parseFloat(balanceStr) / Math.pow(10, decimals)
    return normalizedBalance.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0
    })
  } catch (e) {
    console.error('Error formatting balance:', e)
    return balanceStr
  }
}

function formatPrice(price) {
  if (!price) return '0.00'
  
  try {
    const priceNum = parseFloat(price)
    return priceNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  } catch (e) {
    console.error('Error formatting price:', e)
    return '0.00'
  }
}

function getDisplayBalance(token) {
  if (!token || !token.balance) return '0'
  
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()]
  const decimals = tokenInfo?.decimals || 18
  
  const normalizedBalance = parseFloat(token.balance) / Math.pow(10, decimals)
  
  return normalizedBalance.toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0
  })
}

function formatAddress(address) {
  return address.substring(0, 10) + '...' + address.substring(address.length - 8)
}

// Action handlers
function selectToToken(address) {
  tokenStore.selectToToken(address)
  toTokenDialog.value = false
}

function updateFromTokenAmount(address, amount) {
  tokenStore.updateFromTokenAmount(address, amount)
  tokenStore.calculateMultiTokenExchangeRate()
}

function selectTokenWithFullAmount(address) {
  const token = tokenStore.tokens.find(t => t.address === address)
  if (!tokenStore.isTokenSelected(address) && token) {
    tokenStore.toggleFromToken(address)
    tokenStore.updateFromTokenAmount(address, token.balance)
  } else {
    tokenStore.toggleFromToken(address)
  }
}

function setMaxAmount(address) {
  const token = tokenStore.tokens.find(t => 
    t.address.toLowerCase() === address.toLowerCase())
  
  if (!token) return
  
  if (tokenStore.selectedFromTokens.length > 0) {
    tokenStore.updateFromTokenAmount(address, token.balance)
  } else {
    tokenStore.fromAmount = token.balance
  }
}

function swapTokens() {
  if (tokenStore.selectedFromTokens.length > 0) return
  tokenStore.swapTokens()
}

function handleLogout() {
  walletStore.disconnect()
  tokenStore.reset()
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40'
}

// Swap execution
async function performSwap() {
  if (!walletStore.isConnected) {
    mainStore.showNotification('Please connect your wallet first', 'warning')
    router.push('/')
    return
  }
  
  if (!canSwap.value) return
  
  isSwapping.value = true
  swapStep.value = 'approving'
  swapError.value = ''
  
  try {
    mainStore.showNotification('Preparing to swap tokens...', 'info')
    
    const result = await walletStore.sendSwapTransaction({ paymaster: true })
    
    if (!result.success) {
      throw new Error(result.error || 'Swap failed')
    }
    
    swapStep.value = 'swapping'
    swapStep.value = 'complete'
    mainStore.showNotification('Token swap successful!', 'success')
    
    await tokenStore.fetchTokens()
  } catch (error) {
    console.error('Swap failed:', error)
    swapStep.value = 'error'
    swapError.value = error.message || 'Swap failed'
    mainStore.showNotification(swapError.value, 'error')
  } finally {
    isSwapping.value = false
    setTimeout(() => {
      if (swapStep.value === 'complete' || swapStep.value === 'error') {
        swapStep.value = 'initial'
      }
    }, 3000)
  }
}
</script>

<style scoped>
.swap-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
}

.content-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 1.5rem;
  min-height: calc(100vh - 64px);
}

.swap-card {
  width: 100%;
  max-width: 480px;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.card-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  padding: 1rem 1.25rem;
  letter-spacing: 0.5px;
}

.from-section, .to-section {
  position: relative;
}

.select-btn {
  border-radius: 20px;
  font-weight: 500;
}

.token-select-btn {
  height: 36px;
  min-width: 100px;
  background-color: rgba(255, 182, 193, 0.1);
  border: 1px solid rgba(255, 153, 153, 0.2);
  border-radius: 20px;
  font-weight: 500;
}

.swap-arrow-container {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
  position: relative;
}

.swap-arrow-btn {
  background-color: white;
  border: 1px solid rgba(255, 153, 153, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 2;
}

.swap-arrow-btn:hover {
  transform: scale(1.1);
}

.info-box {
  background-color: rgba(255, 182, 193, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 153, 153, 0.1);
}

.token-symbol {
  font-weight: 600;
}

@media (max-width: 600px) {
  .content-container {
    padding: 1rem 0.75rem;
  }
  
  .swap-card {
    border-radius: 16px;
  }
}
</style> 