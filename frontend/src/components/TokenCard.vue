<template>
  <v-card class="token-card" elevation="0">
    <!-- Token Header with Info -->
    <div class="card-content">
      <!-- Token Info -->
      <div class="token-info">
        <v-avatar size="40" class="token-avatar">
          <v-img :src="getTokenLogo(token.address)" @error="handleImageError" />
        </v-avatar>
        <div class="token-details">
          <div class="text-subtitle-1 font-weight-medium">{{ getTokenSymbol(token.address) }}</div>
          <div class="text-caption text-grey">Balance: {{ getFormattedBalance(token) }}</div>
          <div class="text-caption price-text">{{ getFormattedPrice(token) }}</div>
        </div>
      </div>

      <!-- Amount Input -->
      <div class="token-amount">
        <div class="amount-field-container">
          <v-text-field
            v-model="localAmount"
            variant="outlined"
            density="compact"
            hide-details
            type="number"
            min="0"
            class="amount-input"
            placeholder="0.00"
            @input="handleAmountChange"
          ></v-text-field>
          
          <div class="token-actions">
            <v-btn
              size="small"
              variant="outlined"
              color="primary"
              @click="$emit('max')"
              class="max-btn"
              density="compact"
            >MAX</v-btn>
            <v-btn
              icon 
              size="small"
              variant="text" 
              color="error"
              @click="$emit('remove')"
              class="remove-btn"
              density="compact"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </div>
        
        <!-- Token Value -->
        <div class="token-value">
          <span class="text-caption value-text">≈ {{ calculateValueUSD }}</span>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useTokenStore } from '../store/tokens';

const props = defineProps({
  token: Object,
});

const emit = defineEmits(['max', 'remove', 'amount-change']);

const tokenStore = useTokenStore();
const localAmount = ref(props.token?.amount || '');

watch(() => props.token?.amount, (newAmount) => {
  if (newAmount !== localAmount.value) {
    localAmount.value = newAmount;
  }
});

function handleAmountChange(event) {
  emit('amount-change', event.target.value);
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

function getFormattedBalance(token) {
  if (!token) return '0';
  
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()];
  const decimals = tokenInfo?.decimals || 18;
  
  if (token.formattedBalance) return token.formattedBalance;
  
  try {
    const normalizedBalance = parseFloat(token.balance || '0') / Math.pow(10, decimals);
    return normalizedBalance.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0
    });
  } catch (e) {
    return '0';
  }
}

function getFormattedPrice(token) {
  if (!token || !token.price) return '$0.00';
  
  if (token.formattedPrice) return token.formattedPrice;
  
  try {
    const priceNum = parseFloat(token.price);
    return '$' + priceNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    return '$0.00';
  }
}

const calculateValueUSD = computed(() => {
  if (!props.token || !props.token.price || !localAmount.value) return '$0.00';
  
  const tokenInfo = tokenStore.allTokens[props.token.address.toLowerCase()];
  const decimals = tokenInfo?.decimals || 18;
  
  try {
    // Calculate normalized amount
    const amount = parseFloat(localAmount.value || '0');
    const value = amount * parseFloat(props.token.price);
    
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    return '$0.00';
  }
});

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40';
}
</script>

<style scoped>
.token-card {
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background-color: #ffffff;
}

.token-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.card-content {
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: center;
}

.token-info {
  display: flex;
  align-items: center;
}

.token-avatar {
  margin-right: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.token-details {
  display: flex;
  flex-direction: column;
}

.price-text {
  color: var(--v-theme-primary);
  margin-top: 2px;
}

.token-amount {
  display: flex;
  flex-direction: column;
}

.amount-field-container {
  display: flex;
  align-items: center;
  position: relative;
}

.amount-input {
  flex-grow: 1;
}

.amount-input :deep(.v-field__outline) {
  --v-field-border-width: 1px !important;
}

.token-actions {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.max-btn {
  font-size: 0.7rem;
  font-weight: bold;
  margin-right: 4px;
  letter-spacing: 0.5px;
}

.remove-btn {
  opacity: 0.7;
}

.remove-btn:hover {
  opacity: 1;
}

.token-value {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.value-text {
  color: var(--v-theme-primary);
  font-weight: 500;
}

@media (max-width: 600px) {
  .card-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style> 