<template>
  <div>
    <!-- 4626list 對話框 -->
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600" scrollable>
      <v-card class="token-dialog">
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">選擇代幣 (多選)</v-toolbar-title>
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
          <v-btn icon variant="text" color="white" @click="$emit('update:modelValue', false)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        
        <!-- 搜索欄位 -->
        <div class="pa-3">
          <v-text-field
            v-model="searchText"
            label="搜尋代幣"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          ></v-text-field>
        </div>
        
        <!-- 載入中狀態 -->
        <v-card-text v-if="tokenStore.isLoading" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div class="mt-2">載入中...</div>
        </v-card-text>

        <!-- 無結果狀態 -->
        <v-card-text v-else-if="filteredTokens.length === 0" class="text-center pa-4">
          <v-icon size="large" color="grey-lighten-1">mdi-alert-circle-outline</v-icon>
          <div class="mt-2">您的錢包中沒有代幣</div>
          <div class="text-caption text-grey mt-1">請連接錢包或添加代幣</div>
        </v-card-text>

        <!-- 代幣列表 -->
        <v-card-text v-else class="token-list-container pa-0">
          <v-list class="token-list py-0">
            <v-list-item
              v-for="token in filteredTokens"
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
                <div class="token-amount">
                  <span class="text-body-2">{{ getFormattedBalance(token) }}</span>
                  <span v-if="token.price" class="text-caption text-grey">${{ getFormattedPrice(token) }}</span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>

        <!-- 底部區域 -->
        <div class="token-dialog-footer">
          <!-- 總資產價值 -->
          <v-divider></v-divider>
          <div class="total-value-container px-4 py-3">
            <div class="d-flex justify-space-between align-center">
              <span class="text-subtitle-1">總價值:</span>
              <span class="text-h6 font-weight-bold text-primary">${{ getTotalValue }}</span>
            </div>
          </div>

          <!-- 金庫按鈕 -->
          <div class="vault-button-container px-4 pb-4">
            <v-btn
              class="vault-button"
              elevation="0"
              rounded
              block
              :disabled="!hasSelectedTokens"
              :class="{'vault-button-disabled': !hasSelectedTokens}"
              @click="goToVault"
            >
              <span class="vault-button-text">✨ 金庫我來了 ✨</span>
            </v-btn>
            
            <!-- 添加提示信息 -->
            <div v-if="!hasSelectedTokens" class="selection-hint mt-2 text-center">
              <v-icon color="warning" size="small" class="mr-1">mdi-information</v-icon>
              <span class="text-caption">請先選擇至少一個代幣</span>
            </div>
            <div v-else-if="hasInvalidAmounts" class="selection-hint mt-2 text-center">
              <v-icon color="warning" size="small" class="mr-1">mdi-cash-alert</v-icon>
              <span class="text-caption">有代幣金額為0，請確認金額</span>
            </div>
          </div>
        </div>
      </v-card>
    </v-dialog>

    <!-- Allowance 對話框 -->
    <Allowance 
      v-model="showAllowanceDialog"
      @showTransactionStatus="handleShowTransactionStatus"
    />

    <!-- TransactionStatus 對話框 -->
    <TransactionStatus
      v-model:visible="showTransactionStatusDialog"
      :status="transactionStatus"
      :message="transactionMessage"
      :hash="transactionHash"
      :receipt="transactionReceipt"
      @done="handleTransactionDone"
    />

    <!-- Finish 對話框 -->
    <Finish 
      v-model:show="showFinishDialog" 
      :to-amount="receivedAmount"
      :transaction-hash="transactionHash"
      :receipt="transactionReceipt"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useTokenStore } from '../store/tokens'
import { useWalletStore } from '../store/wallet'
import { useRouter } from 'vue-router'
import Allowance from './Allowance.vue'
import TransactionStatus from './TransactionStatus.vue'
import Finish from './Finish.vue'
import { useMainStore } from '../store/main'
import { useVaultStore } from '../store/vault'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])
const router = useRouter()

