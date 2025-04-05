<template>
  <v-dialog v-model="dialogVisible" max-width="520" persistent>
    <!-- Step 1: Select tokens -->
    <v-card v-if="currentStep === 1" class="deposit-dialog">
      <v-toolbar color="primary" dark class="dialog-header">
        <v-toolbar-title class="text-h6 font-weight-bold">Deposit to Vault</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="close" variant="text">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      
      <v-card-text class="pa-5">
        <p class="text-body-1 mb-5 text-medium-emphasis">Select tokens to deposit to your Piggy Vault</p>
        
        <div v-if="isLoading" class="d-flex justify-center align-center py-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>
        
        <div v-else-if="availableTokens.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-wallet-outline</v-icon>
          <p class="text-body-1 text-medium-emphasis">No tokens found in your wallet</p>
          <v-btn color="primary" variant="outlined" class="mt-4" @click="close">
            Close
          </v-btn>
        </div>
        
        <div v-else class="token-list">
          <v-card v-for="token in availableTokens" :key="token.address" 
            class="token-item mb-4" 
            :class="{ 'selected': isTokenSelected(token.address) }"
            variant="outlined"
            @click="toggleTokenSelection(token.address)">
            <div class="d-flex align-center pa-4">
              <v-avatar size="40" class="mr-4 token-avatar">
                <div class="token-icon-container">
                  <v-icon v-if="!token.logoURI" size="28" color="grey-lighten-1">mdi-circle</v-icon>
                  <span v-if="!token.logoURI" class="token-symbol-fallback">{{ getTokenIconText(token.symbol) }}</span>
                  <v-img 
                    v-else
                    :src="getTokenLogoSource(token)" 
                    @error="handleImageError($event, token)" 
                    :alt="token.symbol || 'Token'"
                  />
                </div>
              </v-avatar>
              
              <div class="token-info flex-grow-1">
                <div class="d-flex align-center">
                  <div class="text-subtitle-1 font-weight-medium">{{ token.symbol }}</div>
                  <v-chip v-if="token.price && parseFloat(token.price) > 0" size="x-small" color="primary" variant="flat" class="ml-2">
                    ${{ formatPrice(token.price) }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis">Balance: {{ formatBalance(token.balance, token.decimals) }}</div>
              </div>
              
              <v-checkbox 
                v-model="token.selected" 
                @click.stop
                hide-details
                color="primary"
                class="ml-2"
              ></v-checkbox>
            </div>
            
            <div v-if="token.selected" class="token-amount pa-4 pt-1">
              <div class="d-flex align-center">
                <v-text-field
                  v-model="token.amount"
                  label="Amount"
                  variant="outlined"
                  density="compact"
                  hide-details
                  type="number"
                  class="amount-field"
                  @input="updateTokenAmount(token)"
                ></v-text-field>
                
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  class="max-btn ml-2"
                  @click.stop="setMaxAmount(token)"
                >
                  MAX
                </v-btn>
              </div>
            </div>
          </v-card>
        </div>
        
        <div v-if="error" class="error-message mt-4 pa-3 rounded bg-error-lightened">
          <v-icon size="20" color="error" class="mr-2">mdi-alert-circle</v-icon>
          {{ error }}
        </div>
      </v-card-text>
      
      <v-divider></v-divider>
      
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="close" class="text-medium-emphasis">
          Cancel
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :disabled="!canProceed"
          :loading="isLoading"
          @click="proceedToPreview"
          class="px-6"
        >
          <v-icon class="mr-1">mdi-arrow-right</v-icon>
          Preview Deposit
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Step 2: Preview and confirm -->
    <v-card v-else-if="currentStep === 2" class="deposit-dialog">
      <v-toolbar color="primary" dark class="dialog-header">
        <v-btn icon variant="text" class="mr-2" @click="currentStep = 1">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <v-toolbar-title class="text-h6 font-weight-bold">Confirm Deposit</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      
      <v-card-text class="pa-5">
        <div class="preview-container">
          <h3 class="text-h6 mb-4 font-weight-bold text-center">Transaction Preview</h3>
          
          <div class="selected-tokens mb-5">
            <div class="text-subtitle-1 mb-3 font-weight-medium">You are depositing:</div>
            <v-card v-for="token in selectedTokens" :key="token.address" 
              class="token-preview-item mb-3" 
              variant="outlined">
              <div class="d-flex align-center pa-4">
                <v-avatar size="36" class="mr-3 token-avatar">
                  <div class="token-icon-container">
                    <v-icon v-if="!token.logoURI" size="24" color="grey-lighten-1">mdi-circle</v-icon>
                    <span v-if="!token.logoURI" class="token-symbol-fallback small">{{ getTokenIconText(token.symbol) }}</span>
                    <v-img 
                      v-else
                      :src="getTokenLogoSource(token)" 
                      @error="handleImageError($event, token)" 
                      :alt="token.symbol || 'Token'"
                    />
                  </div>
                </v-avatar>
                
                <div class="token-info flex-grow-1">
                  <div class="text-subtitle-2 font-weight-medium">{{ token.symbol }}</div>
                  <div class="text-caption text-medium-emphasis">
                    Amount: {{ formatBalance(token.amount, token.decimals) }} 
                    <span v-if="token.price && parseFloat(token.price) > 0" class="ml-1">
                      (≈ ${{ calculateUsdValue(token) }})
                    </span>
                  </div>
                </div>
              </div>
            </v-card>
          </div>
          
          <div class="receive-preview bg-grey-lighten-5 rounded-lg pa-4 mb-5">
            <div class="text-subtitle-1 mb-3 font-weight-medium">You will receive:</div>
            <v-card class="result-card" color="primary" variant="flat">
              <div class="d-flex align-center pa-4">
                <div class="piggy-icon mr-4">
                  <v-avatar size="56" class="bg-white piggy-avatar">
                    <v-img 
                      src="@/assets/logo.png" 
                      alt="Piggy Logo" 
                      @error="handlePiggyImageError"
                    />
                  </v-avatar>
                </div>
                
                <div>
                  <div class="text-h5 font-weight-bold text-white">
                    {{ depositPreview && depositPreview.formattedAmount && parseFloat(depositPreview.formattedAmount) > 0 
                        ? depositPreview.formattedAmount 
                        : selectedTokens.length > 0 ? calculateTotalAmount() : '0.00' }} USDC
                  </div>
                  <div class="text-caption text-white-darken-1">
                    Deposited to your Piggy Vault
                  </div>
                </div>
              </div>
            </v-card>
          </div>
          
          <div class="transaction-info pa-4 bg-grey-lighten-5 rounded-lg">
            <div class="d-flex justify-space-between mb-3">
              <span class="text-body-2 text-medium-emphasis">Transaction Fee</span>
              <span class="text-body-2 font-weight-medium">
                <v-chip size="small" color="success" variant="flat" class="px-2">Sponsored</v-chip>
              </span>
            </div>
            <div class="d-flex justify-space-between">
              <span class="text-body-2 text-medium-emphasis">Slippage Tolerance</span>
              <span class="text-body-2 font-weight-medium">1.0%</span>
            </div>
          </div>
          
          <div v-if="error" class="error-message mt-4 pa-3 rounded bg-error-lightened">
            <v-icon size="20" color="error" class="mr-2">mdi-alert-circle</v-icon>
            {{ error }}
          </div>
        </div>
      </v-card-text>
      
      <v-divider></v-divider>
      
      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="currentStep = 1" :disabled="isLoading" class="text-medium-emphasis">
          <v-icon class="mr-1">mdi-arrow-left</v-icon>
          Back
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :loading="isLoading"
          @click="confirmDeposit"
          class="px-6"
        >
          <v-icon class="mr-1">mdi-check</v-icon>
          Confirm Deposit
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Step 3: Success or failure -->
    <v-card v-else-if="currentStep === 3" class="deposit-dialog">
      <v-card-text class="pa-6 text-center">
        <div v-if="isSuccess" class="success-container py-8">
          <v-avatar size="80" color="success-lighten-4" class="mb-4">
            <v-icon size="48" color="success">mdi-check-circle</v-icon>
          </v-avatar>
          <h3 class="text-h5 mb-2 font-weight-bold">Deposit Successful!</h3>
          <p class="text-body-1 mb-3 text-medium-emphasis">Your tokens have been deposited to the Piggy Vault</p>
          
          <!-- Transaction notification card -->
          <v-card v-if="transactionHash" class="transaction-notification mb-6" variant="outlined">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon color="primary" class="mr-2" size="small">mdi-check-decagram</v-icon>
                <span class="text-subtitle-2 font-weight-medium">Transaction Confirmed</span>
              </div>
              <div class="text-body-2 text-medium-emphasis mb-3">
                Your transaction has been confirmed on the Polygon network.
              </div>
              <div class="d-flex align-center">
                <span class="text-caption text-truncate transaction-hash">
                  {{ transactionHash.substring(0, 8) + '...' + transactionHash.substring(transactionHash.length - 8) }}
                </span>
                <v-btn 
                  variant="text" 
                  color="primary" 
                  size="small" 
                  class="ml-auto"
                  @click="openExplorer"
                >
                  <v-icon size="small" class="mr-1">mdi-open-in-new</v-icon>
                  View Transaction
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
          
          <v-btn color="primary" @click="close" size="large" class="px-8">
            Done
          </v-btn>
        </div>
        
        <div v-else class="error-container py-8">
          <v-avatar size="80" color="error-lighten-4" class="mb-4">
            <v-icon size="48" color="error">mdi-alert-circle</v-icon>
          </v-avatar>
          <h3 class="text-h5 mb-2 font-weight-bold">Deposit Failed</h3>
          <p class="text-body-1 mb-6 text-medium-emphasis">{{ error }}</p>
          <div class="d-flex justify-center">
            <v-btn variant="outlined" class="mr-3 px-4" @click="currentStep = 1">
              <v-icon class="mr-1">mdi-refresh</v-icon>
              Try Again
            </v-btn>
            <v-btn color="primary" @click="close" class="px-6">
              Close
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useWalletStore } from '../store/wallet';
import { useTokenStore } from '../store/tokens';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible', 'deposit-success']);

