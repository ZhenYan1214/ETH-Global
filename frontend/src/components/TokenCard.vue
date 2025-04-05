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
            v-model="localDisplayAmount"
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

/**
 * props.token => {
 *   address: string,
 *   balance: string (wei),
 *   price: string or number (1 token => x USD),
 *   amount: string (wei) -> parent's selected amount in wei
 *   ...
 * }
 */
const props = defineProps({
  token: Object,
});

/**
 * emits:
 * - max: user clicked "MAX"
 * - remove: user clicked remove icon
 * - amount-change: return new amount in wei
 */
const emit = defineEmits(['max', 'remove', 'amount-change']);

const tokenStore = useTokenStore();

/**
 * localDisplayAmount: 用來顯示在輸入框的「普通小數數量」(非 wei)
 * 
 * props.token.amount: 來自父層的wei值
 */
const localDisplayAmount = ref('');

/**
 * 當父層 token.amount(wei) 改變時，把它轉成普通小數顯示
 */
watch(() => props.token?.amount, (newWei) => {
  if (!newWei) {
    localDisplayAmount.value = '';
    return;
  }
  const tokenInfo = tokenStore.allTokens[props.token.address?.toLowerCase()] || {};
  const decimals = tokenInfo.decimals ?? 18;

  const realAmount = parseFloat(newWei) / 10 ** decimals;
  // 顯示時保留幾位小數隨你
  localDisplayAmount.value = realAmount.toString();
}, { immediate: true });

/**
 * 當輸入框改變時，將普通小數數量轉成 wei emit出去
 */
function handleAmountChange(e) {
  const inputValue = parseFloat(e.target.value || '0');
  localDisplayAmount.value = e.target.value; // keep raw string

  const tokenInfo = tokenStore.allTokens[props.token?.address?.toLowerCase()] || {};
  const decimals = tokenInfo.decimals ?? 18;

  // 轉回wei (大整數)
  const newWei = (inputValue * 10 ** decimals).toFixed(0);

  emit('amount-change', newWei);
}

/**
 * 依賴 tokenStore 來取得 token logo
 */
function getTokenLogo(address) {
  if (!address) return 'https://via.placeholder.com/40';
  
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken?.logoURI) return userToken.logoURI;
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo?.logoURI || 'https://via.placeholder.com/40';
}

function getTokenSymbol(address) {
  if (!address) return '???';
  
  const userToken = tokenStore.tokens.find(t => t.address?.toLowerCase() === address.toLowerCase());
  if (userToken?.symbol) return userToken.symbol;
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo?.symbol || '???';
}

/**
 * 顯示餘額(wei->普通數量)
 */
function getFormattedBalance(token) {
  if (!token?.address) return '0';
  
  const tokenInfo = tokenStore.allTokens[token.address.toLowerCase()];
  const decimals = tokenInfo?.decimals || 18;
  
  try {
    const normalizedBalance = parseFloat(token.balance || '0') / 10 ** decimals;
    return normalizedBalance.toLocaleString('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0
    });
  } catch (e) {
    return '0';
  }
}

/**
 * 顯示單位價格
 */
function getFormattedPrice(token) {
  if (!token?.price) return '$0.00';
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

/**
 * 計算顯示USD:
 * localDisplayAmount(普通數量) * token.price
 * 最多小數點三位
 */
const calculateValueUSD = computed(() => {
  if (!props.token?.price || !localDisplayAmount.value) return '$0.00';

  try {
    const inputValue = parseFloat(localDisplayAmount.value || '0');
    const priceNum = parseFloat(props.token.price);
    const totalUSD = inputValue * priceNum;
    return '$' + totalUSD.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
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