const tokenStore = useTokenStore()
const walletStore = useWalletStore()
const searchText = ref('')
const showAllowanceDialog = ref(false)
const showTransactionStatusDialog = ref(false)
const showFinishDialog = ref(false)
const transactionStatus = ref('pending')
const transactionMessage = ref('交易處理中，請稍候...')
const transactionHash = ref('')
const transactionReceipt = ref(null)
const receivedAmount = ref('0')
const errorMessage = ref('')
const vaultStore = useVaultStore()

// 聲明在資料區域的頂部
let vaultStoreSubscription = null

// 監聽對話框顯示狀態
watch(() => props.modelValue, async (newValue) => {
  if (newValue && walletStore.isConnected) {
    // 當對話框打開時，重新獲取用戶錢包中的代幣
    await tokenStore.fetchTokens()
  }
})

// 過濾代幣列表 - 只顯示有餘額的代幣
const filteredTokens = computed(() => {
  if (!tokenStore.tokens) return []
  
  const search = searchText.value.toLowerCase()
  return tokenStore.tokens.filter(token => {
    // 確保代幣有餘額且不為0
    if (!token.balance || token.balance === '0' || parseFloat(token.balance) === 0) return false
    
    const symbol = getTokenSymbol(token.address).toLowerCase()
    const name = getTokenName(token.address).toLowerCase()
    const address = token.address.toLowerCase()
    
    return symbol.includes(search) || 
           name.includes(search) || 
           address.includes(search)
  })
})

// 計算總資產價值
const getTotalValue = computed(() => {
  if (!tokenStore.tokens) return '0.00'
  
  const total = tokenStore.tokens.reduce((sum, token) => {
    const balance = parseFloat(getFormattedBalance(token)) || 0
    const price = parseFloat(token.price) || 0
    return sum + (balance * price)
  }, 0)
  
  return total.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

// 檢查是否有選擇代幣
const hasSelectedTokens = computed(() => {
  return tokenStore.selectedFromTokens && tokenStore.selectedFromTokens.length > 0;
});

// 檢查選擇的代幣中是否有無效金額
const hasInvalidAmounts = computed(() => {
  if (!hasSelectedTokens.value) return false;
  
  return tokenStore.selectedFromTokens.some(token => {
    return !token.amount || token.amount === '0' || parseFloat(token.amount) <= 0;
  });
});

function getTokenLogo(address) {
  if (!address) return 'https://via.placeholder.com/40'
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()]
  return tokenInfo?.logoURI || 'https://via.placeholder.com/40'
}

function getTokenSymbol(address) {
  if (!address) return '???'
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()]
  return tokenInfo?.symbol || '???'
}

function getTokenName(address) {
  if (!address) return 'Unknown Token'
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()]
  return tokenInfo?.name || 'Unknown Token'
}

function getFormattedBalance(token) {
  if (!token || !token.balance) return '0'
  
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()]
  const decimals = tokenInfo?.decimals || 18
  
  try {
    const normalizedBalance = parseFloat(token.balance) / Math.pow(10, decimals)
    return normalizedBalance.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0
    })
  } catch (e) {
    return '0'
  }
}

function getFormattedPrice(token) {
  if (!token.price) return '0.00'
  
  try {
    const price = parseFloat(token.price)
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  } catch (e) {
    return '0.00'
  }
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40'
}

