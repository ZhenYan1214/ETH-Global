<template>
  <div class="swap-container">
    <!-- Navigation Bar -->
    <NavigationBar 
      :navigationItems="navigationItems"
      :showBackButton="true"
      backRoute="/home"
      :showWallet="true"
      :tokens="tokenStore.tokens"
      :showTotalValue="false"
      @logout="handleLogout"
    >
      <template v-slot:network>
        <div class="network-badge d-flex align-center">
          <v-avatar size="20" class="mr-1">
            <v-img src="https://cryptologos.cc/logos/polygon-matic-logo.png" alt="Polygon" />
          </v-avatar>
          <span class="text-caption font-weight-medium">Polygon</span>
        </div>
      </template>
    </NavigationBar>

    <!-- Main Content -->
    <div class="content-container">
      <!-- Notifications -->
      <v-snackbar
        v-model="mainStore.notification.show"
        :color="mainStore.notification.color"
        :timeout="mainStore.notification.timeout"
        top
      >
        {{ mainStore.notification.message }}
        <template v-slot:actions>
          <v-btn v-if="mainStore.notification.color === 'warning' || mainStore.notification.color === 'error'" 
                 text @click="retryConnection">Retry</v-btn>
          <v-btn text @click="mainStore.clearNotification()">Close</v-btn>
        </template>
      </v-snackbar>

      <!-- API Connection Error -->
      <v-card v-if="connectionError" class="error-card mb-4">
        <v-card-text class="d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          <span>{{ connectionError }}</span>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="retryConnection">Retry Connection</v-btn>
        </v-card-text>
      </v-card>

      <!-- Loading Overlay -->
      <v-overlay
        :modelValue="isInitialLoading"
        class="align-center justify-center"
        persistent
      >
        <v-card class="loading-card pa-4">
          <v-card-text class="text-center">
            <v-progress-circular
              indeterminate
              color="primary"
              size="64"
            ></v-progress-circular>
            <div class="mt-4 text-h6">Connecting to Backend</div>
            <div class="text-body-2 mt-2">Please wait while we establish connection...</div>
          </v-card-text>
        </v-card>
      </v-overlay>

      <div class="swap-wrapper">
        <!-- Swap Card -->
        <v-card class="swap-card">
          <v-card-title class="card-title d-flex align-center">
            <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
            <span>Swap</span>
          </v-card-title>

          <v-card-text class="pa-4">
            <!-- Horizontal Layout Container -->
            <div class="horizontal-swap-container">
              <!-- From Token Section -->
              <section class="from-section">
                <div class="d-flex justify-space-between align-center mb-2">
                  <h3 class="text-subtitle-1 font-weight-medium">Input Token</h3>
                  <v-btn 
                    variant="text" 
                    color="primary" 
                    size="small" 
                    density="compact"
                    @click="showFromTokenList = true"
                    class="select-btn"
                  >
                    {{ tokenStore.selectedFromTokens.length > 0 ? 'Selected ' + tokenStore.selectedFromTokens.length + ' tokens' : 'Select Token' }}
                    <v-icon size="small" class="ml-1">mdi-chevron-down</v-icon>
                  </v-btn>
                </div>

                <!-- Single Select Mode -->
                <div v-if="!tokenStore.selectedFromTokens.length">
                  <div class="single-token-container">
                    <simple-token-preview
                      v-if="tokenStore.selectedFromToken"
                      :token="tokenStore.selectedFromToken"
                      :amount="tokenStore.fromAmount"
                      @amount-change="tokenStore.fromAmount = $event; tokenStore.calculateToAmount()"
                      @select="showFromTokenList = true"
                    />
                    <v-card v-else class="empty-preview-card pa-4" variant="outlined" @click="showFromTokenList = true">
                      <div class="text-center cursor-pointer">
                        <v-icon size="large" class="empty-icon">mdi-wallet-outline</v-icon>
                        <div class="text-body-1 mt-2">Select a token</div>
                      </div>
                    </v-card>
                  </div>
                </div>

                <!-- Multi-Select Mode -->
                <div v-else class="token-grid">
                  <div class="selected-tokens-scroll">
                    <v-row>
                      <v-col
                        v-for="token in tokenStore.selectedFromTokens"
                        :key="token.address"
                        cols="12"
                      >
                        <token-card
                          :token="token"
                          @max="setMaxAmount(token.address)"
                          @remove="tokenStore.toggleFromToken(token.address)"
                          @amount-change="updateFromTokenAmount(token.address, $event)"
                        />
                      </v-col>
                    </v-row>
                  </div>

                  <!-- Total Value Display -->
                  <div class="total-value-container mt-4 pa-3">
                    <span class="text-subtitle-2">Total Value</span>
                    <span class="text-h6 font-weight-bold text-primary">
                      ${{ formatPrice(tokenStore.totalFromAmount) }}
                    </span>
                  </div>
                </div>
              </section>

              <!-- Swap Arrow -->
              <div class="swap-arrow-container">
                <v-btn icon size="small" @click="swapTokens" class="swap-arrow-btn" elevation="1">
                  <v-icon>mdi-arrow-right</v-icon>
                </v-btn>
              </div>

              <!-- To Token Section -->
              <section class="to-section">
                <div class="d-flex justify-space-between align-center mb-2">
                  <h3 class="text-subtitle-1 font-weight-medium">You Will Receive</h3>
                </div>
                
                <div class="single-token-container">
                  <simple-token-preview
                    v-if="tokenStore.selectedToToken"
                    :token="tokenStore.selectedToToken"
                    :amount="tokenStore.toAmount"
                    :showClearButton="false"
                    @select="toTokenDialog = true"
                  />
                  <v-card v-else class="empty-preview-card pa-4" variant="outlined" @click="toTokenDialog = true">
                    <div class="text-center cursor-pointer">
                      <v-icon size="large" class="empty-icon">mdi-plus-circle-outline</v-icon>
                      <div class="text-body-1 mt-2">Select a token</div>
                    </div>
                  </v-card>
                </div>
              </section>
            </div>

            <!-- Wallet Connection & Swap Button -->
            <div class="action-container">
              <!-- Wallet Connection -->
              <div v-if="walletStore.isConnected" class="wallet-info mb-3">
                <v-icon size="small" class="mr-1">mdi-wallet</v-icon>
                <span class="text-caption">{{ walletStore.formattedAddress }}</span>
              </div>

              <!-- Swap Button -->
              <div class="swap-btn-container">
                <div v-if="isSwapping" class="swap-progress mb-2">
                  <div class="d-flex justify-space-between mb-1">
                    <span class="text-caption">{{ swapStep === 'approving' ? 'Approving...' : 'Swapping...' }}</span>
                    <span class="text-caption">{{ swapStep === 'approving' ? '1/2' : '2/2' }}</span>
                  </div>
                  <v-progress-linear indeterminate rounded color="primary" height="4"></v-progress-linear>
                </div>
                
                <v-btn
                  block
                  class="swap-btn"
                  size="large"
                  :disabled="!walletStore.isConnected ? false : !canSwap"
                  :loading="isSwapping"
                  @click="walletStore.isConnected ? performSwap() : router.push('/')"
                >
                  {{ swapButtonText }}
                </v-btn>
                
                <div v-if="swapError" class="error-message mt-2 text-caption text-center">
                  {{ swapError }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- From Token Selection Dialog -->
    <v-dialog v-model="showFromTokenList" max-width="600" scrollable>
      <v-card class="token-dialog">
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">Select Token (Multi-Select)</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn 
            v-if="tokenStore.selectedFromTokens.length > 0"
            icon 
            variant="text" 
            color="white"
            @click="tokenStore.clearSelectedFromTokens()"
          >
            <v-icon>mdi-delete-sweep</v-icon>
          </v-btn>
          <v-btn icon variant="text" color="white" @click="showFromTokenList = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        
        <div class="pa-3">
          <v-text-field
            v-model="fromTokenSearchText"
            label="Search Token"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          ></v-text-field>
        </div>
        
        <v-card-text v-if="tokenStore.isLoading" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div class="mt-2">Loading...</div>
        </v-card-text>

        <v-card-text v-else-if="filteredFromTokens.length === 0" class="text-center pa-4">
          <v-icon size="large" color="grey-lighten-1">mdi-alert-circle-outline</v-icon>
          <div class="mt-2">
            {{ fromTokenSearchText ? 'No matching tokens' : 'No tokens with balance found' }}
          </div>
          <div v-if="!fromTokenSearchText" class="text-caption text-grey mt-2">
            You need to have tokens in your wallet to perform a swap
          </div>
        </v-card-text>

        <v-card-text
          v-else
          class="pa-0"
        >
          <div
            class="token-scroll-wrapper"
          >
            <v-list class="py-0">
              <v-list-item
                v-for="token in filteredFromTokens"
                :key="token.address"
                class="token-list-item"
                :class="{ 'selected-token': tokenStore.isTokenSelected(token.address) }"
                @click="selectTokenWithFullAmount(token.address)"
              >
                <template v-slot:prepend>
                  <v-checkbox
                    :model-value="tokenStore.isTokenSelected(token.address)"
                    @click.stop
                    @change="selectTokenWithFullAmount(token.address)"
                    density="compact"
                    hide-details
                    color="primary"
                  />
                  <v-avatar size="32" class="ml-2">
                    <v-img :src="getTokenLogo(token.address)" @error="handleImageError" />
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ getTokenSymbol(token.address) }}
                </v-list-item-title>

                <v-list-item-subtitle class="text-truncate">
                  {{ getTokenName(token.address) }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex flex-column align-end">
                    <span class="text-body-2">{{ getFormattedBalance(token) }}</span>
                    <span v-if="token.price" class="text-caption text-grey">{{ getFormattedPrice(token) }}</span>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- To Token Selection Dialog -->
    <v-dialog v-model="toTokenDialog" max-width="500">
      <v-card class="token-dialog">
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">Select Token</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="toTokenDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        
        <div class="pa-3">
          <v-text-field
            v-model="tokenSearchText"
            label="Search Token"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          ></v-text-field>
        </div>

        <v-card-text v-if="tokenStore.isLoadingAllTokens" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div class="mt-2">Loading...</div>
        </v-card-text>

        <v-card-text v-else-if="Object.keys(filteredAllTokens).length === 0" class="text-center pa-4">
          <v-icon size="large" color="grey-lighten-1">mdi-alert-circle-outline</v-icon>
          <div class="mt-2">No matching tokens</div>
        </v-card-text>

        <v-card-text v-else class="pa-3">
          <v-row>
            <v-col
              v-for="(token, address) in filteredAllTokens"
              :key="address"
              cols="12"
            >
              <v-card
                class="token-selection-card"
                :class="{'selected-token': tokenStore.selectedToToken?.address === address}"
                variant="outlined"
                @click="selectToToken(address)"
              >
                <div class="token-selection-content">
                  <div class="token-selection-left">
                    <v-avatar size="40" class="token-avatar">
                      <v-img :src="token.logoURI || 'https://via.placeholder.com/40'" @error="handleImageError" />
                    </v-avatar>
                    <div class="token-selection-info">
                      <div class="token-selection-name">
                        <span class="font-weight-medium">{{ token.symbol || '???' }}</span>
                        <span class="text-caption text-grey">{{ token.name || 'Unknown Token' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="token-selection-price">
                    <v-chip v-if="token.price" size="small" color="primary" variant="flat" class="token-price-chip">${{ formatPrice(token.price) }}</v-chip>
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import NavigationBar from '../components/NavigationBar.vue'
import { useTokenStore } from '../store/tokens'
import { useWalletStore } from '../store/wallet'
import { useMainStore } from '../store/main'
import { useRouter } from 'vue-router'
import TokenPreview from '../components/TokenPreview.vue'
import TokenCard from '../components/TokenCard.vue'
import SimpleTokenPreview from '../components/SimpleTokenPreview.vue'

// Initialize stores
const tokenStore = useTokenStore()
const walletStore = useWalletStore()
const mainStore = useMainStore()
const router = useRouter()

// Navigation items for the navigation bar - removed History
const navigationItems = []

// Loading state and UI controls
const showFromTokenList = ref(false)
const toTokenDialog = ref(false)
const isSwapping = ref(false)
const swapStep = ref('initial') // 'initial', 'approving', 'swapping', 'complete', 'error'
const swapError = ref('')
const tokenSearchText = ref('')
const fromTokenSearchText = ref('')
const isInitialLoading = ref(true)
const connectionError = ref(null)

// Computed properties for UI
const canSwap = computed(() => {
  const connected = walletStore.isConnected
  
  if (!connected) {
    return false
  }
  
  return tokenStore.canSwap && !isSwapping.value
})

const swapButtonText = computed(() => {
  if (!walletStore.isConnected) return 'Connect Wallet'
  
  // Determine multi-select and single-select mode
  if (tokenStore.selectedFromTokens.length > 0) {
    // Multi-select mode
    if (!tokenStore.selectedToToken) return 'Select "To" Token'
    // Use string comparison instead of parseFloat
    if (!tokenStore.selectedFromTokens.some(t => {
      const amount = t.amount || '0'
      return amount !== '' && amount !== '0'
    })) return 'Enter Amount'
  } else {
    // Single-select mode
    if (!tokenStore.selectedFromToken || !tokenStore.selectedToToken) return 'Select Tokens'
    // Use string comparison instead of parseFloat
    const amount = tokenStore.fromAmount || '0'
    if (amount === '' || amount === '0') return 'Enter Amount'
  }
  
  // Common states
  if (isSwapping.value) {
    if (swapStep.value === 'approving') return 'Approving...'
    if (swapStep.value === 'swapping') return 'Swapping...'
  }
  
  return 'Swap Now'
})

// Calculate filtered token list (for To token dialog)
const filteredAllTokens = computed(() => {
  if (!tokenStore.allTokens) return {}
  
  // If no search text, return all tokens (but limit quantity for performance)
  if (!tokenSearchText.value) {
    // Only show the first 100 tokens to avoid performance issues
    const topTokens = {}
    let count = 0
    
    for (const [address, token] of Object.entries(tokenStore.allTokens)) {
      if (count >= 100) break
      topTokens[address] = token
      count++
    }
    
    return topTokens
  }
  
  // Otherwise, filter tokens based on search text
  const searchText = tokenSearchText.value.toLowerCase()
  const filtered = {}
  
  for (const [address, token] of Object.entries(tokenStore.allTokens)) {
    // Check if address, name or symbol contains search text
    if (
      address.toLowerCase().includes(searchText) ||
      (token.name && token.name.toLowerCase().includes(searchText)) ||
      (token.symbol && token.symbol.toLowerCase().includes(searchText))
    ) {
      filtered[address] = token
    }
    
    // Limit results quantity to improve performance
    if (Object.keys(filtered).length >= 100) break
  }
  
  return filtered
})

// Watch for input changes to calculate swap amount
watch(() => tokenStore.fromAmount, (newValue) => {
  tokenStore.calculateToAmount()
})

// Watch for wallet connection changes
watch(() => walletStore.isConnected, async (isConnected) => {
  if (isConnected) {
    await tokenStore.fetchTokens()
  } else {
    // Redirect to login if wallet disconnected
    if (router.currentRoute.value.path !== '/') {
      router.push('/')
    }
  }
})

// UI Functions
function selectFromToken(address) {
  tokenStore.selectFromToken(address)
  showFromTokenList.value = false
}

function selectToToken(address) {
  tokenStore.selectToToken(address)
  toTokenDialog.value = false
}

function swapTokens() {
  if (tokenStore.selectedFromTokens.length > 0) {
    // Multi-select mode, keep original multi-select and To token
    return;
  }
  
  // Single-select mode, use original swap logic
  tokenStore.swapTokens();
}

function handleLogout() {
  walletStore.disconnect()
  tokenStore.reset()
}

// Swap implementation
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
    
    // First step: Approve tokens (if needed)
    console.log('Requesting token approval...')
    const approvalResult = await tokenStore.approveToken()
    
    if (!approvalResult || !approvalResult.approveDatas || approvalResult.approveDatas.length === 0) {
      throw new Error('Failed to get approval data from server')
    }
    
    // Process approval transaction data
    const approvalTxData = approvalResult.approveDatas[0]
    console.log('Approval data received:', approvalTxData)
    
    // Execute approval transaction
    const approvalTx = await walletStore.sendSwapTransaction({
      to: approvalTxData.to,
      data: approvalTxData.data,
      value: approvalTxData.value || '0x0'
    })
    
    if (!approvalTx || !approvalTx.success) {
      throw new Error(approvalTx?.error || 'Approval transaction failed')
    }
    
    console.log('Approval transaction successful:', approvalTx)
    mainStore.showNotification('Token approval confirmed! Preparing swap...', 'success')
    
    // Second step: Execute the swap
    swapStep.value = 'swapping'
    console.log('Requesting swap data...')
    const swapResult = await tokenStore.executeSwap()
    
    if (!swapResult || !swapResult.swapDatas || swapResult.swapDatas.length === 0) {
      throw new Error('Failed to get swap data from server')
    }
    
    // Process swap transaction data
    const swapTxData = swapResult.swapDatas[0].tx
    console.log('Swap data received:', swapTxData)
    
    // Execute swap transaction with sendSwapTransaction method
    const swapTx = await walletStore.sendSwapTransaction({
      paymaster: true
    })
    
    if (!swapTx || !swapTx.success) {
      throw new Error(swapTx?.error || 'Swap transaction failed')
    }
    
    // Swap successful
    swapStep.value = 'complete'
    mainStore.showNotification('Token swap successful!', 'success')
    
    // Refresh token balances
    await tokenStore.fetchTokens()
    
    // Reset form if successful
    setTimeout(() => {
      if (tokenStore.selectedFromTokens.length > 0) {
        tokenStore.clearSelectedFromTokens()
      } else {
        tokenStore.reset()
      }
    }, 3000)
  } catch (error) {
    console.error('Swap failed:', error)
    swapStep.value = 'error'
    
    // Generate user-friendly error message
    let errorMessage = error.message || 'Unknown error occurred'
    
    // Handle specific error cases
    if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('cancelled')) {
      errorMessage = 'Transaction was rejected by user'
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction'
    } else if (errorMessage.includes('gas')) {
      errorMessage = 'Gas estimation failed. The transaction might fail.'
    } else if (errorMessage.includes('nonce')) {
      errorMessage = 'Transaction nonce error. Please try again.'
    }
    
    swapError.value = errorMessage
    
    // Show error message
    mainStore.showNotification(`Swap failed: ${errorMessage}`, 'error')
  } finally {
    setTimeout(() => {
      if (swapStep.value === 'complete' || swapStep.value === 'error') {
        isSwapping.value = false
        swapStep.value = 'initial'
      }
    }, 3000)
  }
}

