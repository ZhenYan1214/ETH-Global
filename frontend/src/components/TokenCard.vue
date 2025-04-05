<template>
  <v-card class="token-card" elevation="0">
    <div class="card-content">
      <!-- Token Header -->
      <div class="token-header mb-3">
        <div class="d-flex align-center">
          <v-avatar size="44" class="token-avatar mr-3">
            <v-img :src="getTokenLogo(token.address)" @error="handleImageError" />
          </v-avatar>
          
          <div class="token-details flex-grow-1">
            <div class="text-subtitle-1 font-weight-medium">{{ getTokenSymbol(token.address) }}</div>
            <div class="d-flex align-center">
              <div class="text-caption text-grey mr-2">Balance: {{ getFormattedBalance(token) }}</div>
              <v-chip size="x-small" color="primary" variant="flat" class="price-chip">
                {{ getFormattedPrice(token) }}
              </v-chip>
            </div>
          </div>
          
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

      <!-- Amount Input -->
      <div class="token-amount">
        <div class="d-flex align-center">
          <div class="amount-field-container flex-grow-1">
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
          </div>
          
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            @click="$emit('max')"
            class="max-btn ml-2"
            density="compact"
          >
            MAX
          </v-btn>
        </div>
        
        <!-- Token Value -->
        <div class="token-value mt-2">
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
 * localDisplayAmount: Used to display in the input field as "normal decimal amount" (not wei)
 * 
 * props.token.amount: wei value from parent component
 */
const localDisplayAmount = ref('');

/**
 * When parent's token.amount(wei) changes, convert it to normal decimal for display
 */
watch(() => props.token?.amount, (newWei) => {
  if (!newWei) {
    localDisplayAmount.value = '';
    return;
  }
  const tokenInfo = tokenStore.allTokens[props.token.address?.toLowerCase()] || {};
  const decimals = tokenInfo.decimals ?? 18;

  const realAmount = parseFloat(newWei) / 10 ** decimals;
  // Display with appropriate decimal places
  localDisplayAmount.value = realAmount.toString();
}, { immediate: true });

/**
 * When input field changes, convert normal decimal amount to wei and emit
 */
function handleAmountChange(e) {
  const inputValue = parseFloat(e.target.value || '0');
  localDisplayAmount.value = e.target.value; // keep raw string

  const tokenInfo = tokenStore.allTokens[props.token?.address?.toLowerCase()] || {};
  const decimals = tokenInfo.decimals ?? 18;

  // Convert back to wei (big integer)
  const newWei = (inputValue * 10 ** decimals).toFixed(0);

  emit('amount-change', newWei);
}

/**
 * Use tokenStore to get token logo
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
 * Display balance (wei -> normal amount)
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
 * Display unit price
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
 * Calculate USD display:
 * localDisplayAmount(normal amount) * token.price
 * Maximum 3 decimal places
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
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 16px;
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
}

.token-avatar {
  margin-right: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.token-details {
  display: flex;
  flex-direction: column;
}

.price-chip {
  font-size: 10px;
  font-weight: 500;
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

.max-btn {
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 0.5px;
  height: 32px;
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
}

.value-text {
  color: var(--v-theme-primary);
  font-weight: 500;
}

@media (max-width: 600px) {
  .card-content {
    padding: 12px;
  }
}
</style>