function selectTokenWithFullAmount(address) {
  const token = tokenStore.tokens.find(t => t.address === address)
  if (!token) {
    console.error('找不到代幣:', address)
    return
  }
  
  if (!tokenStore.isTokenSelected(address)) {
    // 如果尚未選擇，選擇它並設置最大金額
    tokenStore.toggleFromToken(address)
    
    // 獲取代幣資訊以設置正確的金額
    const tokenInfo = tokenStore.allTokens[address.toLowerCase()]
    const decimals = tokenInfo?.decimals || 18
    
    // 確保金額不為零
    try {
      const balance = token.balance || '0'
      if (balance !== '0' && parseFloat(balance) > 0) {
        tokenStore.updateFromTokenAmount(address, balance)
        console.log(`選擇代幣 ${address} 並設置金額 ${balance}`)
      } else {
        console.warn(`代幣 ${address} 餘額為零`)
        // 即使餘額為零也要設置一個預設值以避免問題
        tokenStore.updateFromTokenAmount(address, '1')
      }
    } catch (error) {
      console.error('設置代幣金額時出錯:', error)
      // 設置一個預設值以避免問題
      tokenStore.updateFromTokenAmount(address, '1')
    }
  } else {
    // 如果已選擇，取消選擇它
    tokenStore.toggleFromToken(address)
  }
  
  // 檢查選擇狀態並更新按鈕狀態
  console.log('已選擇的代幣:', tokenStore.selectedFromTokens.length)

  // 同步單選和多選模式的狀態
  const syncResult = tokenStore.syncTokenSelectionState();
  console.log('代幣選擇狀態同步結果:', syncResult);
}

function goToVault() {
  // 檢查是否有選擇代幣
  if (!hasSelectedTokens.value) {
    // 如果沒有選擇代幣，顯示提示訊息
    const mainStore = useMainStore()
    mainStore.showNotification('請至少選擇一個代幣', 'warning')
    return
  }
  
  // 確保所有選定的代幣都有金額
  const invalidTokens = tokenStore.selectedFromTokens.filter(token => {
    return !token.amount || parseFloat(token.amount) <= 0;
  });
  
  if (invalidTokens.length > 0) {
    const mainStore = useMainStore()
    mainStore.showNotification('有代幣金額為空或為0，請設定金額', 'warning')
    return
  }
  
  try {
    // 處理單選和多選情況
    if (tokenStore.selectedFromTokens.length === 1) {
      // 如果只選擇了一個代幣，也設置為 selectedFromToken，確保兩種模式下數據一致
      const selectedToken = tokenStore.selectedFromTokens[0];
      
      // 設置 selectedFromToken 和 fromAmount
      tokenStore.selectedFromToken = {
        address: selectedToken.address,
        amount: selectedToken.amount,
        // 其他屬性保持不變
        ...tokenStore.tokens.find(t => t.address === selectedToken.address)
      };
      
      tokenStore.fromAmount = selectedToken.amount;
      console.log('單選模式: 設置 selectedFromToken', tokenStore.selectedFromToken);
    } else {
      // 多選模式，確保所有代幣數據正確
      console.log('多選模式: 選擇了 ' + tokenStore.selectedFromTokens.length + ' 個代幣');
    }
    
    // 同步單選和多選模式的狀態
    const syncResult = tokenStore.syncTokenSelectionState();
    console.log('代幣選擇狀態同步結果:', syncResult);
    
    // 設置目標代幣為 USDC
    tokenStore.selectedToToken = {
      address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      symbol: 'USDC',
      name: 'USD Coin',
      icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      price: '1.00'
    };
    
    // 關閉當前對話框，打開 Allowance 對話框
    emit('update:modelValue', false)  // 先關閉 4626list 對話框
    setTimeout(() => {
      showAllowanceDialog.value = true  // 然後顯示 Allowance 對話框
    }, 300)
  } catch (error) {
    console.error('準備跳轉到 Allowance 時發生錯誤:', error);
    const mainStore = useMainStore();
    mainStore.showNotification('處理代幣數據時發生錯誤: ' + error.message, 'error');
  }
}

