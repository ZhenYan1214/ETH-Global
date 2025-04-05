<template>
  <div>
    <v-dialog v-model="dialogModel" max-width="600" scrollable content-class="allowance-dialog-wrapper">
      <v-card class="allowance-dialog rounded-xl">
        <!-- 頂部導航欄 -->
        <v-toolbar color="primary" density="compact" class="rounded-t-xl">
          <v-toolbar-title class="text-white font-weight-bold">存入金庫預覽</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="handleClose">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <!-- 加載、錯誤和內容切換 -->
        <div v-if="isLoading" class="loading-container pa-8 d-flex flex-column align-center justify-center">
          <v-progress-circular indeterminate color="primary" size="64" width="6"></v-progress-circular>
          <div class="mt-4 text-body-1 text-center">正在獲取最新數據...</div>
        </div>
        
        <div v-else-if="error" class="error-container pa-6 d-flex flex-column align-center justify-center">
          <v-avatar color="error" class="error-icon mb-4">
            <v-icon size="36" color="white">mdi-alert-circle</v-icon>
          </v-avatar>
          <h3 class="text-h6 text-center mb-2">處理請求時發生錯誤</h3>
          <p class="text-body-2 text-center mb-4">{{ error }}</p>
          <v-btn color="primary" prepend-icon="mdi-refresh" variant="elevated" class="px-6" @click="retry">重試</v-btn>
        </div>
          
        <template v-else>
          <!-- 主要內容 -->
          <v-card-text class="pa-0">
            <!-- 代幣交換摘要卡片 -->
            <div class="summary-card mx-4 mt-4 mb-2 pa-4">
              <div class="text-subtitle-1 font-weight-medium mb-2">交易摘要</div>
              
              <!-- 多代幣輸入展示 -->
              <div v-if="multipleTokens" class="multi-tokens-summary">
                <div class="d-flex justify-space-between align-center mb-2">
                  <div class="text-body-2 text-medium-emphasis">您選擇的代幣 ({{ fromTokens.length }})</div>
                  <div class="text-body-2 font-weight-medium">${{ totalFromValue }}</div>
                </div>
                
                <div class="token-chips-container mb-3">
                  <v-chip
                    v-for="token in fromTokens"
                    :key="token.address"
                    class="token-chip ma-1"
                    size="small"
                    color="primary"
                    variant="outlined"
                  >
                    <template v-slot:prepend>
                      <v-avatar size="16">
                        <v-img :src="token.icon" @error="handleImageError" />
                      </v-avatar>
                    </template>
                    {{ token.symbol }}: {{ token.amount }}
                  </v-chip>
                </div>
              </div>
              
              <!-- 單代幣輸入展示 -->
              <div v-else class="single-token-summary d-flex justify-space-between align-center mb-3">
                <div class="d-flex align-center">
                  <v-avatar size="28" class="mr-2">
                    <v-img :src="fromToken.icon" @error="handleImageError" />
                  </v-avatar>
                  <span class="text-body-1">{{ fromToken.amount }} {{ fromToken.symbol }}</span>
                </div>
                <span class="text-body-2 font-weight-medium">${{ fromUsdValue }}</span>
              </div>
              
              <!-- 轉換指示器 -->
              <div class="conversion-line py-2 d-flex align-center">
                <v-divider></v-divider>
                <v-avatar class="mx-2" color="primary" size="28">
                  <v-icon color="white" size="small">mdi-swap-vertical</v-icon>
                </v-avatar>
                <v-divider></v-divider>
              </div>
              
              <!-- 輸出代幣摘要 -->
              <div class="output-summary d-flex justify-space-between align-center mt-3">
                <div class="d-flex align-center">
                  <v-avatar size="28" class="mr-2">
                    <v-img :src="toToken.icon" @error="handleImageError" />
                  </v-avatar>
                  <span class="text-body-1">{{ toAmount }} {{ toToken.symbol }}</span>
                </div>
                <div class="d-flex align-center">
                  <span class="text-body-2 font-weight-medium mr-2">${{ toUsdValue }}</span>
                  <v-chip 
                    size="x-small" 
                    :color="parseFloat(priceImpact) > 0 ? 'success' : 'error'"
                    class="price-impact-chip"
                  >
                    {{ parseFloat(priceImpact) > 0 ? '+' : '' }}{{ priceImpact }}%
                  </v-chip>
                </div>
              </div>
            </div>
            
            <!-- 交易詳情信息 -->
            <div class="details-card mx-4 mt-3 mb-4 pa-4">
              <div class="text-subtitle-1 font-weight-medium mb-3">詳細信息</div>
              <div class="details-grid">
                <div class="detail-row py-2">
                  <div class="detail-label">
                    <v-icon size="small" color="primary" class="mr-1">mdi-cash-multiple</v-icon>
                    <span>手續費</span>
                  </div>
                  <div class="detail-value free-tag">Deducted from interest</div>
                </div>

                <div class="detail-row py-2">
                  <div class="detail-label">
                    <v-icon size="small" color="primary" class="mr-1">mdi-gas-station</v-icon>
                    <span>網絡費用 (估計)</span>
                  </div>
                  <div class="detail-value sponsored-tag">Sponsored</div>
                </div>

                <div class="detail-row py-2">
                  <div class="detail-label">
                    <v-icon size="small" color="primary" class="mr-1">mdi-clock-outline</v-icon>
                    <span>交易過期時間</span>
                  </div>
                  <div class="detail-value">{{ expirationTime }} 分鐘</div>
                </div>
              </div>
            </div>
          </v-card-text>

          <!-- 確認按鈕區域 -->
          <v-card-actions class="pa-4 pt-0">
            <v-btn
              block
              size="large"
              class="confirm-button"
              :loading="isConfirming"
              :disabled="isConfirming"
              @click="handleConfirmDeposit"
            >
              <span class="button-text">確認存入金庫</span>
            </v-btn>
          </v-card-actions>
          
          <!-- 安全提示 -->
          <div class="security-note pa-4 pt-0 d-flex align-center">
            <v-icon size="small" color="primary" class="mr-2">mdi-shield-check</v-icon>
            <span class="text-caption">所有交易均經過安全驗證並保障資金安全</span>
          </div>
        </template>
      </v-card>
    </v-dialog>

    <TransactionStatus
      :visible="showTransactionStatus"
      :status="transactionStatus"
      :message="transactionMessage"
      :hash="transactionHash"
      @update:visible="(val) => showTransactionStatus = val"
      @done="openFinish"
    />

    <Finish v-if="showFinish" @close="showFinish = false" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTokenStore } from '../store/tokens'
