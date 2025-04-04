<template>
  <div class="swap-container">
    <!-- 導航欄 -->
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
      <!-- 通知 -->
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

      <!-- Swap 卡片 -->
      <v-card class="swap-card">
        <v-card-title class="card-title">
          <v-icon left class="mr-2">mdi-swap-horizontal</v-icon>
          <span>Swap</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <!-- From Token 部分 -->
          <div class="from-section mb-4">
            <div class="d-flex justify-space-between align-center mb-2">
              <h3 class="text-subtitle-2">輸入代幣</h3>
              <v-btn 
                variant="text" 
                color="primary" 
                size="small" 
                density="compact"
                @click="showFromTokenList = true"
              >
                {{ tokenStore.selectedFromTokens.length > 0 ? '已選擇 ' + tokenStore.selectedFromTokens.length + ' 個代幣' : '選擇代幣' }}
              </v-btn>
            </div>

            <!-- 單選模式 -->
            <v-card v-if="tokenStore.selectedFromTokens.length === 0" class="token-card mb-2 pa-3" elevation="0" variant="outlined">
              <div v-if="tokenStore.selectedFromToken" class="d-flex align-center">
                <v-avatar size="36" class="mr-3">
                  <v-img 
                    :src="getTokenLogo(tokenStore.selectedFromToken.address)" 
                    @error="handleImageError"
                  />
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="text-subtitle-1 font-weight-bold">{{ getTokenSymbol(tokenStore.selectedFromToken.address) }}</div>
                      <div class="text-caption text-grey">{{ getTokenName(tokenStore.selectedFromToken.address) }}</div>
                    </div>
                    <v-chip 
                      v-if="tokenStore.selectedFromToken.price" 
                      size="small" 
                      color="primary" 
                      variant="flat"
                    >
                      ${{ formatPrice(tokenStore.selectedFromToken.price) }}
                    </v-chip>
                  </div>
                  <div class="position-relative">
                    <v-text-field
                      v-model="tokenStore.fromAmount"
                      :label="tokenStore.selectedFromToken ? getTokenSymbol(tokenStore.selectedFromToken.address) : '金額'"
                      variant="underlined"
                      hide-details
                      density="compact"
                      type="number"
                      min="0"
                      class="mt-2"
                    ></v-text-field>
                    <v-btn
                      v-if="tokenStore.selectedFromToken"
                      size="x-small"
                      density="comfortable"
                      variant="text"
                      color="primary"
                      class="max-btn"
                      @click="setMaxAmount(tokenStore.selectedFromToken.address)"
                    >
                      MAX
                    </v-btn>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4">
                <v-icon size="large" color="grey-lighten-1">mdi-wallet-outline</v-icon>
                <div class="text-body-2 text-grey mt-2">請選擇代幣</div>
              </div>
            </v-card>

            <!-- 多選模式 -->
            <v-card v-else class="token-card mb-2" elevation="0" variant="outlined">
              <v-list class="py-0">
                <v-list-item 
                  v-for="token in tokenStore.selectedFromTokens" 
                  :key="token.address"
                  class="token-list-item py-2"
                >
                  <template v-slot:prepend>
                    <v-avatar size="32">
                      <v-img :src="getTokenLogo(token.address)" @error="handleImageError" />
                    </v-avatar>
                  </template>
                  
                  <v-list-item-title class="d-flex justify-space-between align-center">
                    <span class="font-weight-medium">{{ getTokenSymbol(token.address) }}</span>
                    <span class="text-caption text-grey-darken-1">{{ formatBalance(token.balance) }} 可用</span>
                  </v-list-item-title>
                  
                  <template v-slot:append>
                    <div class="d-flex align-center">
                      <div class="position-relative">
                        <v-text-field
                          v-model="token.amount"
                          :label="getTokenSymbol(token.address)"
                          variant="outlined"
                          density="compact"
                          hide-details
                          type="number"
                          min="0"
                          class="amount-input mr-2"
                          style="width: 100px"
                          @input="updateFromTokenAmount(token.address, $event.target.value)"
                        ></v-text-field>
                        <v-btn
                          size="x-small"
                          density="comfortable"
                          variant="text"
                          color="primary"
                          class="max-btn-small"
                          @click="setMaxAmount(token.address)"
                        >
                          MAX
                        </v-btn>
                      </div>
                      <v-btn 
                        icon 
                        size="x-small" 
                        variant="text" 
                        color="error"
                        @click="tokenStore.toggleFromToken(token.address)"
                      >
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
              
              <!-- 總價值顯示 -->
              <div class="px-4 py-3 bg-grey-lighten-4 d-flex justify-space-between align-center">
                <span class="text-body-2 font-weight-medium">總價值</span>
                <span class="text-subtitle-1 font-weight-bold text-primary">${{ formatPrice(tokenStore.totalFromAmount) }}</span>
              </div>
            </v-card>
          </div>

          <!-- Swap 箭頭 -->
          <div class="swap-arrow-container my-3">
            <v-btn icon size="small" @click="swapTokens" class="swap-arrow-btn">
                <v-icon>mdi-swap-vertical</v-icon>
              </v-btn>
            </div>

          <!-- To Token 輸入 -->
          <div class="to-token-section mb-4">
            <h3 class="text-subtitle-2 mb-2">你將獲得的代幣</h3>
            
              <v-text-field
              v-model="tokenStore.toAmount"
                label="To"
                variant="outlined"
              type="number"
              min="0"
              readonly
            >
              <template v-slot:append>
                  <v-btn
                    class="token-select-btn"
                  @click="toTokenDialog = true"
                  variant="tonal"
                  rounded
                >
                  <div v-if="tokenStore.selectedToToken" class="d-flex align-center">
                    <v-avatar size="24">
                      <v-img
                        :src="tokenStore.selectedToToken.logoURI || 'https://via.placeholder.com/24'"
                        @error="handleImageError"
                      />
                    </v-avatar>
                    <div class="ml-2">
                      <div class="token-symbol text-body-2">{{ tokenStore.selectedToToken.symbol || '???' }}</div>
                    </div>
                  </div>
                  <span v-else>Select</span>
                  <v-icon right size="small" class="ml-1">mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
          </div>

          <!-- 錢包信息 -->
          <div v-if="walletStore.isConnected" class="info-box mt-2">
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-1">mdi-wallet</v-icon>
              <span class="text-caption">{{ walletStore.formattedAddress }}</span>
            </div>
          </div>

          <!-- Swap 按鈕 -->
          <div class="swap-btn-container mt-4">
            <!-- 顯示交換進度指示器 -->
            <div v-if="isSwapping" class="swap-progress mb-2">
              <div class="d-flex align-center justify-space-between">
                <span class="text-caption">{{ swapStep === 'approving' ? '批准代幣使用權限...' : '執行交換...' }}</span>
                <v-progress-linear indeterminate color="primary" height="3"></v-progress-linear>
              </div>
            </div>
            
            <!-- 交換按鈕 -->
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
            
            <!-- 錯誤信息 -->
            <div v-if="swapError" class="error-message mt-2 text-caption text-center">
              {{ swapError }}
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- From Token 選擇對話框 -->
    <v-dialog v-model="showFromTokenList" max-width="600" scrollable>
      <v-card>
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">選擇代幣 (可多選)</v-toolbar-title>
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
        
        <!-- 搜索欄位 -->
        <div class="pa-3">
          <v-text-field
            v-model="fromTokenSearchText"
            label="搜索代幣符號、名稱或地址"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          ></v-text-field>
        </div>
        
        <!-- 載入狀態 -->
        <v-card-text v-if="tokenStore.isLoading" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div class="mt-2">載入中...</div>
        </v-card-text>

        <!-- 無代幣提示 -->
        <v-card-text v-else-if="filteredFromTokens.length === 0" class="text-center pa-4">
          <v-icon size="large" color="grey-lighten-1">mdi-alert-circle-outline</v-icon>
          <div class="mt-2">沒有匹配的代幣</div>
        </v-card-text>

        <!-- 代幣列表 -->
        <v-card-text v-else class="pa-0">
          <v-list class="token-list py-0">
            <v-list-item
              v-for="token in filteredFromTokens"
              :key="token.address"
              class="token-list-item"
              :class="{'selected-token': tokenStore.isTokenSelected(token.address)}"
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
                ></v-checkbox>
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
                  <span class="text-body-2">{{ formatBalance(token.balance) }} {{ getTokenSymbol(token.address) }}</span>
                  <span v-if="token.price" class="text-caption text-grey">${{ formatPrice(token.price) }}</span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- To Token 選擇對話框 -->
    <v-dialog v-model="toTokenDialog" max-width="500">
      <v-card>
        <v-card-title class="gradient-bg">
          <v-icon left class="mr-2">mdi-earth</v-icon>
          <span class="text-white">All Tokens</span>
        </v-card-title>
        
        <v-card-text class="pa-4">
          <!-- 搜索欄位 -->
          <v-text-field
            v-model="tokenSearchText"
            label="Search tokens"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            class="mb-3"
          ></v-text-field>

          <!-- 載入狀態 -->
          <div v-if="tokenStore.isLoadingAllTokens" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <div class="mt-2">Loading available tokens...</div>
          </div>

          <!-- 無匹配結果提示 -->
          <div v-else-if="Object.keys(filteredAllTokens).length === 0" class="text-center pa-4">
            <v-icon large>mdi-alert-circle-outline</v-icon>
            <div class="mt-2">No tokens match your search</div>
          </div>

          <!-- 代幣網格 -->
          <v-row v-else>
            <v-col
              v-for="(token, address) in filteredAllTokens"
              :key="address"
              cols="12" sm="6"
            >
              <v-card
                class="token-card"
                elevation="1"
                @click="selectToToken(address)"
                :class="{'selected-token': tokenStore.selectedToToken?.address === address}"
              >
                <div class="d-flex pa-2">
                  <v-avatar size="36" class="mr-2">
                    <v-img
                      :src="token.logoURI || 'https://via.placeholder.com/36'"
                      @error="handleImageError"
                    />
                </v-avatar>
                  <div class="flex-grow-1">
                    <div class="d-flex align-center">
                      <strong class="mr-2">{{ token.symbol || '???' }}</strong>
                      <v-chip
                        v-if="token.price"
                        size="x-small"
                        color="primary"
                        variant="outlined"
                      >${{ formatPrice(token.price) }}</v-chip>
                    </div>
                    <div class="text-caption text-truncate" style="max-width: 150px">{{ token.name || 'Unknown Token' }}</div>
                    <div class="text-caption text-grey">{{ formatAddress(address) }}</div>
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="toTokenDialog = false">Cancel</v-btn>
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
  
  // 判斷多選和單選模式
  if (tokenStore.selectedFromTokens.length > 0) {
    // 多選模式
    if (!tokenStore.selectedToToken) return 'Select "To" Token'
    // 使用字符串比較代替 parseFloat
    if (!tokenStore.selectedFromTokens.some(t => {
      const amount = t.amount || '0'
      return amount !== '' && amount !== '0'
    })) return 'Enter Amount'
  } else {
    // 單選模式
    if (!tokenStore.selectedFromToken || !tokenStore.selectedToToken) return 'Select Tokens'
    // 使用字符串比較代替 parseFloat
    const amount = tokenStore.fromAmount || '0'
    if (amount === '' || amount === '0') return 'Enter Amount'
  }
  
  // 通用狀態
  if (isSwapping.value) {
    if (swapStep.value === 'approving') return 'Approving...'
    if (swapStep.value === 'swapping') return 'Swapping...'
  }
  
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
  if (tokenStore.selectedFromTokens.length > 0) {
    // 多選模式，保持原有多選和 To token
    return;
  }
  
  // 單選模式，使用原有的交換邏輯
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
    mainStore.showNotification('準備交換代幣...', 'info')
    
    // 使用 wallet store 的 sendSwapTransaction 方法執行交換
    const result = await walletStore.sendSwapTransaction({
      paymaster: true
    })
    
    if (!result.success) {
      throw new Error(result.error || '交換失敗')
    }
    
    swapStep.value = 'swapping'
    
    // 交換成功
    swapStep.value = 'complete'
    mainStore.showNotification('代幣交換成功！', 'success')
    
    // 刷新代幣餘額
    await tokenStore.fetchTokens()
  } catch (error) {
    console.error('Swap failed:', error)
    swapStep.value = 'error'
    swapError.value = error.message || 'Swap failed'
    
    // 顯示錯誤訊息
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
  if (!address) return '???';
  
  // 首先嘗試從用戶tokens中查找
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.symbol) return userToken.symbol;
  
  // 如果在用戶tokens中未找到，則從allTokens中查找
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