// Initialize the component
onMounted(async () => {
  // Check if wallet is connected
  if (!walletStore.isConnected) {
    mainStore.showNotification('Please connect your wallet first', 'warning')
    router.push('/')
    isInitialLoading.value = false
  } else {
    try {
      // Ensure token store is initialized
      if (!tokenStore.initialized) {
        console.log('SwapView: Token store not initialized yet, initializing now...')
        await tokenStore.initialize()
      } else {
        console.log('SwapView: Using already initialized token store')
      }
      
      // Get current wallet token balances
      await tokenStore.fetchTokens()
      
      // If tokens are already selected, update their prices
      if (tokenStore.selectedFromToken || tokenStore.selectedToToken || tokenStore.selectedFromTokens.length > 0) {
        console.log('SwapView: Updating selected token prices')
        await tokenStore.updateSwapTokenPrices()
      }
      
      // Clear any connection errors on successful load
      connectionError.value = null
    } catch (error) {
      console.error('Failed to fetch tokens on mount:', error)
      connectionError.value = error.message || 'Connection to backend failed. Please try again.'
      mainStore.showNotification(`Failed to load tokens: ${error.message || 'Connection to API failed'}`, 'error')
      
      // Add retry button to notification
      setTimeout(() => {
        mainStore.showNotification('Unable to connect to backend. Please check your connection and try again.', 'warning', 0)
      }, 3000)
    } finally {
      isInitialLoading.value = false
    }
  }
})

