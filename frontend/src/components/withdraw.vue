<template>
    <v-dialog :model-value="visible" max-width="600" scrollable @update:model-value="$emit('update:visible', $event)">
      <v-card class="withdraw-dialog">
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">Withdraw Preview</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="$emit('update:visible', false)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
  
        <div class="preview-container pa-4">
          <div class="token-preview-card">
            <div class="token-info">
              <v-avatar size="40" class="token-icon">
                <v-img :src="tokenLogo" @error="handleImageError" />
              </v-avatar>
              <div class="token-details">
                <span class="token-amount">{{ amount }} {{ tokenSymbol }}</span>
                <span class="token-value">≈ ${{ usdValue }}</span>
              </div>
            </div>
            <v-icon class="arrow-icon" color="primary">mdi-arrow-right</v-icon>
            <div class="token-info">
              <v-avatar size="40" class="token-icon">
                <v-img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" />
              </v-avatar>
              <div class="token-details">
                <span class="token-amount">{{ expectedETH }} ETH</span>
                <span class="token-value">≈ ${{ ethUSDValue }}</span>
              </div>
            </div>
          </div>
        </div>
  
        <v-card-text class="details-section pa-4">
          <div class="detail-row">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-currency-usd</v-icon>
              Price
            </div>
            <div class="detail-value">1 {{ tokenSymbol }} = {{ ethRate }} ETH</div>
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
              Network cost (est.)
            </div>
            <div class="detail-value">{{ networkCost }} ETH</div>
          </div>
  
          <div class="detail-row highlight">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-piggy-bank</v-icon>
              Expected to receive
            </div>
            <div class="detail-value">{{ expectedETH }} ETH</div>
          </div>
  
          <div class="detail-row">
            <div class="detail-label">
              <v-icon small color="primary" class="mr-1">mdi-clock-outline</v-icon>
              Transaction expiration
            </div>
            <div class="detail-value">30 minutes</div>
          </div>
        </v-card-text>
  
        <div class="confirm-button-container pa-4">
          <v-btn
            block
            class="confirm-button"
            :disabled="!token"
            @click="$emit('confirm')"
          >
            <span class="button-text">✨ 確認提款 ✨</span>
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { useTokenStore } from '../store/tokens'
  
  const props = defineProps({
    visible: Boolean,
    token: Object,
    amount: {
      type: Number,
      default: 0
    }
  })
  
  const emit = defineEmits(['confirm', 'update:visible'])
  
  const tokenStore = useTokenStore()
  
  const ethPrice = 3600
  const networkCost = 0.007105
  
  const tokenSymbol = computed(() => {
    return props.token?.symbol || 'USDC'
  })
  
  const tokenLogo = computed(() => {
    return props.token?.logoURI || 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  })
  
  const tokenPrice = computed(() => {
    return props.token?.price || 1
  })
  
  const usdValue = computed(() => {
    return (props.amount * tokenPrice.value).toFixed(2)
  })
  
  const expectedETH = computed(() => {
    const eth = props.amount * tokenPrice.value / ethPrice - networkCost
    return eth > 0 ? eth.toFixed(4) : '0.0000'
  })
  
  const ethUSDValue = computed(() => {
    return (expectedETH.value * ethPrice).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    })
  })
  
  const ethRate = computed(() => {
    return (tokenPrice.value / ethPrice).toFixed(6)
  })
  
  function handleImageError(e) {
    e.target.src = 'https://via.placeholder.com/40'
  }
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
  