// 處理交易狀態顯示
function handleShowTransactionStatus() {
  try {
    console.log('[4626list] 顯示交易狀態')
    showTransactionStatusDialog.value = true
    transactionStatus.value = 'pending'
    transactionMessage.value = '交易處理中，請稍候...'
    transactionHash.value = ''
    transactionReceipt.value = null
    
    // 先取消現有訂閱，避免重複
    if (vaultStoreSubscription) {
      try {
        vaultStoreSubscription()
        console.log('[4626list] 已取消舊的 vaultStore 訂閱')
      } catch (error) {
        console.error('[4626list] 取消舊訂閱時發生錯誤:', error)
      }
      vaultStoreSubscription = null
    }
    
    // 創建新的訂閱
    console.log('[4626list] 創建新的 vaultStore 訂閱')
    try {
      vaultStoreSubscription = vaultStore.$subscribe((mutation, state) => {
        try {
          console.log('[4626list] Vault store 狀態變化:', {
            depositStatus: state.depositStatus,
            transactionHash: state.transactionHash,
            hasReceipt: state.depositReceipt ? '有' : '無',
            error: state.error
          })
          
          // 檢查狀態變化並更新 TransactionStatus 組件的顯示
          if (state.depositStatus === 'processing' && state.transactionHash) {
            console.log('[4626list] 交易處理中...')
            transactionStatus.value = 'pending'
            transactionMessage.value = '交易已提交，等待確認...'
            transactionHash.value = state.transactionHash
          } 
          else if (state.depositStatus === 'success') {
            console.log('[4626list] 交易成功!')
            transactionStatus.value = 'success'
            transactionMessage.value = '交易已確認！'
            
            // 只有在收到收據後才設置 receipt
            if (state.depositReceipt) {
              console.log('[4626list] 收到交易收據:', state.depositReceipt)
              try {
                // 明確轉換為新物件，確保觸發 Vue 的響應式
                const receiptCopy = JSON.parse(JSON.stringify(state.depositReceipt))
                transactionReceipt.value = receiptCopy
                
                // 設置接收到的金額，用於完成頁面顯示
                if (state.depositPreview && state.depositPreview.dstAmount) {
                  receivedAmount.value = formatDisplayAmount(state.depositPreview.dstAmount)
                  console.log('[4626list] 設置接收金額:', receivedAmount.value)
                }
              } catch (receiptError) {
                console.error('[4626list] 處理交易收據時發生錯誤:', receiptError)
              }
            } else {
              console.warn('[4626list] 交易成功但未收到收據')
            }
          } 
          else if (state.depositStatus === 'error') {
            console.log('[4626list] 交易失敗:', state.error)
            transactionStatus.value = 'error'
            transactionMessage.value = `交易失敗: ${state.error || '未知錯誤'}`
          }
        } catch (subscribeError) {
          console.error('[4626list] 訂閱回調中發生錯誤:', subscribeError)
        }
      })
    } catch (subscriptionError) {
      console.error('[4626list] 創建訂閱時發生錯誤:', subscriptionError)
    }
  } catch (error) {
    console.error('[4626list] 顯示交易狀態時發生錯誤:', error)
  }
}

// 處理交易完成後的行為
function handleTransactionDone() {
  try {
    console.log('[4626list] 交易過程完成，狀態:', transactionStatus.value)
    
    // 取消 vaultStore 訂閱
    if (vaultStoreSubscription) {
      try {
        vaultStoreSubscription()
        vaultStoreSubscription = null
        console.log('[4626list] 已取消 vaultStore 訂閱')
      } catch (error) {
        console.error('[4626list] 取消訂閱時發生錯誤:', error)
      }
    }
    
    // 檢查交易狀態
    if (transactionStatus.value === 'success') {
      console.log('[4626list] 顯示完成頁面')
      
      // 確保關閉交易狀態對話框後再顯示完成頁面
      setTimeout(() => {
        try {
          showFinishDialog.value = true
          console.log('[4626list] 完成頁面已顯示')
        } catch (error) {
          console.error('[4626list] 顯示完成頁面時發生錯誤:', error)
        }
      }, 300)
    }
    
    // 重置交易相關狀態
    transactionStatus.value = 'pending'
    transactionMessage.value = '交易處理中，請稍候...'
    transactionHash.value = ''
    transactionReceipt.value = null
    
    // 重置 vaultStore
    try {
      console.log('[4626list] 重置 vaultStore')
      vaultStore.$reset()
    } catch (error) {
      console.error('[4626list] 重置 vaultStore 時發生錯誤:', error)
    }
  } catch (error) {
    console.error('[4626list] 處理交易完成事件時發生錯誤:', error)
  }
}