// Add function to retry API connection
function retryConnection() {
  mainStore.clearNotification()
  mainStore.showNotification('Reconnecting to backend...', 'info')
  isInitialLoading.value = true
  
  // Re-initialize token store and fetch tokens
  tokenStore.initialize().then(() => {
    return tokenStore.fetchTokens()
  }).then(() => {
    mainStore.showNotification('Connection restored successfully!', 'success')
    connectionError.value = null
  }).catch(error => {
    console.error('Retry connection failed:', error)
    connectionError.value = error.message || 'Connection to backend failed. Please try again.'
    mainStore.showNotification(`Connection failed: ${error.message || 'Unknown error'}`, 'error')
  }).finally(() => {
    isInitialLoading.value = false
  })
}

function getTokenSymbol(address) {
  if (!address) return '???';
  
  // First try to find in user tokens
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.symbol) return userToken.symbol;
  
  // If not found in user tokens, look in allTokens
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo ? tokenInfo.symbol : '???';
}

function selectFromTokenByAddress(address, token) {
  tokenStore.selectFromToken(token)
  showFromTokenList.value = false
}

function retryFetchTokens() {
  tokenStore.fetchTokens()
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40'
}

function formatBalance(balance, decimals = 18) {
  // Ensure input is a string
  const balanceStr = String(balance || '0');
  
  // Empty string or '0' directly returns '0'
  if (balanceStr === '' || balanceStr === '0') return '0';
  
  try {
    // Convert from smallest unit (wei) to normal unit based on decimals
    const normalizedBalance = parseFloat(balanceStr) / Math.pow(10, decimals);
    
    // Format with appropriate decimal places
    return normalizedBalance.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0
    });
  } catch (e) {
    console.error('Error formatting balance:', e);
    return balanceStr;
  }
}