import { useVaultStore } from '../store/vault'
import { useWalletStore } from '../store/wallet'
import { useMainStore } from '../store/main'
import TransactionStatus from './TransactionStatus.vue'
import Finish from './Finish.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'showTransactionStatus'])

const tokenStore = useTokenStore()
const vaultStore = useVaultStore()
const walletStore = useWalletStore()
const mainStore = useMainStore()

// 本地狀態
const isLoading = ref(false)
const isConfirming = ref(false)
const error = ref(null)
const depositPreview = ref(null)
const showTransactionStatus = ref(false)
const showFinish = ref(false)
const transactionStatus = ref('pending')
const transactionMessage = ref('交易處理中，請稍候...')
const transactionHash = ref('')

// 代幣資訊
const toToken = ref({
  symbol: 'USDC',
  icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  price: 1
})

// 計算屬性
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 判斷是否為多代幣輸入
const multipleTokens = computed(() => {
  return tokenStore.selectedFromTokens && tokenStore.selectedFromTokens.length > 1
})

// 從代幣列表 (單個或多個)
const fromTokens = computed(() => {
  if (multipleTokens.value) {
    return tokenStore.selectedFromTokens.map(token => {
      const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()]
      return {
        address: token.address,
        symbol: tokenInfo?.symbol || '???',
        name: tokenInfo?.name || 'Unknown Token',
        icon: tokenInfo?.logoURI || 'https://via.placeholder.com/40',
        amount: token.amount || '0',
        price: tokenInfo?.price || 0
      }
    })
  } else {
    return []
  }
})

// 單一輸入代幣
const fromToken = computed(() => {
  if (multipleTokens.value) {
    return null
  }
  
  const token = tokenStore.selectedFromToken
  if (!token) return { symbol: '???', icon: 'https://via.placeholder.com/40', amount: '0' }
  
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()]
  return {
    address: token.address,
    symbol: tokenInfo?.symbol || '???',
    name: tokenInfo?.name || 'Unknown Token',
    icon: tokenInfo?.logoURI || 'https://via.placeholder.com/40',
    amount: tokenStore.fromAmount || '0',
    price: tokenInfo?.price || 0
  }
})