function formatBalance(balance) {
  // 確保輸入是字符串
  const balanceStr = String(balance || '0');
  
  // 空字符串或 '0' 直接返回 '0'
  if (balanceStr === '' || balanceStr === '0') return '0';
  
  // 為了顯示，將字符串轉換為數字並格式化
  try {
    const balanceNum = Number(balanceStr);
    return balanceNum.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0
    });
  } catch (e) {
    console.error('Error formatting balance:', e);
    return balanceStr;
  }
}

function formatPrice(price) {
  return price.toLocaleString()
}

function formatAddress(address) {
  // Implement the logic to format the address
  return address.substring(0, 10) + '...' + address.substring(address.length - 8)
}

// New computed properties and functions
const filteredFromTokens = computed(() => {
  if (!fromTokenSearchText.value) {
    // 如果沒有搜索詞，返回用戶的代幣和熱門代幣
    return tokenStore.tokens;
  }
  
  const searchText = fromTokenSearchText.value.toLowerCase();
  
  // 先從用戶代幣中搜索
  const filteredUserTokens = tokenStore.tokens.filter(token => {
    const symbol = getTokenSymbol(token.address).toLowerCase();
    const name = getTokenName(token.address).toLowerCase();
    const address = token.address.toLowerCase();
    
    return symbol.includes(searchText) || 
           name.includes(searchText) || 
           address.includes(searchText);
  });
  
  // 如果需要，可以從所有代幣中搜索
  // 這裡可以添加更高級的搜索邏輯
  
  return filteredUserTokens;
})