function formatPrice(price) {
  if (!price) return '0.00';
  
  try {
    const priceNum = parseFloat(price);
    return priceNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    console.error('Error formatting price:', e);
    return '0.00';
  }
}

function formatAddress(address) {
  // Implement the logic to format the address
  return address.substring(0, 10) + '...' + address.substring(address.length - 8)
}

// New computed properties and functions
const filteredFromTokens = computed(() => {
  // Get all tokens and filter out those with zero balance
  const tokensWithBalance = tokenStore.formattedTokens.filter(token => {
    // Check if token has a non-zero balance
    const balance = token.balance || '0';
    const numBalance = parseFloat(balance);
    return numBalance > 0;
  });
  
  if (!fromTokenSearchText.value) {
    // If no search term, return tokens with balance
    return tokensWithBalance;
  }
  
  const searchText = fromTokenSearchText.value.toLowerCase();
  
  // Filter tokens with balance based on search criteria
  return tokensWithBalance.filter(token => {
    const symbol = getTokenSymbol(token.address).toLowerCase();
    const name = getTokenName(token.address).toLowerCase();
    const address = token.address.toLowerCase();
    
    return symbol.includes(searchText) || 
           name.includes(searchText) || 
           address.includes(searchText);
  });
})

function updateFromTokenAmount(address, amount) {
  // 直接使用用户输入的数字，不做转换
  // 代币金额将在计算时根据小数位进行处理
  tokenStore.updateFromTokenAmount(address, amount);
  
  // 更新界面显示
  tokenStore.calculateMultiTokenExchangeRate();
}

