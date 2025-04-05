<template>
    <div>
      <v-dialog v-model="dialogModel" max-width="600" scrollable>
        <!-- ... 其他內容 ... -->
      </v-dialog>
  
      <TransactionStatus
        :visible="showTransactionStatus"
        :status="'交易處理中...'"
        :message="'這將花費一點時間，請稍候。'"
        @update:visible="(val) => showTransactionStatus = val"
        @done="openFinish"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import TransactionStatus from './TransactionStatus.vue'
  
  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  })
  
  const emit = defineEmits(['update:modelValue', 'showFinish'])
  
  const dialogModel = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  
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
  const isConfirming = ref(false)
  
  function handleImageError(event) {
    event.target.src = 'https://via.placeholder.com/40'
  }
  
  async function handleConfirmDeposit() {
    try {
      isConfirming.value = true
      dialogModel.value = false
      await new Promise(resolve => setTimeout(resolve, 300))
      showTransactionStatus.value = true
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error('Deposit failed:', error)
    } finally {
      isConfirming.value = false
    }
  }
  
  const openFinish = () => {
    console.log('openFinish called, emitting showFinish event')
    emit('showFinish')
  }
  </script>