// 總輸入價值 (USD)
const totalFromValue = computed(() => {
  if (multipleTokens.value) {
    return formatUsdValue(fromTokens.value.reduce((sum, token) => {
      return sum + (parseFloat(token.amount) * (parseFloat(token.price) || 0))
    }, 0))
  } else if (fromToken.value) {
    return formatUsdValue(parseFloat(fromToken.value.amount) * (parseFloat(fromToken.value.price) || 0))
  }
  return '0.00'
})

// 從預覽數據中取值
const fromUsdValue = computed(() => {
  if (!depositPreview.value) return '0.00'
  return formatUsdValue(depositPreview.value.fromUsdValue)
})

const toAmount = computed(() => {
  if (!depositPreview.value) return '0'
  return formatAmount(depositPreview.value.toAmount)
})

const toUsdValue = computed(() => {
  if (!depositPreview.value) return '0.00'
  return formatUsdValue(depositPreview.value.toUsdValue)
})

const priceImpact = computed(() => {
  if (!depositPreview.value) return '0.00'
  return depositPreview.value.priceImpact
})

const exchangeRate = computed(() => {
  if (!depositPreview.value) return '1.00'
  return depositPreview.value.exchangeRate
})

const depositFee = computed(() => {
  return 'FREE'  // 可以根據後端返回數據調整
})

const networkCost = computed(() => {
  if (!depositPreview.value) return '0'
  return depositPreview.value.networkCost
})

const expectedReceive = computed(() => {
  if (!depositPreview.value) return '0'
  return formatAmount(depositPreview.value.expectedReceive)
})

const expirationTime = computed(() => {
  if (!depositPreview.value) return '30'
  return depositPreview.value.expirationTime
})

// 監聽對話框顯示狀態
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    // 获取數據
    fetchDepositPreview()
  }
})