const walletStore = useWalletStore();
const tokenStore = useTokenStore();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const currentStep = ref(1);
const error = ref('');
const isLoading = ref(false);
const isSuccess = ref(false);
const depositPreview = ref(null);
const availableTokens = ref([]);

// Token image source mapping to track which image source is being used for each token
const tokenImageSources = ref({});

// In the script section, add a new ref for transaction hash
const transactionHash = ref('');
const networkId = ref(137); // Default to Polygon Mainnet

// Watch for dialog visibility changes
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    currentStep.value = 1;
    error.value = '';
    isSuccess.value = false;
    depositPreview.value = null;
    transactionHash.value = '';
    await loadTokens();
  }
});

// Load tokens with balances
async function loadTokens() {
  if (!walletStore.isConnected) {
    error.value = 'Wallet not connected';
    return;
  }
  
  isLoading.value = true;
  
  try {
    if (!tokenStore.initialized) {
      await tokenStore.initialize();
    }
    
    // Refresh token balances
    await tokenStore.fetchTokens();
    
    // Filter tokens with non-zero balance
    availableTokens.value = tokenStore.tokens
      .filter(token => parseFloat(token.balance) > 0)
      .map(token => {
        // Get token details from allTokens to ensure we have logo URLs
        const tokenAddress = token.address.toLowerCase();
        const tokenDetails = tokenStore.allTokens[tokenAddress] || {};
        
        // Enhanced token object with all metadata
        const enhancedToken = {
          ...token,
          // Add token details
          symbol: tokenDetails.symbol || 'UNK',
          name: tokenDetails.name || 'Unknown Token',
          decimals: tokenDetails.decimals || 18,
          logoURI: tokenDetails.logoURI || null,
          selected: false,
          amount: ''
        };
        
        if (tokenDetails) {
          console.log(`Token ${tokenAddress} details: symbol=${enhancedToken.symbol}, name=${enhancedToken.name}, logoURI=${enhancedToken.logoURI}`);
        }
        
        return enhancedToken;
      });
    
    // Log token information for debugging
    console.log('Loaded tokens with images:', availableTokens.value.length);
    
    error.value = '';
  } catch (err) {
    console.error('Failed to load tokens:', err);
    error.value = 'Failed to load tokens. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

// Check if a token is selected
function isTokenSelected(address) {
  const token = availableTokens.value.find(t => t.address === address);
  return token && token.selected;
}

// Toggle token selection
function toggleTokenSelection(address) {
  const token = availableTokens.value.find(t => t.address === address);
  if (token) {
    token.selected = !token.selected;
    
    // Clear amount if deselected
    if (!token.selected) {
      token.amount = '';
    }
  }
}

// Update token amount
function updateTokenAmount(token) {
  // Ensure numeric value
  if (token.amount && isNaN(parseFloat(token.amount))) {
    token.amount = '';
  }
  
  // Ensure positive amount
  if (token.amount && parseFloat(token.amount) <= 0) {
    token.amount = '';
  }
  
  // Validate max amount
  const maxAmount = formatBalance(token.balance, token.decimals, false);
  if (parseFloat(token.amount) > parseFloat(maxAmount)) {
    token.amount = maxAmount;
  }
  
  console.log(`Updated ${token.symbol} amount to ${token.amount}`);
}

// Set max amount for a token
function setMaxAmount(token) {
  const maxAmount = formatBalance(token.balance, token.decimals, false);
  token.amount = maxAmount;
}

// Format token balance for display
function formatBalance(balance, decimals = 18, forDisplay = true) {
  if (!balance) return '0';
  
  try {
    const normalizedBalance = parseFloat(balance) / Math.pow(10, decimals);
    
    if (forDisplay) {
      return normalizedBalance.toLocaleString('en-US', {
        maximumFractionDigits: 6,
        minimumFractionDigits: 0
      });
    } else {
      // Return raw number for calculations
      return normalizedBalance.toString();
    }
  } catch (e) {
    console.error('Error formatting balance:', e);
    return '0';
  }
}

// Format price for display
function formatPrice(price) {
  if (!price) return '0.00';
  
  try {
    const priceNum = parseFloat(price);
    return priceNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    console.error('Error formatting price:', e);
    return '0.00';
  }
}

// Calculate USD value
function calculateUsdValue(token) {
  if (!token.price || !token.amount) return '0.00';
  
  try {
    const amountNum = parseFloat(token.amount);
    const priceNum = parseFloat(token.price);
    const value = amountNum * priceNum;
    
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    return '0.00';
  }
}

// Get token icon text fallback
function getTokenIconText(symbol) {
  if (!symbol) return '?';
  return symbol.charAt(0);
}

// Handle image loading error with fallback mechanism
function handleImageError(event, token) {
  if (!event || !event.target || !token || !token.address) {
    // If we don't have valid inputs, just hide the image
    if (event && event.target) {
      event.target.style.display = 'none';
    }
    return;
  }
  
  const address = token.address.toLowerCase();
  
  // Get current source index
  const currentSourceIndex = tokenImageSources.value[address] || -1;
  
  // Try to get next source
  const nextSource = getNextImageSource(token, currentSourceIndex);
  
  if (nextSource) {
    // We have another source to try
    console.log(`Trying alternate image source for ${token.symbol}: ${nextSource}`);
    tokenImageSources.value[address] = currentSourceIndex + 1;
    event.target.src = nextSource;
  } else {
    // We've exhausted all sources, show fallback
    console.log(`No more image sources for ${token.symbol}, using fallback`);
    event.target.style.display = 'none';
    
    // Show fallback
    const container = event.target.closest('.token-icon-container');
    if (container) {
      const icon = container.querySelector('.v-icon');
      const fallback = container.querySelector('.token-symbol-fallback');
      if (icon) icon.style.display = 'block';
      if (fallback) fallback.style.display = 'block';
    }
  }
}

// Get initial token logo source
function getTokenLogoSource(token) {
  if (!token || !token.address) return null;
  
  const address = token.address.toLowerCase();
  
  // If we already tried sources before, get the current one
  const sourceIndex = tokenImageSources.value[address] || 0;
  if (sourceIndex === 0) {
    // First attempt, use the original source
    tokenImageSources.value[address] = 0;
    return token.logoURI;
  } else {
    // Use the current source based on previous attempts
    return getNextImageSource(token, sourceIndex - 1);
  }
}

// Handle Piggy logo error
function handlePiggyImageError(event) {
  if (event && event.target) {
    // Hide the broken image
    event.target.style.display = 'none';
    
    // Try to find the avatar element and add a fallback
    const avatar = event.target.closest('.v-avatar');
    if (avatar) {
      avatar.innerHTML = '<div class="piggy-fallback">P</div>';
    }
  }
}

// Get the next available image source for a token
function getNextImageSource(token, currentSourceIndex = -1) {
  if (!token || !token.address) return null;
  
  const address = token.address.toLowerCase();
  
  // List of potential image sources
  const sources = [
    // Primary source - from token data
    token.logoURI,
    // Trustwallet assets
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/${address}/logo.png`,
    // 1inch logo endpoint
    `https://tokens.1inch.io/v1.1/137/${address}`,
    // Coinmarketcap (for popular tokens)
    token.symbol ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${token.symbol.toLowerCase()}.png` : null
  ].filter(Boolean);
  
  // Get next source or return null if we've tried all
  const nextIndex = currentSourceIndex + 1;
  return nextIndex < sources.length ? sources[nextIndex] : null;
}

// Check if user can proceed to next step
const canProceed = computed(() => {
  const selectedTokens = availableTokens.value.filter(t => t.selected);
  
  if (selectedTokens.length === 0) {
    return false;
  }
  
  // Check if at least one token has an amount
  return selectedTokens.some(token => {
    return token.amount && parseFloat(token.amount) > 0;
  });
});

// Get selected tokens
const selectedTokens = computed(() => {
  return availableTokens.value.filter(t => t.selected && t.amount && parseFloat(t.amount) > 0);
});

// Proceed to preview step
async function proceedToPreview() {
  if (!canProceed.value) {
    return;
  }
  
  isLoading.value = true;
  error.value = '';
  
  try {
    // Prepare tokens for transaction
    prepareTokensForTransaction();
    
    // Get transaction preview
    const result = await walletStore.prepareDepositTransaction();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to prepare transaction');
    }
    
    console.log('Deposit preview data:', result.previewData);
    depositPreview.value = result.previewData;
    
    // If no preview data is returned but we have tokens selected, we can still proceed
    if (!depositPreview.value || !depositPreview.value.formattedAmount) {
      console.log('No preview amount returned, using calculated total as fallback');
    }
    
    currentStep.value = 2;
  } catch (err) {
    console.error('Failed to prepare transaction:', err);
    error.value = err.message || 'Failed to prepare transaction';
  } finally {
    isLoading.value = false;
  }
}

// Prepare tokens for transaction
function prepareTokensForTransaction() {
  // Set selected tokens in the token store
  tokenStore.clearSelectedFromTokens();
  
  // Convert display amounts back to wei
  selectedTokens.value.forEach(token => {
    const decimals = token.decimals || 18;
    const amountInWei = (parseFloat(token.amount) * Math.pow(10, decimals)).toString();
    
    // Add to token store's selected tokens
    tokenStore.toggleFromToken(token.address);
    tokenStore.updateFromTokenAmount(token.address, amountInWei);
  });
}

// Update the confirmDeposit function to capture transaction hash
async function confirmDeposit() {
  isLoading.value = true;
  error.value = '';
  transactionHash.value = '';
  
  try {
    // Log selected tokens for debugging
    console.log('Confirming deposit with tokens:', 
      selectedTokens.value.map(t => ({
        symbol: t.symbol,
        amount: t.amount,
        amountUsd: calculateUsdValue(t)
      }))
    );
    console.log('Total amount to deposit:', calculateTotalAmount());
    
    const result = await walletStore.executeDepositTransaction();
    
    if (!result.success) {
      throw new Error(result.error || 'Transaction failed');
    }
    
    // Store transaction hash if available
    if (result.txHash) {
      transactionHash.value = result.txHash;
      console.log('Transaction hash:', transactionHash.value);
    }
    
    // Get network ID
    networkId.value = walletStore.chainId || 137;
    
    isSuccess.value = true;
    currentStep.value = 3;
    
    // Emit success event
    emit('deposit-success', { 
      txHash: transactionHash.value, 
      amount: calculateTotalAmount() 
    });
  } catch (err) {
    console.error('Deposit failed:', err);
    error.value = err.message || 'Transaction failed';
    isSuccess.value = false;
    currentStep.value = 3;
  } finally {
    isLoading.value = false;
  }
}

// Close dialog
function close() {
  // Reset state
  transactionHash.value = '';
  error.value = '';
  currentStep.value = 1;
  
  // Close dialog
  dialogVisible.value = false;
}

// Enhance token images by preloading from available sources
onMounted(() => {
  console.log('DepositDialog mounted, setting up token image handling');
  
  // Watch for token updates to preload images
  watch(availableTokens, (tokens) => {
    if (tokens && tokens.length > 0) {
      console.log(`Preloading images for ${tokens.length} tokens`);
      
      // Pre-fetch token images
      tokens.forEach(token => {
        if (token.address && token.logoURI) {
          const img = new Image();
          img.onload = () => {
            console.log(`Successfully preloaded image for ${token.symbol}`);
          };
          img.onerror = () => {
            // Try to preload from alternative sources
            const address = token.address.toLowerCase();
            const sources = [
              `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/${address}/logo.png`,
              `https://tokens.1inch.io/v1.1/137/${address}`
            ];
            
            // Cache the fact we tried the original source
            tokenImageSources.value[address] = 0;
            
            // Try alternative sources
            sources.forEach((src, index) => {
              const altImg = new Image();
              altImg.onload = () => {
                console.log(`Preloaded alternative image ${index+1} for ${token.symbol}`);
                // Cache the successful source
                tokenImageSources.value[address] = index + 1;
              };
              altImg.src = src;
            });
          };
          img.src = token.logoURI;
        }
      });
    }
  }, { immediate: false });
});