function getTokenLogo(address) {
  if (!address) return 'https://via.placeholder.com/40';
  
  // First try to find in user tokens
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.logoURI) return userToken.logoURI;
  
  // If not found in user tokens, look in allTokens
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo && tokenInfo.logoURI ? tokenInfo.logoURI : 'https://via.placeholder.com/40';
}

function getTokenName(address) {
  if (!address) return 'Unknown Token';
  
  // First try to find in user tokens
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.name) return userToken.name;
  
  // If not found in user tokens, look in allTokens
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo ? tokenInfo.name : 'Unknown Token';
}

function selectTokenWithFullAmount(address) {
  const token = tokenStore.tokens.find(t => t.address === address);
  if (!tokenStore.isTokenSelected(address) && token) {
    // If not yet selected, select it with maximum amount (keep string format)
    tokenStore.toggleFromToken(address);
    tokenStore.updateFromTokenAmount(address, token.balance);
  } else {
    // If already selected, deselect it
    tokenStore.toggleFromToken(address);
  }
}

function setMaxAmount(address) {
  const token = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (token) {
    // Get token decimals
    const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
    const decimals = tokenInfo?.decimals || 18;
    
    if (tokenStore.selectedFromTokens.length > 0) {
      // Multi-select mode - keep original string format
      tokenStore.updateFromTokenAmount(address, token.balance);
    } else {
      // Single-select mode - keep original string format
      tokenStore.fromAmount = token.balance;
    }
  }
}

