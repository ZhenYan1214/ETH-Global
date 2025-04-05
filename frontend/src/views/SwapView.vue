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
          <section class="from-section mb-4">
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
                  <div class="selected-tokens-scroll"
                    style="max-height: 250px; overflow-y: auto;"
                  >
                    <v-row>
                      <v-col
                        v-for="token in tokenStore.selectedFromTokens"
                        :key="token.address"
                        cols="12"
                      >
                        <!-- 如果 token-card 沒有子元素，可以自閉合 -->
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
                <v-icon>mdi-swap-vertical</v-icon>
              </v-btn>
            </div>

          <!-- To Token Section -->
          <section class="to-section mb-4">
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

          <!-- Wallet Connection -->
          <div v-if="walletStore.isConnected" class="wallet-info mb-3">
            <v-icon size="small" class="mr-1">mdi-wallet</v-icon>
            <span class="text-caption">{{ walletStore.formattedAddress }}</span>
          </div>

          <!-- Swap Button -->
          <div class="swap-btn-container mt-3">
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
        </v-card-text>
      </v-card>
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
          <div class="mt-2">No matching tokens</div>
        </v-card-text>

        <v-card-text
          v-else
          class="pa-0"
        >
          <div
            class="token-scroll-wrapper"
            :style="{
              maxHeight: '400px',
              overflowY: 'auto'
            }"
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

// Navigation items for the navigation bar
const navigationItems = [
  { icon: 'mdi-history', title: 'History', route: '/history' }
]

// Loading state and UI controls
const showFromTokenList = ref(false)
const toTokenDialog = ref(false)
const isSwapping = ref(false)
const swapStep = ref('initial') // 'initial', 'approving', 'swapping', 'complete', 'error'
const swapError = ref('')
const tokenSearchText = ref('')
const fromTokenSearchText = ref('')

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
    
    // Use wallet store's sendSwapTransaction method to execute swap
    const result = await walletStore.sendSwapTransaction({
      paymaster: true
    })
    
    if (!result.success) {
      throw new Error(result.error || 'Swap failed')
    }
    
    swapStep.value = 'swapping'
    
    // Swap successful
    swapStep.value = 'complete'
    mainStore.showNotification('Token swap successful!', 'success')
    
    // Refresh token balances
    await tokenStore.fetchTokens()
  } catch (error) {
    console.error('Swap failed:', error)
    swapStep.value = 'error'
    swapError.value = error.message || 'Swap failed'
    
    // Show error message
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

// Initialize the component
onMounted(async () => {
  // Check if wallet is connected
  if (!walletStore.isConnected) {
    mainStore.showNotification('Please connect your wallet first', 'warning')
    router.push('/')
  } else {
    try {
      // Ensure token list is initialized
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
    } catch (error) {
      console.error('Failed to fetch tokens on mount:', error)
      mainStore.showNotification(`Failed to load tokens: ${error.message}`, 'error')
    }
  }
})

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
  if (!fromTokenSearchText.value) {
    // If no search term, return user tokens and popular tokens
    return tokenStore.formattedTokens;
  }
  
  const searchText = fromTokenSearchText.value.toLowerCase();
  
  // First search in user tokens
  const filteredUserTokens = tokenStore.formattedTokens.filter(token => {
    const symbol = getTokenSymbol(token.address).toLowerCase();
    const name = getTokenName(token.address).toLowerCase();
    const address = token.address.toLowerCase();
    
    return symbol.includes(searchText) || 
           name.includes(searchText) || 
           address.includes(searchText);
  });
  
  return filteredUserTokens;
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

.empty-card {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.token-card {
  border-radius: 12px;
  overflow: hidden;
}

.token-grid-card {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.token-grid-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.token-price-bar {
  background-color: rgba(0, 0, 0, 0.02);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-action-buttons {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.token-max-btn {
  font-size: 10px;
  margin-right: 4px;
}

.token-remove-btn {
  min-width: 20px;
  height: 20px;
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

.amount-input :deep(.v-field__outline) {
  --v-field-border-width: 1px !important;
}

.amount-field {
  font-size: 1.1rem;
}

.token-list {
  max-height: 400px;
  overflow-y: auto;
  border-radius: 0;
}

.token-symbol {
  font-weight: 600;
}

.token-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.total-value-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.2);
}

.price-chip {
  font-size: 0.75rem;
}

.max-btn {
  position: absolute;
  right: 0;
  top: 4px;
  font-size: 0.65rem;
  font-weight: bold;
}

.max-btn-small {
  position: absolute;
  right: 35px;
  top: 2px;
  font-size: 0.65rem;
  font-weight: bold;
}

.swap-btn-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.swap-progress {
  width: 100%;
  margin-bottom: 1rem;
}

.error-message {
  color: #ff5252;
  font-size: 0.8rem;
  margin-top: 0.75rem;
}

.empty-token-placeholder {
  opacity: 0.7;
}

@media (max-width: 600px) {
  .content-container {
    padding: 1rem 0.75rem;
  }
  
  .swap-card {
    border-radius: 16px;
  }
}

.token-grid {
  padding: 8px;
  background-color: rgba(var(--v-theme-primary), 0.02);
  border-radius: 12px;
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

.selected-token {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.3) !important;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.15) !important;
}

.single-token-container {
  background-color: rgba(var(--v-theme-primary), 0.02);
  border-radius: 12px;
  padding: 8px;
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
</style> 