// 在組件卸載時確保清理訂閱
onUnmounted(() => {
  if (vaultStoreSubscription) {
    try {
      vaultStoreSubscription()
      vaultStoreSubscription = null
      console.log('[4626list] 組件卸載時已取消 vaultStore 訂閱')
    } catch (error) {
      console.error('[4626list] 組件卸載時取消訂閱發生錯誤:', error)
    }
  }
})

async function handleRetry() {
  transactionStatus.value = 'pending'
  errorMessage.value = ''
  
  try {
    // 尝试重新关闭窗口并从 Allowance 开始
    showTransactionStatusDialog.value = false
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 重新打开 Allowance 弹窗
    showAllowanceDialog.value = true
  } catch (error) {
    transactionStatus.value = 'error'
    errorMessage.value = error.message || '重试失败'
  }
}

// 格式化金額顯示
function formatDisplayAmount(amount, decimals = 6) {
  if (!amount) return '0';
  
  // 確保金額是字符串
  const amountStr = amount.toString();
  
  // 轉換為數字
  const value = parseFloat(amountStr) / Math.pow(10, decimals);
  
  // 格式化顯示，保留2位小數
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// 組件掛載時，如果錢包已連接則獲取代幣列表
onMounted(async () => {
  if (walletStore.isConnected) {
    // 確保只獲取用戶錢包中的代幣
    await tokenStore.fetchTokens()
  }
})
</script>

<style scoped>
.token-dialog {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.token-list-container {
  flex: 1;
  overflow: hidden;
}

.token-list {
  max-height: 40vh;
  overflow-y: auto;
  background: white;
}

.token-list-item {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 4px 8px;
  background: white;
  display: flex;
  align-items: center;
}

.token-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 80px;
}

.token-dialog-footer {
  background: white;
}

.total-value-container {
  background: white;
}

.vault-button-container {
  display: flex;
  flex-direction: column;
  background: white;
}

.selection-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  background-color: rgba(255, 193, 7, 0.1);
  margin-top: 8px;
}

.vault-button {
  background: linear-gradient(135deg, #FFB6C1, #FF69B4) !important;
  position: relative;
  overflow: hidden;
  height: 48px !important;
  font-size: 1.2rem !important;
  font-weight: 700 !important;
  letter-spacing: 1px;
  text-transform: none !important;
  transition: all 0.3s ease !important;
  z-index: 1;
}

.selected-token {
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
}

.vault-button::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transform: rotate(45deg);
  animation: shine 3s infinite;
  z-index: -1;
}

.vault-button-disabled {
  background: #e0e0e0 !important;
  cursor: not-allowed !important;
  opacity: 0.7;
}

.vault-button-disabled::before {
  display: none;
}

.vault-button-text {
  color: white;
  position: relative;
  z-index: 2;
}

@keyframes shine {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}

/* 搜索框樣式 */
:deep(.v-text-field) {
  background: white;
  border-radius: 12px;
}

:deep(.v-text-field .v-field__outline__start) {
  border-radius: 12px 0 0 12px;
}

:deep(.v-text-field .v-field__outline__end) {
  border-radius: 0 12px 12px 0;
}

/* 工具欄樣式 */
:deep(.v-toolbar) {
  background: rgb(244, 167, 167) !important;
}

/* 自定義滾動條 */
.token-list::-webkit-scrollbar {
  width: 6px;
}

.token-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.token-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.token-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}

/* checkbox 樣式 */
:deep(.v-checkbox) {
  --v-theme-primary: rgb(244, 167, 167);
}

/* 文字顏色 */
.text-primary {
  color: rgb(244, 167, 167) !important;
}

/* 在樣式部分添加hover效果 */
.token-list-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.vault-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 182, 193, 0.4) !important;
}
</style> 