// Add helper functions to get formatted values with proper decimal handling
function getFormattedBalance(token) {
  if (!token) return '0';
  
  // Get token decimals
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()];
  const decimals = tokenInfo?.decimals || 18;
  
  if (token.formattedBalance) return token.formattedBalance;
  return formatBalance(token.balance, decimals);
}

function getFormattedPrice(token) {
  if (!token || !token.price) return '$0.00';
  
  if (token.formattedPrice) return token.formattedPrice;
  return '$' + formatPrice(token.price);
}

function getFormattedValue(token) {
  if (!token) return '$0.00';
  
  if (token.valueUSD) return token.valueUSD;
  
  // Calculate value if not provided
  if (token.balance && token.price) {
    // Get token decimals
    const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()];
    const decimals = tokenInfo?.decimals || 18;
    
    // Calculate normalized balance
    const normalizedBalance = parseFloat(token.balance) / Math.pow(10, decimals);
    const value = normalizedBalance * parseFloat(token.price);
    
    return '$' + formatPrice(value);
  }
  
  return '$0.00';
}

// 新增函数来格式化显示余额
function getDisplayBalance(token) {
  if (!token || !token.balance) return '0';
  
  // 获取代币小数位
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()];
  const decimals = tokenInfo?.decimals || 18;
  
  // 将最小单位转换为标准单位
  const normalizedBalance = parseFloat(token.balance) / Math.pow(10, decimals);
  
  // 格式化显示
  return normalizedBalance.toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0
  });
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
  padding: 2rem 1rem;
  min-height: calc(100vh - 64px);
}

