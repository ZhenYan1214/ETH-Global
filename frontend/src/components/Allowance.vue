<template>
  <div>
    <v-dialog v-model="dialogModel" max-width="600" scrollable content-class="allowance-dialog-wrapper">
      <v-card class="allowance-dialog rounded-xl">
        <!-- Top Toolbar -->
        <v-toolbar color="primary" density="compact" class="rounded-t-xl">
          <v-toolbar-title class="text-white font-weight-bold">Deposit Preview</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="handleClose">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <!-- Loading, Error and Content States -->
        <div v-if="isLoading" class="loading-container pa-8 d-flex flex-column align-center justify-center">
          <v-progress-circular indeterminate color="primary" size="64" width="6"></v-progress-circular>
          <div class="mt-4 text-body-1 text-center">Fetching latest data...</div>
        </div>
        
        <div v-else-if="error" class="error-container pa-6 d-flex flex-column align-center justify-center">
          <v-avatar color="error" class="error-icon mb-4">
            <v-icon size="36" color="white">mdi-alert-circle</v-icon>
          </v-avatar>
          <h3 class="text-h6 text-center mb-2">Error Processing Request</h3>
          <p class="text-body-2 text-center mb-4">{{ error }}</p>
          <v-btn color="primary" prepend-icon="mdi-refresh" variant="elevated" class="px-6" @click="retry">Retry</v-btn>
        </div>
          
        <template v-else>
          <!-- Main Content -->
          <v-card-text class="pa-0">
            <!-- Token Exchange Summary Card -->
            <div class="summary-card mx-4 mt-4 mb-2 pa-4">
              <div class="text-subtitle-1 font-weight-medium mb-2">Transaction Summary</div>
              
              <!-- Multiple Token Input Display -->
              <div v-if="multipleTokens" class="multi-tokens-summary">
                <div class="d-flex justify-space-between align-center mb-2">
                  <div class="text-body-2 text-medium-emphasis">Selected Tokens ({{ fromTokens.length }})</div>
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
              
              <!-- Single Token Input Display -->
              <div v-else class="single-token-summary d-flex justify-space-between align-center mb-3">
                <div class="d-flex align-center">
                  <v-avatar size="28" class="mr-2">
                    <v-img :src="fromToken.icon" @error="handleImageError" />
                  </v-avatar>
                  <span class="text-body-1">{{ fromToken.amount }} {{ fromToken.symbol }}</span>
                </div>
                <span class="text-body-2 font-weight-medium">${{ fromUsdValue }}</span>
              </div>
              
              <!-- Conversion Indicator -->
              <div class="conversion-line py-2 d-flex align-center">
                <v-divider></v-divider>
                <v-avatar class="mx-2" color="primary" size="28">
                  <v-icon color="white" size="small">mdi-swap-vertical</v-icon>
                </v-avatar>
                <v-divider></v-divider>
              </div>
              
              <!-- Output Token Summary -->
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
            
            <!-- Transaction Details -->
            <div class="details-card mx-4 mt-3 mb-4 pa-4">
              <div class="text-subtitle-1 font-weight-medium mb-3">Details</div>
              <div class="details-grid">
                <div class="detail-row py-2">
                  <div class="detail-label">
                    <v-icon size="small" color="primary" class="mr-1">mdi-cash-multiple</v-icon>
                    <span>Fee</span>
                  </div>
                  <div class="detail-value free-tag">Deducted from interest</div>
                </div>

                <div class="detail-row py-2">
                  <div class="detail-label">
                    <v-icon size="small" color="primary" class="mr-1">mdi-gas-station</v-icon>
                    <span>Network Fee (Est.)</span>
                  </div>
                  <div class="detail-value sponsored-tag">Sponsored</div>
                </div>

                <div class="detail-row py-2">
                  <div class="detail-label">
                    <v-icon size="small" color="primary" class="mr-1">mdi-clock-outline</v-icon>
                    <span>Expiration Time</span>
                  </div>
                  <div class="detail-value">{{ expirationTime }} minutes</div>
                </div>
              </div>
            </div>
          </v-card-text>

          <!-- Confirm Button Area -->
          <v-card-actions class="pa-4 pt-0">
            <v-btn
              block
              size="large"
              class="confirm-button"
              :loading="isConfirming"
              :disabled="isConfirming"
              @click="handleConfirmDeposit"
            >
              <span class="button-text">Confirm Deposit</span>
            </v-btn>
          </v-card-actions>
          
          <!-- Security Note -->
          <div class="security-note pa-4 pt-0 d-flex align-center">
            <v-icon size="small" color="primary" class="mr-2">mdi-shield-check</v-icon>
            <span class="text-caption">All transactions are verified and funds are secured</span>
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

