<template>
  <v-card class="token-preview" variant="outlined" :class="{ 'clickable': !token }">
    <div v-if="token" class="pa-3">
      <div class="d-flex align-center">
        <v-avatar size="38" class="mr-3">
          <v-img :src="getTokenLogo(token.address)" @error="handleImageError" />
        </v-avatar>
        <div class="flex-grow-1">
          <div class="d-flex justify-space-between align-center mb-1">
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ getTokenSymbol(token.address) }}</div>
              <div class="text-caption text-grey">{{ getTokenName(token.address) }}</div>
            </div>
            <v-chip 
              v-if="token.price" 
              size="small" 
              color="primary" 
              variant="flat"
              class="price-chip"
            >
              ${{ formatPrice(token.price) }}
            </v-chip>
          </div>
          <div class="position-relative mt-2">
            <v-text-field
              v-model="localAmount"
              :label="getTokenSymbol(token.address)"
              :variant="readonly ? 'outlined' : 'underlined'"
              hide-details
              density="compact"
              type="number"
              min="0"
              :readonly="readonly"
              class="amount-field"
              @input="$emit('amount-change', $event.target.value)"
            ></v-text-field>
            <v-btn
              v-if="!readonly"
              size="x-small"
              density="comfortable"
              variant="text"
              color="primary"
              class="max-btn"
              @click="$emit('max')"
            >
              MAX
            </v-btn>
          </div>
        </div>
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
  }
});

const emit = defineEmits(['max', 'amount-change', 'select']);

const tokenStore = useTokenStore();
const localAmount = ref(props.amount || '');

// Watch for external amount changes
watch(() => props.amount, (newAmount) => {
  localAmount.value = newAmount;
});

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

function getTokenName(address) {
  if (!address) return 'Unknown Token';
  
  const userToken = tokenStore.tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  if (userToken && userToken.name) return userToken.name;
  
  const tokenInfo = tokenStore.allTokens[address.toLowerCase()];
  return tokenInfo ? tokenInfo.name : 'Unknown Token';
}

function formatPrice(price) {
  if (!price) return '0.00';
  
  try {
    const priceNum = parseFloat(price);
    return priceNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    return '0.00';
  }
}

function handleImageError(event) {
  event.target.src = 'https://via.placeholder.com/40';
}
</script>

<style scoped>
.token-preview {
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.token-preview.clickable {
  cursor: pointer;
}

.token-preview.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.price-chip {
  font-size: 0.75rem;
}

.max-btn {
  position: absolute;
  right: 0;
  top: 4px;
  font-size: 0.65rem;
  font-weight: bold;
}

.amount-field {
  font-size: 1.1rem;
}
</style> 