.swap-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.swap-card {
  width: 100%;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 1rem;
}

.card-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  padding: 1rem 1.25rem;
  letter-spacing: 0.5px;
}

.horizontal-swap-container {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 20px;
}

.from-section, .to-section {
  flex: 1;
  position: relative;
  padding: 0.75rem;
  background-color: rgba(var(--v-theme-primary), 0.02);
  border-radius: 16px;
}

.select-btn {
  border-radius: 20px;
  font-weight: 500;
}

.action-container {
  background-color: rgba(var(--v-theme-primary), 0.03);
  border-radius: 16px;
  padding: 1.25rem;
  margin-top: 1rem;
}

.swap-arrow-container {
  display: flex;
  justify-content: center;
  align-items: center;
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

.swap-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
  border-radius: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 10px rgba(255, 153, 153, 0.2);
  height: 48px;
}

.swap-btn:hover {
  box-shadow: 0 6px 15px rgba(255, 153, 153, 0.3);
}

.token-list-item {
  border-radius: 8px;
  margin: 4px 0;
  transition: background-color 0.2s ease;
}

.token-list-item:hover {
  background-color: rgba(255, 153, 153, 0.05);
}

.selected-token {
  background-color: rgba(255, 153, 153, 0.08) !important;
  border-color: rgba(255, 153, 153, 0.3) !important;
}

.token-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.token-scroll-wrapper {
  max-height: 400px;
  overflow-y: auto;
}

.selected-tokens-scroll {
  max-height: 300px;
  overflow-y: auto;
}

.total-value-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.2);
}

.single-token-container {
  border-radius: 12px;
}

.empty-preview-card {
  border-radius: 12px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.2);
  min-height: 100px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.empty-preview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background-color: rgba(var(--v-theme-primary), 0.03);
}

.empty-icon {
  color: rgba(var(--v-theme-primary), 0.6);
  margin-bottom: 8px;
}

.cursor-pointer {
  cursor: pointer;
}

.error-card {
  background-color: #FFEBEE;
  border-left: 4px solid #F44336;
  border-radius: 8px;
  margin-bottom: 16px;
  max-width: 800px;
  margin: 0 auto 1rem auto;
}

.loading-card {
  border-radius: 12px;
  width: 300px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.token-selection-card {
  border-radius: 12px;
  margin-bottom: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.09);
}

.token-selection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.token-selection-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.token-selection-left {
  display: flex;
  align-items: center;
}

.token-avatar {
  margin-right: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.token-selection-info {
  display: flex;
  flex-direction: column;
}

.token-selection-name {
  display: flex;
  flex-direction: column;
}

.token-selection-price {
  display: flex;
  align-items: center;
}

.token-price-chip {
  font-weight: 500;
}

.network-badge {
  background-color: rgba(130, 71, 229, 0.1);
  border-radius: 16px;
  padding: 4px 8px;
  border: 1px solid rgba(130, 71, 229, 0.2);
}

/* Responsive styles */
@media (max-width: 768px) {
  .horizontal-swap-container {
    flex-direction: column;
    gap: 15px;
  }
  
  .swap-arrow-container {
    transform: rotate(90deg);
    margin: 10px 0;
  }
  
  .swap-wrapper {
    max-width: 480px;
  }
  
  .error-card {
    max-width: 480px;
  }
}

@media (max-width: 600px) {
  .content-container {
    padding: 1rem 0.75rem;
  }
  
  .from-section, .to-section {
    padding: 0.5rem;
  }

  .action-container {
    padding: 1rem;
  }
}

@media (max-height: 700px) {
  .content-container {
    padding-top: 1rem;
  }
  
  .selected-tokens-scroll {
    max-height: 200px;
  }
}
</style> 