// 方法
async function fetchDepositPreview() {
  isLoading.value = true
  error.value = null
  
  console.log('Allowance: 開始獲取存款預覽');
  console.log('多選模式?', multipleTokens.value);
  
  if (multipleTokens.value) {
    console.log('已選擇的多個代幣:', tokenStore.selectedFromTokens);
  } else {
    console.log('已選擇的單個代幣:', tokenStore.selectedFromToken);
  }
  
  // 同步代幣選擇狀態，確保單選和多選模式一致
  const syncResult = tokenStore.syncTokenSelectionState();
  console.log('代幣選擇狀態同步結果:', syncResult);
  
  try {
    // 檢查錢包連接狀態
    if (!walletStore.isConnected) {
      throw new Error('請先連接錢包')
    }
    
    // 準備選定的代幣數據
    let tokens = [];
    
    if (multipleTokens.value) {
      // 多選模式
      tokens = tokenStore.selectedFromTokens
        .filter(t => t && t.amount && parseFloat(t.amount) > 0)
        .map(t => ({
          address: t.address,
          amount: t.amount
        }));
    } else if (tokenStore.selectedFromToken) {
      // 單選模式
      tokens = [{
        address: tokenStore.selectedFromToken.address,
        amount: tokenStore.fromAmount
      }];
    }
    
    console.log('準備發送到預覽的代幣:', tokens);
    
    // 檢查是否有選擇代幣
    if (tokens.length === 0 || !tokens[0]?.address) {
      throw new Error('沒有選擇代幣或金額為0，請返回並選擇代幣')
    }
    
    // 調用 vault store 的預覽存款方法
    try {
      console.log('調用 vaultStore.previewDeposit');
      const preview = await vaultStore.previewDeposit(tokens)
      if (!preview) {
        throw new Error('獲取存款預覽失敗')
      }
      
      console.log('獲取預覽成功:', preview);
      depositPreview.value = preview
    } catch (previewError) {
      console.error('獲取存款預覽失敗:', previewError)
      
      // 提供更具體的錯誤消息
      if (previewError.message.includes('請先選擇代幣')) {
        throw new Error('請返回並選擇代幣')
      } else if (previewError.message.includes('請輸入代幣金額') || 
                previewError.message.includes('請為選擇的代幣設置金額')) {
        throw new Error('請返回並為選擇的代幣設置金額')
      } else {
        throw previewError
      }
    }
  } catch (err) {
    console.error('獲取存款預覽失敗:', err)
    error.value = err.message || '獲取存款預覽失敗'
    mainStore.showNotification(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

function retry() {
  // 清除先前的錯誤
  error.value = null
  
  // 重新嘗試獲取預覽
  fetchDepositPreview()
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40'
}

function handleClose() {
  dialogModel.value = false
  
  // 重置狀態
  vaultStore.resetDepositState()
  
  // 檢查是否需要清理代幣選擇狀態
  const shouldClearTokens = window.confirm('是否要清除已選擇的代幣?');
  if (shouldClearTokens) {
    // 清空代幣選擇
    tokenStore.clearSelectedFromTokens();
    tokenStore.selectedFromToken = null;
    tokenStore.fromAmount = '';
    console.log('已清除代幣選擇狀態');
  }
}

async function handleConfirmDeposit() {
  if (isConfirming.value) return
  
  try {
    isConfirming.value = true
    
    // 關閉當前對話框
    dialogModel.value = false
    
    // 等待對話框關閉動畫
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 顯示交易狀態對話框
    showTransactionStatus.value = true
    
    // 發出事件，通知父組件顯示交易狀態
    emit('showTransactionStatus', true)
    
    // 執行存款交易
    const result = await vaultStore.executeDeposit()
    
    if (result) {
      transactionStatus.value = 'success'
      transactionMessage.value = '存款交易已成功！'
      transactionHash.value = vaultStore.transactionHash || ''
      
      // 更新代幣餘額
      await tokenStore.fetchTokens()
    } else {
      transactionStatus.value = 'error'
      transactionMessage.value = vaultStore.error || '存款交易失敗'
    }
  } catch (error) {
    console.error('存款失敗:', error)
    transactionStatus.value = 'error'
    transactionMessage.value = error.message || '交易處理時發生錯誤'
  } finally {
    isConfirming.value = false
  }
}

function openFinish() {
  showFinish.value = true
}

// 格式化數字的輔助函數
function formatUsdValue(value) {
  const numValue = parseFloat(value) || 0
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatAmount(value) {
  const numValue = parseFloat(value) || 0
  return numValue.toLocaleString('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0
  })
}

onMounted(() => {
  // 重置狀態
  vaultStore.resetDepositState()
})
</script>

<style scoped>
.allowance-dialog-wrapper {
  overflow-y: auto;
}

.allowance-dialog {
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

:deep(.v-toolbar) {
  background: rgb(244, 167, 167) !important;
}

.loading-container {
  min-height: 300px;
}

.error-container {
  min-height: 300px;
  background-color: rgba(244, 67, 54, 0.05);
}

.error-icon {
  width: 64px;
  height: 64px;
}

.summary-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(244, 167, 167, 0.1);
}

.token-chips-container {
  display: flex;
  flex-wrap: wrap;
  margin: -4px;
}

.token-chip {
  margin: 4px !important;
}

.conversion-line {
  margin: 12px 0;
}

.details-card {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.details-expansion) {
  box-shadow: none !important;
  border: 1px solid rgba(244, 167, 167, 0.1) !important;
  border-radius: 12px !important;
}

:deep(.v-expansion-panel) {
  background: white !important;
  box-shadow: none !important;
}

:deep(.v-expansion-panel-title) {
  min-height: 48px !important;
  padding: 0 16px !important;
}

.details-grid {
  display: grid;
  grid-gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 0.9rem;
}

.detail-value {
  font-weight: 500;
  color: #333;
}

.free-tag {
  color: #4caf50;
  font-weight: 600;
}

.sponsored-tag {
  color: #2196f3;
  font-weight: 600;
}

.expected-receive-card {
  background: rgba(244, 167, 167, 0.1);
  border-radius: 12px;
}

.confirm-button {
  background: linear-gradient(135deg, #f4a7a7, #e57373) !important;
  color: white !important;
  height: 48px !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.5px;
  border-radius: 24px !important;
  box-shadow: 0 4px 12px rgba(244, 167, 167, 0.3) !important;
  text-transform: none !important;
  transition: all 0.3s ease !important;
}

.confirm-button:hover {
  box-shadow: 0 6px 14px rgba(244, 167, 167, 0.4) !important;
  transform: translateY(-1px);
}

.confirm-button:active {
  box-shadow: 0 2px 8px rgba(244, 167, 167, 0.2) !important;
  transform: translateY(1px);
}

.security-note {
  color: #757575;
}

/* 移動端響應式樣式 */
@media (max-width: 600px) {
  .details-section {
    padding: 12px !important;
  }
  
  .confirm-button {
    height: 44px !important;
  }
  
  .expected-receive-card,
  .summary-card,
  .details-card {
    margin-left: 12px !important;
    margin-right: 12px !important;
  }
}
</style>
