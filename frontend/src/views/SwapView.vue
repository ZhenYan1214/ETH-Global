<template>
  <div class="swap-container">
    <!-- 使用新的導航欄組件 -->
    <NavigationBar 
      :navigationItems="navigationItems"
      :showBackButton="true"
      backRoute="/home"
      :showWallet="true"
      :tokens="tokenStore.tokens"
      @logout="handleLogout"
    />

    <!-- 主要內容 -->
    <div class="content-container">
      <!-- 狀態提示 -->
      <v-snackbar
        v-model="mainStore.notification.show"
        :color="mainStore.notification.color"
        :timeout="mainStore.notification.timeout"
        top
      >
        {{ mainStore.notification.message }}
        <template v-slot:actions>
          <v-btn
            color="white"
            variant="text"
            @click="mainStore.clearNotification()"
          >
            Close
          </v-btn>
        </template>
      </v-snackbar>

      <v-card class="swap-card">
        <v-card-title class="card-title">
          <span class="text-h5">
            <v-icon left>mdi-swap-horizontal</v-icon>
            Swap
          </span>
        </v-card-title>

        <v-card-text class="pa-6">
          <!-- Swap 表單 -->
          <div class="swap-form">
            <!-- From Token -->
            <div class="token-input-container">
              <v-text-field
                v-model="tokenStore.fromAmount"
                label="From"
                variant="outlined"
                class="mb-4"
                hide-details
                type="number"
                min="0"
                :rules="[v => v > 0 || 'Amount must be greater than 0']"
              >
                <template v-slot:append>
                  <v-btn
                    class="token-select-btn"
                    @click="showFromTokenList = true"
                    rounded="pill"
                    variant="tonal"
                  >
                    <template v-if="tokenStore.selectedFromToken">
                      <v-avatar size="24" class="mr-2">
                        <v-img
                          :src="tokenStore.selectedFromToken.logoURI || 'https://via.placeholder.com/24'"
                          :alt="tokenStore.selectedFromToken.symbol"
                          @error="handleImageError"
                        />
                      </v-avatar>
                      {{ tokenStore.selectedFromToken.symbol || tokenStore.selectedFromToken.address.substring(0, 6) + '...' }}
                    </template>
                    <template v-else>
                      Select Token
                    </template>
                    <v-icon right class="ml-2">mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
            </div>

            <!-- Swap Arrow -->
            <div class="swap-arrow">
              <v-btn icon class="swap-arrow-btn" @click="swapTokens">
                <v-icon>mdi-swap-vertical</v-icon>
              </v-btn>
            </div>

            <!-- To Token -->
            <div class="token-input-container">
              <v-text-field
                v-model="tokenStore.toAmount"
                label="To"
                variant="outlined"
                class="mb-4"
                hide-details
                type="number"
                min="0"
                readonly
              >
                <template v-slot:append>
                  <v-btn
                    class="token-select-btn"
                    @click="toTokenDialog = true"
                    rounded="pill"
                    variant="tonal"
                  >
                    <template v-if="tokenStore.selectedToToken">
                      <v-avatar size="24" class="mr-2">
                        <v-img
                          :src="tokenStore.selectedToToken.logoURI || 'https://via.placeholder.com/24'"
                          :alt="tokenStore.selectedToToken.symbol"
                          @error="handleImageError"
                        />
                      </v-avatar>
                      {{ tokenStore.selectedToToken.symbol || tokenStore.selectedToToken.address.substring(0, 6) + '...' }}
                    </template>
                    <template v-else>
                      Select Token
                    </template>
                    <v-icon right class="ml-2">mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
            </div>
          </div>

          <!-- 交換比率信息 -->
          <div v-if="tokenStore.selectedFromToken && tokenStore.selectedToToken" class="exchange-rate-info mt-2 mb-4">
            <div class="text-caption">
              Exchange Rate: 
              <span v-if="tokenStore.exchangeRate">
                1 {{ tokenStore.selectedFromToken.symbol || tokenStore.selectedFromToken.address.substring(0, 6) + '...' }} = 
                {{ tokenStore.exchangeRate }} {{ tokenStore.selectedToToken.symbol || tokenStore.selectedToToken.address.substring(0, 6) + '...' }}
              </span>
              <span v-else>
                Calculating...
              </span>
            </div>
            <div class="text-caption" v-if="tokenStore.fromAmount && tokenStore.selectedFromToken">
              Available: {{ tokenStore.selectedFromToken.balance }} {{ tokenStore.selectedFromToken.symbol || tokenStore.selectedFromToken.address.substring(0, 6) + '...' }}
            </div>
          </div>

          <!-- Wallet info -->
          <div v-if="walletStore.isConnected" class="wallet-info mb-4">
            <div class="text-caption">
              Connected Wallet: {{ walletStore.formattedAddress }}
            </div>
          </div>

          <!-- Swap 按鈕 -->
          <v-btn
            block
            class="swap-btn mt-6"
            size="large"
            elevation="2"
            :disabled="!walletStore.isConnected ? false : !canSwap"
            :loading="isSwapping"
            @click="walletStore.isConnected ? performSwap() : router.push('/')"
          >
            {{ swapButtonText }}
          </v-btn>
        </v-card-text>
      </v-card>
    </div>

    <!-- From Token Dialog -->
    <v-dialog v-model="showFromTokenList" max-width="550">
      <v-card>
        <v-card-title class="text-h5 d-flex align-center card-title gradient-bg">
          <v-icon class="mr-2">mdi-wallet</v-icon>
          <span class="text-white">Select From Token</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <!-- 移除 Token View Toggle 按鈕，始終顯示 My Tokens -->
          <div class="d-flex align-center mb-3">
            <v-icon class="mr-2">mdi-account-circle</v-icon>
            <span class="text-h6">My Tokens</span>
          </div>

          <!-- Loading state -->
          <div v-if="tokenStore.isLoading" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <div class="mt-2">Loading your tokens...</div>
          </div>

          <!-- No tokens state -->
          <div v-else-if="Object.keys(tokenStore.tokens).length === 0" class="text-center pa-4">
            <v-icon large>mdi-alert-circle-outline</v-icon>
            <div class="mt-2">No tokens found in your wallet</div>
          </div>

          <!-- Token Grid - Card View -->
          <v-container v-else fluid class="px-0">
            <v-row>
              <!-- My Tokens Grid -->
              <v-col 
                v-for="(token, address) in tokenStore.tokens" 
                :key="address"
                cols="12" sm="6" md="4"
              >
                <v-card 
                  height="130" 
                  class="token-card" 
                  elevation="2" 
                  @click="selectFromToken(address)"
                  :class="{'selected-token': tokenStore.selectedFromToken?.address === address}"
                >
                  <div class="d-flex align-center pa-3">
                    <v-avatar size="42" class="mr-3">
                      <v-img
                        :src="token.logoURI || 'https://via.placeholder.com/40'"
                        :alt="token.symbol"
                        @error="handleImageError"
                      />
                    </v-avatar>
                    <div class="token-info flex-1">
                      <div class="text-subtitle-1 font-weight-bold">{{ token.symbol || '???' }}</div>
                      <div class="text-caption text-truncate token-name">{{ token.name || 'Unknown Token' }}</div>
                    </div>
                  </div>
                  <v-divider></v-divider>
                  <div class="pa-3">
                    <div class="d-flex justify-space-between">
                      <div class="text-caption text-grey">Balance:</div>
                      <div class="text-caption text-grey-darken-3 font-weight-medium">{{ formatBalance(token.balance) }}</div>
                    </div>
                    <div class="d-flex justify-space-between" v-if="token.price">
                      <div class="text-caption text-grey">Price:</div>
                      <div class="text-caption text-grey-darken-3 font-weight-medium">${{ formatPrice(token.price) }}</div>
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="showFromTokenList = false">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- To Token Dialog -->
    <v-dialog v-model="toTokenDialog" max-width="550">
      <v-card>
        <v-card-title class="text-h5 d-flex align-center card-title gradient-bg">
          <v-icon class="mr-2">mdi-swap-horizontal</v-icon>
          <span class="text-white">Select To Token</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <!-- 移除 Token View Toggle 按鈕，始終顯示 All Tokens -->
          <div class="d-flex align-center mb-3">
            <v-icon class="mr-2">mdi-earth</v-icon>
            <span class="text-h6">All Tokens</span>
          </div>

          <!-- Search field -->
          <v-text-field
            v-model="tokenSearchText"
            label="Search tokens"
            placeholder="Name, symbol or address"
            variant="outlined"
            clearable
            prepend-inner-icon="mdi-magnify"
            class="mb-3"
          ></v-text-field>

          <!-- Loading state -->
          <div v-if="tokenStore.isLoadingAllTokens" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <div class="mt-2">Loading available tokens...</div>
          </div>

          <!-- No tokens state -->
          <div v-else-if="Object.keys(filteredAllTokens).length === 0" class="text-center pa-4">
            <v-icon large>mdi-alert-circle-outline</v-icon>
            <div class="mt-2">No tokens match your search</div>
          </div>

          <!-- Token Grid - Card View -->
          <v-container v-else fluid class="px-0">
            <v-row>
              <!-- All Tokens Grid -->
              <v-col 
                v-for="(token, address) in filteredAllTokens" 
                :key="address"
                cols="12" sm="6" md="4"
              >
                <v-card 
                  height="130" 
                  class="token-card" 
                  elevation="2" 
                  @click="selectToToken(address)"
                  :class="{'selected-token': tokenStore.selectedToToken?.address === address}"
                >
                  <div class="d-flex align-center pa-3">
                    <v-avatar size="42" class="mr-3">
                      <v-img
                        :src="token.logoURI || 'https://via.placeholder.com/40'"
                        :alt="token.symbol"
                        @error="handleImageError"
                      />
                    </v-avatar>
                    <div class="token-info flex-1">
                      <div class="text-subtitle-1 font-weight-bold">{{ token.symbol || '???' }}</div>
                      <div class="text-caption text-truncate token-name">{{ token.name || 'Unknown Token' }}</div>
                    </div>
                  </div>
                  <v-divider></v-divider>
                  <div class="pa-3">
                    <div class="text-caption text-grey-darken-2">
                      {{ address.substring(0, 10) }}...{{ address.substring(address.length - 8) }}
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="toTokenDialog = false">
            Cancel
          </v-btn>
        </v-card-actions>
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
  if (!tokenStore.selectedFromToken || !tokenStore.selectedToToken) return 'Select Tokens'
  if (parseFloat(tokenStore.fromAmount) <= 0) return 'Enter Amount'
  if (swapStep.value === 'approving') return 'Approving...'
  if (swapStep.value === 'swapping') return 'Swapping...'
  return 'Swap Now'
})

