<template>
  <div>
    <v-dialog v-model="dialogModel" max-width="600" scrollable>
      <v-card class="allowance-dialog">
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">Deposit Preview</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="$emit('update:modelValue', false)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <!-- 代幣交換預覽 -->
        <div class="preview-container pa-4">
          <div class="token-preview-card">
            <div class="token-info">
              <v-avatar size="40" class="token-icon">
                <v-img :src="fromToken.icon" @error="handleImageError" />
              </v-avatar>
              <div class="token-details">
                <span class="token-amount">{{ fromAmount }} {{ fromToken.symbol }}</span>
                <span class="token-value">≈ ${{ fromUsdValue }}</span>
              </div>
            </div>
            <v-icon class="arrow-icon" color="primary">mdi-arrow-right</v-icon>
            <div class="token-info">
              <v-avatar size="40" class="token-icon">
                <v-img :src="toToken.icon" @error="handleImageError" />
              </v-avatar>
              <div class="token-details">
                <span class="token-amount">{{ toAmount }} {{ toToken.symbol }}</span>
                <span class="token-value">≈ ${{ toUsdValue }} <span class="rate-change">({{ priceImpact }}%)</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 交易詳情 -->
        <v-card-text class="details-section pa-4">
          <div class="detail-row">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-currency-usd</v-icon>
              Price
            </div>
            <div class="detail-value">1 {{ fromToken.symbol }} = {{ exchangeRate }} {{ toToken.symbol }}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-cash-multiple</v-icon>
              Fee
            </div>
            <div class="detail-value free-tag">FREE</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-gas-station</v-icon>
              Network costs (est.)
            </div>
            <div class="detail-value">{{ networkCost }} {{ toToken.symbol }}</div>
          </div>

          <div class="detail-row highlight">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-piggy-bank</v-icon>
              Expected to receive
            </div>
            <div class="detail-value">{{ expectedReceive }} {{ toToken.symbol }}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-clock-outline</v-icon>
              Transaction expiration
            </div>
            <div class="detail-value">{{ expirationTime }} minutes</div>
          </div>
        </v-card-text>

        <!-- 確認按鈕 -->
        <div class="confirm-button-container pa-4">
          <v-btn
            block
            class="confirm-button"
            :loading="isConfirming"
            @click="handleConfirmDeposit"
          >
            <span class="button-text">✨ 確認存入金庫 ✨</span>
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <TransactionStatus
      :visible="showTransactionStatus"
      :status="'交易處理中...'"
      :message="'這將花費一點時間，請稍候。'"
      @update:visible="(val) => showTransactionStatus = val"
      @done="openFinish"
    />

    <Finish v-if="showFinish" @close="showFinish = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TransactionStatus from './TransactionStatus.vue'
import Finish from './Finish.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 模擬數據
const fromToken = ref({
  symbol: 'ETH',
  icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
})

const toToken = ref({
  symbol: 'USDC',
  icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
})

const fromAmount = ref('0.002')
const toAmount = ref('7.3043')
const fromUsdValue = ref('7')
const toUsdValue = ref('7.3')
const priceImpact = ref('0.07')
const exchangeRate = ref('3,652.1543')
const networkCost = ref('0.007105')
const expectedReceive = ref('7.2972')
const expirationTime = ref('30')
const showTransactionStatus = ref(false)
const showFinish = ref(false)
const isConfirming = ref(false)

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40'
}

async function handleConfirmDeposit() {
  try {
    isConfirming.value = true
    // 關閉當前對話框
    dialogModel.value = false
    // 等待對話框關閉動畫
    await new Promise(resolve => setTimeout(resolve, 300))
    // 顯示交易狀態
    showTransactionStatus.value = true
    
    // 模擬交易過程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
  } catch (error) {
    console.error('Deposit failed:', error)
  } finally {
    isConfirming.value = false
  }
}

const openFinish = () => {
  console.log('openFinish called, setting showFinish to true')
  showFinish.value = true
  console.log('showFinish value:', showFinish.value)
}
</script>

<style scoped>
.allowance-dialog {
  background: white;
  border-radius: 16px;
  overflow: hidden;
}

:deep(.v-toolbar) {
  background: rgb(244, 167, 167) !important;
}

.preview-container {
  background: rgba(244, 167, 167, 0.05);
  border-radius: 12px;
  margin: 16px;
}

.token-preview-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(244, 167, 167, 0.1);
}

.token-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.token-icon {
  border: 2px solid rgba(244, 167, 167, 0.2);
  padding: 2px;
}

.token-details {
  display: flex;
  flex-direction: column;
}

.token-amount {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
}

.token-value {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.arrow-icon {
  color: rgb(244, 167, 167) !important;
  font-size: 24px;
}

.details-section {
  background: white;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
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

.rate-change {
  color: #4caf50;
  font-size: 0.8rem;
}

.highlight {
  background: rgba(244, 167, 167, 0.05);
  padding: 12px;
  border-radius: 8px;
  margin: 8px 0;
}

.highlight .detail-label,
.highlight .detail-value {
  color: rgb(244, 167, 167);
  font-weight: 600;
}

.confirm-button {
  background: linear-gradient(135deg, #FFB6C1, #FF69B4) !important;
  color: white !important;
  height: 48px !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  border-radius: 24px !important;
  position: relative;
  overflow: hidden;
}

.confirm-button::before {
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

@keyframes shine {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}
</style>