// Local state
const isLoading = ref(false)
const isConfirming = ref(false)
const error = ref(null)
const depositPreview = ref(null)
const showTransactionStatus = ref(false)
const showFinish = ref(false)
const transactionStatus = ref('pending')
const transactionMessage = ref('Processing transaction...')
const transactionHash = ref('')

// Token info
const toToken = ref({
  symbol: 'USDC',
  icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  price: 1
})

// Calculated properties
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Determine if multiple tokens are selected
const multipleTokens = computed(() => {
  return tokenStore.selectedFromTokens && tokenStore.selectedFromTokens.length > 1
})

// From token list (multiple or single)
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

// Single input token
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

// Total input value (USD)
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

// Get value from preview data
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
  return 'FREE'  // Can be adjusted based on backend return data
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

// Watch dialog box display state
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    // Get data
    fetchDepositPreview()
  }
})

// Methods
async function fetchDepositPreview() {
  isLoading.value = true
  error.value = null
  
  console.log('Allowance: Start fetching deposit preview')
  console.log('Multiple tokens mode?', multipleTokens.value)
  
  if (multipleTokens.value) {
    console.log('Selected multiple tokens:', tokenStore.selectedFromTokens)
  } else {
    console.log('Selected single token:', tokenStore.selectedFromToken)
  }
  
  const syncResult = tokenStore.syncTokenSelectionState()
  console.log('Token selection sync result:', syncResult)
  
  try {
    if (!walletStore.isConnected) {
      throw new Error('Please connect wallet first')
    }
    
    let tokens = []
    
    if (multipleTokens.value) {
      tokens = tokenStore.selectedFromTokens
        .filter(t => t && t.amount && parseFloat(t.amount) > 0)
        .map(t => ({
          address: t.address,
          amount: t.amount
        }))
    } else if (tokenStore.selectedFromToken) {
      tokens = [{
        address: tokenStore.selectedFromToken.address,
        amount: tokenStore.fromAmount
      }]
    }
    
    console.log('Tokens prepared for preview:', tokens)
    
    if (tokens.length === 0 || !tokens[0]?.address) {
      throw new Error('No tokens selected or amount is 0')
    }
    
    try {
      console.log('Calling vaultStore.previewDeposit')
      const preview = await vaultStore.previewDeposit(tokens)
      if (!preview) {
        throw new Error('Failed to get deposit preview')
      }
      
      console.log('Preview fetched successfully:', preview)
      depositPreview.value = preview
    } catch (previewError) {
      console.error('Failed to get deposit preview:', previewError)
      
      if (previewError.message.includes('Select tokens first')) {
        throw new Error('Please select tokens first')
      } else if (previewError.message.includes('Enter token amount')) {
        throw new Error('Please enter token amount')
      } else {
        throw previewError
      }
    }
  } catch (err) {
    console.error('Failed to get deposit preview:', err)
    error.value = err.message || 'Failed to get deposit preview'
    mainStore.showNotification(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

function retry() {
  // Clear previous error
  error.value = null
  
  // Try again to get preview
  fetchDepositPreview()
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40'
}

function handleClose() {
  dialogModel.value = false
  vaultStore.resetDepositState()
  
  const shouldClearTokens = window.confirm('Clear selected tokens?')
  if (shouldClearTokens) {
    tokenStore.clearSelectedFromTokens()
    tokenStore.selectedFromToken = null
    tokenStore.fromAmount = ''
    console.log('Token selection cleared')
  }
}

async function handleConfirmDeposit() {
  try {
    if (!confirm('Confirm deposit?')) {
      return
    }
    
    dialogModel.value = false
    await new Promise(resolve => setTimeout(resolve, 300))
    
    try {
      console.log('[Allowance] Emitting show transaction status')
      emit('showTransactionStatus')
    } catch (emitError) {
      console.error('[Allowance] Error emitting transaction status:', emitError)
    }
    
    if (!vaultStore.depositPreview) {
      throw new Error('No deposit preview data')
    }
    
    let tokens = []
    
    if (multipleTokens.value) {
      tokens = tokenStore.selectedFromTokens
        .filter(t => t && t.amount && parseFloat(t.amount) > 0)
        .map(t => ({
          address: t.address,
          amount: t.amount
        }))
    } else if (tokenStore.selectedFromToken) {
      tokens = [{
        address: tokenStore.selectedFromToken.address,
        amount: tokenStore.fromAmount
      }]
    }
    
    console.log('[Allowance] Executing deposit, tokens:', tokens)
    try {
      await vaultStore.executeDeposit(tokens)
    } catch (depositError) {
      console.error('[Allowance] Error executing deposit:', depositError)
    }
  } catch (error) {
    console.error('[Allowance] Error confirming deposit:', error)
    mainStore.showNotification('Deposit confirmation failed: ' + (error.message || 'Unknown error'), 'error')
  }
}

function openFinish() {
  showFinish.value = true
}

// Helper function to format numbers
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
  // Reset state
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

/* Mobile responsive styles */
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