// 計算過濾後的所有代幣列表（用於 To token 對話框）
const filteredAllTokens = computed(() => {
  if (!tokenStore.allTokens) return {}
  
  // 如果沒有搜索文本，返回所有代幣（但限制數量以提高性能）
  if (!tokenSearchText.value) {
    // 只顯示前 100 個代幣以避免性能問題
    const topTokens = {}
    let count = 0
    
    for (const [address, token] of Object.entries(tokenStore.allTokens)) {
      if (count >= 100) break
      topTokens[address] = token
      count++
    }
    
    return topTokens
  }
  
  // 否則，根據搜索文本過濾代幣
  const searchText = tokenSearchText.value.toLowerCase()
  const filtered = {}
  
  for (const [address, token] of Object.entries(tokenStore.allTokens)) {
    // 檢查地址、名稱或符號是否包含搜索文本
    if (
      address.toLowerCase().includes(searchText) ||
      (token.name && token.name.toLowerCase().includes(searchText)) ||
      (token.symbol && token.symbol.toLowerCase().includes(searchText))
    ) {
      filtered[address] = token
    }
    
    // 限制結果數量以提高性能
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
  tokenStore.swapTokens()
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
    // Step 1: Approve token spending
    swapStep.value = 'approving'
    const approveResponse = await tokenStore.approveToken()
    console.log('Token approval response:', approveResponse)
    
    // Step 2: Execute the swap
    swapStep.value = 'swapping'
    const swapResponse = await tokenStore.executeSwap()
    console.log('Swap execution response:', swapResponse)
    
    // Step 3: Complete
    swapStep.value = 'complete'
    
    // Show success message
    mainStore.showNotification('Swap completed successfully!', 'success')
    
    // Reset the form
    tokenStore.fromAmount = ''
    tokenStore.toAmount = ''
    
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
      // 確保代幣列表已初始化
      if (!tokenStore.initialized) {
        console.log('SwapView: Token store not initialized yet, initializing now...')
        await tokenStore.initialize()
      } else {
        console.log('SwapView: Using already initialized token store')
      }
      
      // 獲取當前錢包的代幣餘額
      await tokenStore.fetchTokens()
    } catch (error) {
      console.error('Failed to fetch tokens on mount:', error)
      mainStore.showNotification(`Failed to load tokens: ${error.message}`, 'error')
    }
  }
})

