<template>
    <v-dialog :model-value="visible" max-width="600" scrollable @update:model-value="$emit('update:visible', $event)">
      <v-card class="withdraw-dialog">
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">提款</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="closeDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
  
        <div class="pa-4">
          <div v-if="loadingBalance" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            <div class="mt-4 text-subtitle-1">正在加載您的餘額...</div>
          </div>
  
          <div v-else class="balance-container">
            <h3 class="text-h5 mb-2">可提款餘額</h3>
            
            <div class="balance-card pa-4 mb-4">
              <div class="d-flex align-center">
                <v-avatar size="48" class="mr-4">
                  <v-img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" />
                </v-avatar>
                <div>
                  <div class="text-h4 font-weight-bold">{{ formatBalance(redeemableBalance) }}</div>
                  <div class="text-subtitle-1">USDC</div>
                </div>
              </div>
            </div>
  
            <v-card class="mb-4 pa-4">
              <div class="mb-4">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-subtitle-1">提款金額</div>
                  <v-btn 
                    density="compact" 
                    variant="text" 
                    color="primary"
                    @click="setMaxAmount" 
                    class="text-caption"
                  >
                    全部提款
                  </v-btn>
                </div>
                
                <div class="amount-display-container mb-2">
                  <div class="amount-display-value">{{ formattedAmount }} USDC</div>
                </div>
                
                <v-slider
                  v-model="sliderValue"
                  color="primary"
                  track-color="rgba(244, 167, 167, 0.2)"
                  :min="0"
                  :max="maxSliderValue"
                  :step="sliderStep"
                  :disabled="!hasBalance"
                  thumb-label="always"
                  @update:model-value="updateAmountFromSlider"
                >
                  <template v-slot:thumb-label>
                    {{ formatSliderLabel(sliderValue) }}
                  </template>
                </v-slider>
                
                <div class="slider-labels d-flex justify-space-between">
                  <span class="text-caption text-grey">0</span>
                  <span class="text-caption text-grey">{{ formatBalance(redeemableBalance) }}</span>
                </div>
                
                <v-text-field
                  v-model="amount"
                  type="number"
                  variant="outlined"
                  density="compact"
                  :rules="[amountRule]"
                  hide-details
                  :disabled="!hasBalance"
                  class="amount-input mt-2"
                  suffix="USDC"
                  @update:model-value="updateSliderFromAmount"
                ></v-text-field>
              </div>
  
              <div class="withdraw-details mt-4">
                <div class="detail-row">
                  <div class="detail-label">
                    <v-icon small color="primary" class="mr-1">mdi-cash-multiple</v-icon>
                    手續費
                  </div>
                  <div class="detail-value free-tag">免費</div>
                </div>
  
                <div class="detail-row">
                  <div class="detail-label">
                    <v-icon small color="primary" class="mr-1">mdi-gas-station</v-icon>
                    網絡費用 (預估)
                  </div>
                  <div class="detail-value">{{ networkFee }} ETH</div>
                </div>
  
                <div class="detail-row highlight">
                  <div class="detail-label">
                    <v-icon small color="primary" class="mr-1">mdi-chart-line</v-icon>
                    預計到賬
                  </div>
                  <div class="detail-value">{{ amountToReceive }} USDC</div>
                </div>
              </div>
            </v-card>
  
            <div v-if="error" class="error-message mb-4">
              {{ error }}
            </div>
  
            <v-btn
              block
              :loading="isProcessing"
              :disabled="!canWithdraw"
              color="primary"
              height="48"
              class="withdraw-button"
              @click="processWithdraw"
            >
              <span class="button-text">✨ 確認提款 ✨</span>
            </v-btn>
          </div>
  
          <div v-if="withdrawStatus === 'success'" class="success-container text-center pa-4">
            <v-icon color="success" size="64">mdi-check-circle</v-icon>
            <h3 class="text-h5 mt-4">提款成功！</h3>
            <p class="text-body-1 mt-2">您的 USDC 已提取。</p>
            <v-btn color="primary" class="mt-4" @click="closeDialog">完成</v-btn>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { useWalletStore } from '../store/wallet'
  import { useVaultStore } from '../store/vault'
  import { useMainStore } from '../store/main'
  
  const props = defineProps({
    visible: Boolean
  })
  
  const emit = defineEmits(['update:visible'])
  
  const walletStore = useWalletStore()
  const vaultStore = useVaultStore()
  const mainStore = useMainStore()
  
  const redeemableBalance = ref('0')
  const amount = ref('')
  const loadingBalance = ref(true)
  const error = ref('')
  const isProcessing = ref(false)
  const withdrawStatus = ref(null) // 'processing', 'success', 'error'
  const networkFee = ref('0.005')
  
  // 新增：滑塊相關變數
  const sliderValue = ref(0)
  const sliderStep = 0.01 // 滑塊的最小步長
  
  // 計算滑塊的最大值（依據餘額）
  const maxSliderValue = computed(() => {
    return Number(redeemableBalance.value) / 1_000_000 // 轉換為 USDC 單位
  })
  
  // 從滑塊數值更新輸入金額
  const updateAmountFromSlider = (val) => {
    amount.value = val.toString()
  }
  
  // 從輸入金額更新滑塊位置
  const updateSliderFromAmount = (val) => {
    const numVal = parseFloat(val)
    if (!isNaN(numVal) && numVal >= 0 && numVal <= maxSliderValue.value) {
      sliderValue.value = numVal
    }
  }
  
  // 格式化滑塊標籤顯示
  const formatSliderLabel = (val) => {
    return val.toFixed(2)
  }
  
  // 格式化用於顯示的金額
  const formattedAmount = computed(() => {
    if (!amount.value || isNaN(parseFloat(amount.value))) return '0.00'
    return parseFloat(amount.value).toFixed(2)
  })
  
  // 從餘額中加載可提款的數量
  const loadRedeemableBalance = async () => {
    loadingBalance.value = true
    try {
      const balance = await walletStore.getUserVaultWithdrawable()
      console.log("balance--", balance)
      redeemableBalance.value = balance.toString()
      
      // 重置滑塊值和金額（當重新載入餘額時）
      if (amount.value === '') {
        // 初始化滑塊值為 0
        sliderValue.value = 0
      } else {
        // 如果已有金額，則更新滑塊值
        updateSliderFromAmount(amount.value)
      }
    } catch (err) {
      console.error('加載可提款餘額失敗:', err)
      error.value = '無法加載可提款餘額。請稍後再試。'
      redeemableBalance.value = '0'
      sliderValue.value = 0
    } finally {
      loadingBalance.value = false
    }
  }
  
  // 格式化餘額顯示
  const formatBalance = (balanceInWei) => {
    const value = Number(balanceInWei) / 1_000_000 // USDC 有 6 位小數
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }
  
  // 設置最大金額
  const setMaxAmount = () => {
    const value = Number(redeemableBalance.value) / 1_000_000 // USDC 有 6 位小數
    amount.value = value.toString()
    sliderValue.value = value // 同時更新滑塊的值
  }
  
  // 檢查金額是否有效
  const amountRule = (value) => {
    if (!value) return '請輸入金額'
    
    const numValue = parseFloat(value)
    const maxValue = Number(redeemableBalance.value) / 1_000_000
    
    if (numValue <= 0) return '金額必須大於 0'
    if (numValue > maxValue) return `金額不能超過您的餘額 (${maxValue.toFixed(6)} USDC)`
    
    return true
  }
  
  // 計算用戶將收到的金額
  const amountToReceive = computed(() => {
    if (!amount.value || isNaN(parseFloat(amount.value))) return '0.00'
    
    const numAmount = parseFloat(amount.value)
    return numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  })
  
  // 檢查是否有餘額
  const hasBalance = computed(() => {
    return redeemableBalance.value && BigInt(redeemableBalance.value) > 0
  })
  
  // 檢查是否可以提款
  const canWithdraw = computed(() => {
    return hasBalance.value && amount.value && parseFloat(amount.value) > 0 && !isProcessing.value
  })
  
  // 處理提款
  const processWithdraw = async () => {
    if (!canWithdraw.value) return
    
    isProcessing.value = true
    withdrawStatus.value = 'processing'
    error.value = ''
    
    try {
      // 將輸入的金額轉換為 USDC 單位 (6 位小數)
      const amountInUsdcUnits = BigInt(Math.floor(parseFloat(amount.value) * 1_000_000))
      
      // 呼叫提款函數
      const result = await walletStore.sendRedeem(amountInUsdcUnits)
      
      if (result.success) {
        withdrawStatus.value = 'success'
        // 清除金額輸入
        amount.value = ''
        // 重新加載餘額
        await loadRedeemableBalance()
      } else {
        error.value = result.error || '提款失敗。請稍後再試。'
        withdrawStatus.value = 'error'
      }
    } catch (err) {
      console.error('提款過程中出錯:', err)
      error.value = err.message || '提款過程中出錯。請稍後再試。'
      withdrawStatus.value = 'error'
    } finally {
      isProcessing.value = false
    }
  }
  
  // 關閉對話框
  const closeDialog = () => {
    emit('update:visible', false)
    // 重置狀態
    withdrawStatus.value = null
    error.value = ''
    amount.value = ''
    sliderValue.value = 0 // 重置滑塊值
  }
  
  // 監聽對話框可見性
  watch(() => props.visible, (newVal) => {
    if (newVal) {
      // 當對話框打開時加載餘額
      loadRedeemableBalance()
    }
  })
  
  // 初始加載
  onMounted(() => {
    if (props.visible) {
      loadRedeemableBalance()
    }
  })
  </script>
  
  <style scoped>
  .withdraw-dialog {
    background: white;
    border-radius: 16px;
    overflow: hidden;
  }
  
  :deep(.v-toolbar) {
    background: rgb(244, 167, 167) !important;
  }
  
  .balance-container {
    display: flex;
    flex-direction: column;
  }
  
  .balance-card {
    background: linear-gradient(135deg, rgba(244, 167, 167, 0.05), rgba(244, 167, 167, 0.15));
    border-radius: 12px;
    border: 1px solid rgba(244, 167, 167, 0.2);
  }
  
  .amount-input :deep(.v-field__field) {
    font-size: 1.2rem;
  }
  
  .withdraw-details {
    background: rgba(244, 167, 167, 0.03);
    border-radius: 8px;
    padding: 16px;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(244, 167, 167, 0.1);
  }
  
  .detail-row:last-child {
    border-bottom: none;
  }
  
  .detail-label {
    display: flex;
    align-items: center;
    color: #7f8c8d;
    font-size: 0.9rem;
  }
  
  .detail-value {
    font-weight: 500;
    color: #2c3e50;
  }
  
  .free-tag {
    color: #4caf50;
    font-weight: 600;
  }
  
  .highlight {
    background: rgba(244, 167, 167, 0.1);
    padding: 12px;
    border-radius: 8px;
    margin: 8px 0;
  }
  
  .highlight .detail-label,
  .highlight .detail-value {
    color: rgb(244, 167, 167);
    font-weight: 600;
  }
  
  .withdraw-button {
    background: linear-gradient(135deg, #FFB6C1, #FF69B4) !important;
    color: white !important;
    font-size: 1.1rem !important;
    font-weight: 600 !important;
    border-radius: 24px !important;
    position: relative;
    overflow: hidden;
  }
  
  .withdraw-button::before {
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
  
  .button-text {
    position: relative;
    z-index: 1;
  }
  
  .amount-display-container {
    text-align: center;
    padding: 12px;
    background: rgba(244, 167, 167, 0.1);
    border-radius: 12px;
  }
  
  .amount-display-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: rgb(244, 167, 167);
  }
  
  :deep(.v-slider-thumb__label) {
    background-color: rgb(244, 167, 167) !important;
  }
  
  :deep(.v-slider-thumb) {
    color: rgb(244, 167, 167) !important;
  }
  
  :deep(.v-slider-track__fill) {
    background-color: rgb(244, 167, 167) !important;
  }
  
  .slider-labels {
    margin-top: -8px;
    padding: 0 12px;
  }
  
  .error-message {
    color: #f44336;
    background: rgba(244, 67, 54, 0.1);
    padding: 12px;
    border-radius: 8px;
    font-size: 0.9rem;
  }
  
  .success-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 10;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
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
  