<template>
    <v-dialog :model-value="visible" max-width="600" scrollable @update:model-value="$emit('update:visible', $event)">
      <v-card class="withdraw-dialog">
        <v-toolbar color="primary" density="compact">
          <v-toolbar-title class="text-white">Withdraw</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="closeDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
  
        <div class="pa-4">
          <div v-if="loadingBalance" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            <div class="mt-4 text-subtitle-1">Loading your balance...</div>
          </div>
  
          <div v-else class="balance-container">
            <h3 class="text-h5 mb-2">Available Balance</h3>
            
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
                  <div class="text-subtitle-1">Withdrawal Amount</div>
                  <v-btn 
                    density="compact" 
                    variant="text" 
                    color="primary"
                    @click="setMaxAmount" 
                    class="text-caption"
                  >
                    Withdraw All
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
                    Fee
                  </div>
                  <div class="detail-value interest-tag">Deducted from Interest</div>
                </div>
  
                <div class="detail-row">
                  <div class="detail-label">
                    <v-icon small color="primary" class="mr-1">mdi-gas-station</v-icon>
                    Network Cost
                  </div>
                  <div class="detail-value sponsored-tag">Sponsored</div>
                </div>
  
                <div class="detail-row highlight">
                  <div class="detail-label">
                    <v-icon small color="primary" class="mr-1">mdi-chart-line</v-icon>
                    You Will Receive
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
              <span class="button-text">✨ Confirm Withdrawal ✨</span>
            </v-btn>
          </div>
  
          <div v-if="withdrawStatus === 'success'" class="success-container text-center pa-4">
            <v-icon color="success" size="64">mdi-check-circle</v-icon>
            <h3 class="text-h5 mt-4">Withdrawal Successful!</h3>
            <p class="text-body-1 mt-2">Your USDC has been withdrawn.</p>
            <v-btn color="primary" class="mt-4" @click="closeDialog">Done</v-btn>
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
  
  const isFullWithdrawal = ref(false) // Mark if it's a full withdrawal
  const redeemableBalance = ref('0')
  const amount = ref('')
  const loadingBalance = ref(true)
  const error = ref('')
  const isProcessing = ref(false)
  const withdrawStatus = ref(null) // 'processing', 'success', 'error'
  const networkFee = ref('0.005000')
  
  // New: slider-related variables
  const sliderValue = ref(0)
  const sliderStep = 0.000001 // Minimum step length for the slider, supports 6 decimal places
  
  // Calculate slider maximum value (based on balance)
  const maxSliderValue = computed(() => {
    return Number(redeemableBalance.value) / 1_000_000 // Convert to USDC units
  })
  
  // Update amount from slider
  const updateAmountFromSlider = (val) => {
    amount.value = val.toString()
  }
  
  // Update slider from amount
  const updateSliderFromAmount = (val) => {
    const numVal = parseFloat(val)
    if (!isNaN(numVal) && numVal >= 0 && numVal <= maxSliderValue.value) {
      sliderValue.value = numVal
    }
  }
  
  // Format slider label display
  const formatSliderLabel = (val) => {
    return val.toFixed(6)
  }
  
  // Format displayed amount
  const formattedAmount = computed(() => {
    if (!amount.value || isNaN(parseFloat(amount.value))) return '0.000000'
    return parseFloat(amount.value).toFixed(6)
  })
  
  // Load available withdrawal balance
  const loadRedeemableBalance = async () => {
    loadingBalance.value = true
    try {
      // Force refresh to ensure getting the latest data from the blockchain
      await walletStore.fetchBalance() // Refresh wallet balance first
      const balance = await walletStore.getUserVaultWithdrawable()
      console.log("Available withdrawal balance:", balance.toString())
      redeemableBalance.value = balance.toString()
      
      // Reset slider value and amount (when reloading balance)
      if (amount.value === '') {
        // Initialize slider value to 0
        sliderValue.value = 0
      } else {
        // If amount already exists, update slider value
        updateSliderFromAmount(amount.value)
      }
    } catch (err) {
      console.error('Failed to load withdrawal balance:', err)
      error.value = 'Unable to load withdrawal balance. Please try again later.'
      redeemableBalance.value = '0'
      sliderValue.value = 0
    } finally {
      loadingBalance.value = false
    }
  }
  
  // Format balance display
  const formatBalance = (balanceInWei) => {
    const value = Number(balanceInWei) / 1_000_000 // USDC has 6 decimal places
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    })
  }
  
  // Set maximum amount - fixed to use exact values to avoid rounding issues
  const setMaxAmount = () => {
    // Mark this as a full withdrawal
    isFullWithdrawal.value = true
    
    // Use string format directly to avoid floating point precision issues
    const exactValue = Number(redeemableBalance.value) / 1_000_000
    amount.value = exactValue.toString()
    
    // Set slider to maximum value
    sliderValue.value = maxSliderValue.value
  }
  
  // Check amount validity
  const amountRule = (value) => {
    if (!value) return 'Please enter an amount'
    
    const numValue = parseFloat(value)
    const maxValue = Number(redeemableBalance.value) / 1_000_000
    
    if (numValue <= 0) return 'Amount must be greater than 0'
    if (numValue > maxValue) {
      // Show balance in 6 decimal places
      const formattedMax = maxValue.toLocaleString(undefined, {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      })
      return `Amount cannot exceed your balance (${formattedMax} USDC)`
    }
    
    return true
  }
  
  // Calculate amount user will receive
  const amountToReceive = computed(() => {
    if (!amount.value || isNaN(parseFloat(amount.value))) return '0.000000'
    
    const numAmount = parseFloat(amount.value)
    return numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    })
  })
  
  // Check if balance exists
  const hasBalance = computed(() => {
    return redeemableBalance.value && BigInt(redeemableBalance.value) > 0
  })
  
  // Check if withdrawal is possible
  const canWithdraw = computed(() => {
    return hasBalance.value && amount.value && parseFloat(amount.value) > 0 && !isProcessing.value
  })
  
  // Process withdrawal
  const processWithdraw = async () => {
    if (!canWithdraw.value) return
    
    isProcessing.value = true
    withdrawStatus.value = 'processing'
    error.value = ''
    
    try {
      let amountInUsdcUnits;
      
      // If it's a full withdrawal, use the original balance directly, avoiding rounding issues
      if (isFullWithdrawal.value && redeemableBalance.value !== '0') {
        amountInUsdcUnits = BigInt(redeemableBalance.value);
        console.log("Using full balance for withdrawal:", amountInUsdcUnits.toString());
      } else {
        // Otherwise use the user-entered amount
        amountInUsdcUnits = BigInt(Math.floor(parseFloat(amount.value) * 1_000_000));
        console.log("Using entered amount for withdrawal:", amountInUsdcUnits.toString());
      }
      
      // Call withdrawal function
      const result = await walletStore.sendRedeem(amountInUsdcUnits)
      
      if (result.success) {
        withdrawStatus.value = 'success'
        // Clear amount input and full withdrawal flag
        amount.value = ''
        isFullWithdrawal.value = false
        
        // Wait a few seconds before reloading balance to ensure blockchain data is updated
        setTimeout(async () => {
          await loadRedeemableBalance()
        }, 2000)
      } else {
        error.value = result.error || 'Withdrawal failed. Please try again later.'
        withdrawStatus.value = 'error'
      }
    } catch (err) {
      console.error('Error during withdrawal:', err)
      error.value = err.message || 'Error during withdrawal. Please try again later.'
      withdrawStatus.value = 'error'
    } finally {
      isProcessing.value = false
      isFullWithdrawal.value = false
    }
  }
  
  // Close dialog
  const closeDialog = () => {
    emit('update:visible', false)
    // Reset state
    withdrawStatus.value = null
    error.value = ''
    amount.value = ''
    sliderValue.value = 0 // Reset slider value
    isFullWithdrawal.value = false // Reset full withdrawal flag
  }
  
  // Monitor dialog visibility
  watch(() => props.visible, (newVal) => {
    if (newVal) {
      // Load balance when dialog opens
      loadRedeemableBalance()
    }
  })
  
  // Initial loading
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
  
  .interest-tag {
    color: #7e57c2;
    font-weight: 600;
  }
  
  .sponsored-tag {
    color: #2196f3;
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
  