function getTokenSymbol(address) {
  const token = tokenStore.tokens.find(t => t.address === address)
  return token ? token.symbol : null
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

function formatBalance(balance) {
  return balance.toLocaleString()
}

function formatPrice(price) {
  return price.toLocaleString()
}
</script>

<style scoped>
.swap-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
}

.nav-bar {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
}

.content-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  min-height: calc(100vh - 64px);
}

.swap-card {
  width: 100%;
  max-width: 480px;
  border-radius: 20px !important;
}

.card-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  padding: 1rem 1.5rem !important;
}

.token-select-btn {
  background: rgba(255, 182, 193, 0.1) !important;
  color: #333 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 16px !important;
  height: 40px !important;
}

.swap-arrow {
  display: flex;
  justify-content: center;
  margin: -12px 0;
  position: relative;
  z-index: 1;
}

.swap-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  font-size: 1.1rem !important;
  text-transform: none !important;
  border-radius: 12px !important;
}

.token-dialog {
  border-radius: 12px !important;
}

.dialog-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
}

.close-btn {
  color: white !important;
}

.text-error {
  color: #ff5252;
  font-weight: 500;
}

.token-list-header {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #666;
  border-bottom: 1px solid #e0e0e0;
}

.token-address {
  font-family: monospace;
  font-size: 14px;
  color: #333;
}

.token-balance {
  font-weight: 500;
  color: #666;
}

.token-column {
  flex: 2;
  font-weight: 600;
  color: #666;
}

.balance-column {
  flex: 1;
  text-align: right;
  font-weight: 600;
  color: #666;
}

.token-list-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.token-list-item:hover {
  background-color: #f5f5f5;
}

.token-list-item.selected {
  background-color: #e3f2fd;
}

.exchange-rate-info {
  background-color: rgba(255, 182, 193, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 10px;
}

.token-input-container {
  position: relative;
}

.wallet-info {
  background-color: rgba(255, 182, 193, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 10px;
}

.token-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.token-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.token-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
  border-color: rgba(255, 153, 153, 0.3);
}

.token-card.selected-token {
  border-color: #FF9999;
  background-color: rgba(255, 153, 153, 0.05);
}

.gradient-bg {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
}

.flex-1 {
  flex: 1;
}
</style> 