function updateFromTokenAmount(address, amount) {
  tokenStore.updateFromTokenAmount(address, amount)
}

function getTokenLogo(address) {
  if (!address) return 'https://via.placeholder.com/40';
  
  // 首先嘗試從用戶tokens中查找
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.logoURI) return userToken.logoURI;
  
  // 如果在用戶tokens中未找到，則從allTokens中查找
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo && tokenInfo.logoURI ? tokenInfo.logoURI : 'https://via.placeholder.com/40';
}

function getTokenName(address) {
  if (!address) return 'Unknown Token';
  
  // 首先嘗試從用戶tokens中查找
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.name) return userToken.name;
  
  // 如果在用戶tokens中未找到，則從allTokens中查找
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo ? tokenInfo.name : 'Unknown Token';
}

function selectTokenWithFullAmount(address) {
  const token = tokenStore.tokens.find(t => t.address === address);
  if (!tokenStore.isTokenSelected(address) && token) {
    // 如果尚未被選中，則用最大數量選擇它（保持字符串格式）
    tokenStore.toggleFromToken(address);
    tokenStore.updateFromTokenAmount(address, token.balance);
  } else {
    // 如果已經被選中，則取消選擇
    tokenStore.toggleFromToken(address);
  }
}

function setMaxAmount(address) {
  const token = tokenStore.tokens.find(t => t.address === address);
  if (token) {
    if (tokenStore.selectedFromTokens.length > 0) {
      // 多選模式 - 不轉換為浮點數，保持原始字符串
      tokenStore.updateFromTokenAmount(address, token.balance);
    } else {
      // 單選模式 - 不轉換為浮點數，保持原始字符串
      tokenStore.fromAmount = token.balance;
    }
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
  padding: 1rem;
  min-height: calc(100vh - 64px);
}

.swap-card {
  width: 100%;
  max-width: 460px;
  border-radius: 16px;
}

.card-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
  font-size: 1.2rem;
  padding: 0.75rem 1rem;
}

