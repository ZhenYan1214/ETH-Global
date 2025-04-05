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
        <v-card-text v-else class="pa-0">
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
                <div class="d-flex flex-column align-end">
                  <span class="text-body-2">{{ getFormattedBalance(token) }}</span>
                  <span v-if="token.price" class="text-caption text-grey">${{ getFormattedPrice(token) }}</span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>

        <!-- 總資產價值 -->
        <v-divider></v-divider>
        <v-card-text class="pa-4">
          <div class="d-flex justify-space-between align-center">
            <span class="text-subtitle-1">總價值:</span>
            <span class="text-h6 font-weight-bold text-primary">${{ getTotalValue }}</span>
          </div>
        </v-card-text>

        <!-- 金庫按鈕 -->
        <div class="vault-button-container pa-4 pt-0">
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
        </div>
      </v-card>
    </v-dialog>

    <!-- Allowance 對話框 -->
    <Allowance 
      v-model="showAllowanceDialog"
      @showTransactionStatus="handleShowTransactionStatus"
    />

    <!-- TransactionStatus 對話框 -->
    <v-dialog 
      v-model="showTransactionStatus" 
      max-width="400"
      :persistent="transactionStatus === 'pending'"
      @click:outside="handleTransactionDialogClose"
    >
      <TransactionStatus
        :status="transactionStatus"
        :error-message="errorMessage"
        @retry="handleRetry"
        @close="handleTransactionClose"
      />
    </v-dialog>

    <Finish v-if="showFinish" @close="showFinish = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTokenStore } from '../store/tokens'
import { useWalletStore } from '../store/wallet'
import { useRouter } from 'vue-router'
import Allowance from './Allowance.vue'
import TransactionStatus from './TransactionStatus.vue'
import Finish from './Finish.vue'
import { useMainStore } from '../store/main'

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
const showTransactionStatus = ref(false)
const showFinish = ref(false)
const transactionStatus = ref('pending')
const errorMessage = ref('')

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
  if (!tokenStore.isTokenSelected(address) && token) {
    // If not yet selected, select it with maximum amount
    tokenStore.toggleFromToken(address)
    tokenStore.updateFromTokenAmount(address, token.balance)
  } else {
    // If already selected, deselect it
    tokenStore.toggleFromToken(address)
  }
  
  // 檢查選擇狀態並更新按鈕狀態
  console.log('Selected tokens:', tokenStore.selectedFromTokens.length)
}

function goToVault() {
  // 檢查是否有選擇代幣
  if (!hasSelectedTokens.value) {
    // 如果沒有選擇代幣，顯示提示訊息
    const mainStore = useMainStore()
    mainStore.showNotification('請至少選擇一個代幣', 'warning')
    return
  }
  
  emit('update:modelValue', false)  // 先關閉 4626list 對話框
  setTimeout(() => {
    showAllowanceDialog.value = true  // 然後顯示 Allowance 對話框
  }, 300)
}

async function handleShowTransactionStatus() {
  showAllowanceDialog.value = false
  await new Promise(resolve => setTimeout(resolve, 300))
  
  showTransactionStatus.value = true
  transactionStatus.value = 'pending'
  
  try {
    // 模擬交易過程
    await new Promise(resolve => setTimeout(resolve, 2000))
    transactionStatus.value = 'success'
  } catch (error) {
    transactionStatus.value = 'error'
    errorMessage.value = error.message || '交易失敗'
  }
}

async function handleRetry() {
  transactionStatus.value = 'pending'
  try {
    // 模擬交易過程
    await new Promise(resolve => setTimeout(resolve, 2000))
    transactionStatus.value = 'success'
  } catch (error) {
    transactionStatus.value = 'error'
    errorMessage.value = error.message || '交易失敗'
  }
}

function handleTransactionDialogClose() {
  if (transactionStatus.value !== 'pending') {
    showTransactionStatus.value = false
  }
}

function handleTransactionClose() {
  showTransactionStatus.value = false
}

const openFinish = () => {
  showFinish.value = true
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
}

.token-list {
  max-height: 400px;
  overflow-y: auto;
  background: white;
}

.token-list-item {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 4px 8px;
  background: white;
}

.token-list-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.selected-token {
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
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

/* 分隔線樣式 */
:deep(.v-divider) {
  border-color: rgba(0, 0, 0, 0.1);
}

/* 總價值區域樣式 */
.total-value {
  color: rgb(244, 167, 167);
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

/* 文字顏色調整 */
:deep(.v-list-item-title) {
  color: rgba(0, 0, 0, 0.87);
}

:deep(.v-list-item-subtitle) {
  color: rgba(0, 0, 0, 0.6);
}

/* checkbox 樣式 */
:deep(.v-checkbox) {
  --v-theme-primary: rgb(244, 167, 167);
}

/* 搜索框內部樣式 */
:deep(.v-field__input) {
  color: rgba(0, 0, 0, 0.87) !important;
}

:deep(.v-field__outline) {
  color: rgba(0, 0, 0, 0.12) !important;
}

/* 價格文字顏色 */
.text-primary {
  color: rgb(244, 167, 167) !important;
}

/* 金庫按鈕容器 */
.vault-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 金庫按鈕樣式 */
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
}

.vault-button-disabled {
  background: #e0e0e0 !important;
  cursor: not-allowed !important;
  opacity: 0.7;
}

.vault-button-disabled::before {
  display: none;
}

.vault-button-disabled:hover {
  transform: none !important;
  box-shadow: none !important;
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
}

.vault-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 182, 193, 0.4) !important;
}

.vault-button-text {
  color: white;
  position: relative;
  z-index: 1;
}

@keyframes shine {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}
</style> 