// Calculate total amount in USD for preview
function calculateTotalAmount() {
  if (!selectedTokens.value || selectedTokens.value.length === 0) {
    return '0.00';
  }
  
  let total = 0;
  selectedTokens.value.forEach(token => {
    const amount = parseFloat(token.amount) || 0;
    const price = parseFloat(token.price) || 0;
    total += amount * price;
  });
  
  return total.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Add function to get the explorer URL based on the transaction hash
function getExplorerUrl() {
  if (!transactionHash.value) return null;
  
  // Different explorer URLs based on network
  const explorers = {
    137: 'https://polygonscan.com/tx/',       // Polygon Mainnet
    80001: 'https://mumbai.polygonscan.com/tx/' // Polygon Mumbai Testnet
  };
  
  // Default to Polygon Mainnet if network is not recognized
  const baseUrl = explorers[networkId.value] || explorers[137];
  return baseUrl + transactionHash.value;
}

// Add function to open explorer in new tab
function openExplorer() {
  const url = getExplorerUrl();
  if (url) {
    window.open(url, '_blank');
  }
}
</script>

<style scoped>
.deposit-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.dialog-header {
  background: linear-gradient(45deg, #FF6F91, #FF8DA1) !important;
}

.token-list {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

.token-list::-webkit-scrollbar {
  width: 6px;
}

.token-list::-webkit-scrollbar-track {
  background: transparent;
}

.token-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.token-item {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.token-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
}

.token-item.selected {
  border-color: var(--v-theme-primary);
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.token-amount {
  position: relative;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.max-btn {
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.amount-field {
  flex: 1;
}

.error-message {
  color: var(--v-theme-error);
  font-size: 0.85rem;
  line-height: 1.4;
}

.bg-error-lightened {
  background-color: rgba(var(--v-theme-error), 0.08);
}

.token-preview-item {
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.result-card {
  border-radius: 16px;
  background: linear-gradient(45deg, #FF6F91, #FF8DA1) !important;
  box-shadow: 0 4px 15px rgba(255, 111, 145, 0.25);
}

.success-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.token-icon-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.token-symbol-fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  font-size: 16px;
  color: #444;
  z-index: 2;
}

.token-symbol-fallback.small {
  font-size: 12px;
}

.token-avatar {
  background-color: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.piggy-avatar {
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.piggy-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 24px;
  color: #FF6F91;
  background-color: white;
  border-radius: 50%;
}

.receive-preview {
  background-color: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.transaction-notification {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  background-color: #f9f9f9;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin-left: auto;
  margin-right: auto;
}

.transaction-hash {
  font-family: monospace;
  color: var(--v-theme-primary);
  max-width: 150px;
}
</style> 