.token-select-btn {
  height: 36px;
  min-width: 90px;
  background-color: rgba(255, 182, 193, 0.1);
  border: 1px solid rgba(255, 153, 153, 0.2);
}

.swap-arrow-container {
  display: flex;
  justify-content: center;
  margin: 0.25rem 0;
}

.swap-arrow-btn {
  background-color: #FFF0F0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
}

.token-card {
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
}

.token-list-item {
  border-radius: 4px;
  margin: 2px 0;
  transition: background-color 0.2s ease;
}

.token-list-item:hover {
  background-color: var(--v-grey-lighten-4);
}

.selected-token {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}

.amount-input :deep(.v-field__outline) {
  --v-field-border-width: 1px !important;
}

.token-list {
  max-height: 400px;
  overflow-y: auto;
}

.gradient-bg {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
  padding: 0.75rem 1rem;
}

.token-symbol {
  font-weight: 600;
}

.selected-tokens-preview {
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 1rem;
}

.selected-token-card {
  background-color: white;
  border-radius: 8px;
  margin-bottom: 8px;
}

.token-amount-input {
  width: 100%;
}

.total-value {
  font-weight: 600;
}

.multi-token-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 153, 153, 0.3);
  background-color: rgba(255, 255, 255, 0.6);
}

.token-item {
  padding: 4px 0;
}

.token-item:hover {
  background-color: rgba(255, 153, 153, 0.05);
}

.total-value-display {
  background-color: rgba(255, 153, 153, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 8px;
  color: #ff6b6b;
}

.selected-tokens-preview {
  background-color: #f9f9f9;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.selected-token-card {
  border: 1px solid rgba(255, 153, 153, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.selected-token-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.max-btn {
  position: absolute;
  right: 0;
  top: 4px;
  font-size: 0.65rem;
}

.max-btn-small {
  position: absolute;
  right: 35px;
  top: 2px;
  font-size: 0.65rem;
}

.swap-btn-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.swap-progress {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1rem;
}

.error-message {
  color: red;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}
</style> 