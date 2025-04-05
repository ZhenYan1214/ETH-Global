<template>
  <v-card class="simple-token-preview" variant="outlined" @click="$emit('select')">
    <div class="pa-3">
      <div class="d-flex align-center">
        <!-- Token Icon -->
        <v-avatar size="40" class="mr-3">
          <v-img :src="getTokenLogo(token.address)" @error="handleImageError" />
        </v-avatar>
        
        <!-- Token Symbol & Balance -->
        <div class="token-info">
          <div class="token-symbol">{{ getTokenSymbol(token.address) }}</div>
          <div class="token-balance text-caption text-grey">{{ formatBalance(token) }}</div>
        </div>
        
        <!-- Amount Input -->
        <div class="amount-display ml-auto">
          <v-text-field
            v-model="localAmount"
            density="compact"
            variant="plain"
            hide-details
            class="text-right token-amount-field"
            type="text"
            @input="$emit('amount-change', $event.target.value)"
          ></v-text-field>
          <v-btn
            v-if="showClearButton && localAmount"
            icon="mdi-close"
            size="x-small"
            density="compact"
            variant="text"
            color="grey"
            class="clear-btn"
            @click="clearAmount"
          ></v-btn>
        </div>
      </div>
      
      <!-- Value Display -->
      <div class="d-flex justify-space-between align-center token-value-row mt-1">
        <div class="text-caption">$1.00</div>
        <div class="text-caption text-right token-value">≈ ${{ calculateTokenValue }}</div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useTokenStore } from '../store/tokens';

const props = defineProps({
  token: Object,
  amount: String,
  readonly: {
    type: Boolean,
    default: false
  },
  hidePrice: {
    type: Boolean,
    default: false
  },
  showClearButton: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['max', 'amount-change', 'select']);

const tokenStore = useTokenStore();
const localAmount = ref(props.amount || '');

// Watch for external amount changes
watch(() => props.amount, (newAmount) => {
  localAmount.value = newAmount || '';
});

function clearAmount() {
  localAmount.value = '';
  emit('amount-change', '');
}

function getTokenLogo(address) {
  if (!address) return 'https://via.placeholder.com/40';
  
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.logoURI) return userToken.logoURI;
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo && tokenInfo.logoURI ? tokenInfo.logoURI : 'https://via.placeholder.com/40';
}

function getTokenSymbol(address) {
  if (!address) return '???';
  
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.symbol) return userToken.symbol;
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo ? tokenInfo.symbol : '???';
}

function formatBalance(token) {
  if (!token || !token.balance) return '0';
  
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()];
  const decimals = tokenInfo?.decimals || 18;
  
  try {
    const normalizedBalance = parseFloat(token.balance) / Math.pow(10, decimals);
    return normalizedBalance.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0
    });
  } catch (e) {
    return '0';
  }
}

const calculateTokenValue = computed(() => {
  if (!props.token || !props.token.price || !localAmount.value) return '0.00';
  
  try {
    const amountNum = parseFloat(localAmount.value) || 0;
    const price = parseFloat(props.token.price) || 0;
    const value = amountNum * price;
    
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    return '0.00';
  }
});

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40';
}
</script>

<style scoped>
.simple-token-preview {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
}

.simple-token-preview:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.token-info {
  display: flex;
  flex-direction: column;
}

.token-symbol {
  font-weight: 600;
  font-size: 16px;
}

.token-balance {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.amount-display {
  position: relative;
  min-width: 100px;
}

.token-amount-field {
  font-weight: 600;
}

.token-amount-field :deep(input) {
  text-align: right !important;
  font-size: 16px;
}

.token-value-row {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 8px;
}

.token-value {
  font-weight: 500;
}

.clear-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}
</style> 