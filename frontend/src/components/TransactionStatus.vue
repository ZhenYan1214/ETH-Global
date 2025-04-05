<template>
  <v-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    max-width="900"
    persistent
  >
    <v-card class="rounded-lg" style="background-color: #FFF5F5;">
      <!-- Title area -->
      <div class="text-center pt-6 px-6">
        <h2 class="text-2xl font-bold" :style="{ color: status === 'success' ? '#4CAF50' : (status === 'error' ? '#F44336' : '#FF6B88') }">
          {{ status === 'pending' ? 'Processing' : (status === 'success' ? 'Success' : 'Failed') }}
        </h2>
        <p class="text-gray-700 text-base mt-2 mb-6">{{ message }}</p>
      </div>

      <!-- Progress bar -->
      <div class="progress-grid">
        <!-- Step 1 -->
        <div class="circle-wrapper">
          <div class="circle" :class="circleClass(1)">
            <template v-if="step === 1">
              <img src="@/assets/load.gif" class="icon-img" />
            </template>
            <template v-else-if="step > 1">
              <span class="checkmark">✓</span>
            </template>
            <template v-else>
              <span class="status-icon">📤</span>
            </template>
          </div>
        </div>

        <!-- Line 1 -->
        <div class="line-cell">
          <div class="line" :class="{ completed: step >= 2 }"></div>
          <template v-if="step === 2">
            <img src="@/assets/load.gif" alt="Loading" class="piggy" />
          </template>
        </div>

        <!-- Step 3 -->
        <div class="circle-wrapper">
          <div class="circle" :class="circleClass(3)">
            <template v-if="step === 3">
              <img src="@/assets/load.gif" class="icon-img" />
            </template>
            <template v-else-if="step > 3">
              <span class="checkmark">✓</span>
            </template>
            <template v-else>
              <span class="status-icon">⏳</span>
            </template>
          </div>
        </div>

        <!-- Line 2 -->
        <div class="line-cell">
          <div class="line" :class="{ completed: step >= 4 }"></div>
          <template v-if="step === 4">
            <img src="@/assets/load.gif" alt="Loading" class="piggy" />
          </template>
        </div>

        <!-- Step 5 -->
        <div class="circle-wrapper">
          <div class="circle" :class="circleClass(5)">
            <template v-if="step === 5">
              <img src="@/assets/load.gif" class="icon-img" />
            </template>
            <template v-else-if="step > 5">
              <span class="checkmark">✓</span>
            </template>
            <template v-else>
              <span class="status-icon">🏁</span>
            </template>
          </div>
        </div>

        <!-- Labels -->
        <div class="label-cell" style="grid-column: 1;">
          <div class="label">Send Transaction</div>
          <a v-if="hash" :href="`https://polygonscan.com/tx/${hash}`" target="_blank" class="link">View Transaction</a>
        </div>
        <div class="label-cell" style="grid-column: 3;">
          <div class="label">Transaction Confirmed</div>
          <a v-if="hash" :href="`https://polygonscan.com/tx/${hash}`" target="_blank" class="link">View Details</a>
        </div>
        <div class="label-cell" style="grid-column: 5;">
          <div class="label">Deposit Complete</div>
          <!-- Show Transaction Receipt info, but only when transaction is successful -->
          <div v-if="receipt && status === 'success'" class="receipt-info">
            <span class="receipt-text">Receipt Confirmed</span>
          </div>
        </div>
      </div>

      <!-- OK Button -->
      <div class="text-center py-4">
        <v-btn v-if="status !== 'pending'" color="#FFB6C1" text class="px-10 text-white rounded-full" @click="close">
          OK
        </v-btn>
        <v-btn v-else color="#FFB6C1" text class="px-10 text-white rounded-full" disabled>
          Processing...
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'pending' // pending, success, error
  },
  message: {
    type: String,
    default: 'Processing transaction, please wait...'
  },
  hash: {
    type: String,
    default: ''
  },
  initialStep: {
    type: Number,
    default: 1,
  },
  receipt: {
    type: Object,
    default: null
  }
})
const emit = defineEmits(['update:visible', 'done'])
const step = ref(props.initialStep)

// Log initial props on mount
onMounted(() => {
  console.log('[TransactionStatus] Component mounted with state:', {
    visible: props.visible,
    status: props.status,
    message: props.message,
    hash: props.hash,
    initialStep: props.initialStep,
    receipt: props.receipt ? 'Provided' : 'null'
  })
})

// Log all prop changes for debugging
watch(
  () => ({ 
    status: props.status,
    hash: props.hash,
    receipt: props.receipt,
    visible: props.visible
  }),
  (newProps, oldProps) => {
    try {
      console.log('[TransactionStatus] Props changed:', {
        status: `${oldProps.status} -> ${newProps.status}`,
        hash: newProps.hash !== oldProps.hash ? `Updated: ${newProps.hash}` : 'No change',
        receipt: newProps.receipt !== oldProps.receipt ? 
          (newProps.receipt ? 'Receipt set' : 'Receipt removed') : 'No change',
        visible: `${oldProps.visible} -> ${newProps.visible}`
      })
      
      // Check if completion conditions are met
      if (newProps.status === 'success' && newProps.receipt) {
        console.log('[TransactionStatus] Success condition detected: status=success AND receipt provided')
        handleTransactionComplete()
      }
    } catch (error) {
      console.error('[TransactionStatus] Error in props watcher:', error)
    }
  },
  { deep: true, immediate: true }
)

// Handle receipt changes
watch(() => props.receipt, (newReceipt) => {
  try {
    console.log('[TransactionStatus] Receipt changed:', newReceipt ? 'Receipt received' : 'null or undefined')
    
    if (newReceipt) {
      console.log('[TransactionStatus] Receipt details:', {
        blockNumber: newReceipt.blockNumber || 'N/A',
        status: newReceipt.status || 'N/A',
        gasUsed: (newReceipt.gasUsed && newReceipt.gasUsed.toString()) || 'N/A'
      })
      
      // Check if should enter success state
      if (props.status === 'success') {
        console.log('[TransactionStatus] Receipt received and status is success')
        handleTransactionComplete()
      }
    }
  } catch (error) {
    console.error('[TransactionStatus] Error in receipt watcher:', error)
  }
}, { deep: true, immediate: true })

// Handle status changes
watch(() => props.status, (newStatus) => {
  try {
    console.log('[TransactionStatus] Status changed:', newStatus)
    
    if (newStatus === 'success' && props.receipt) {
      console.log('[TransactionStatus] Status changed to success and receipt exists')
      handleTransactionComplete()
    } else if (newStatus === 'error') {
      console.log('[TransactionStatus] Transaction error occurred')
    }
  } catch (error) {
    console.error('[TransactionStatus] Error in status watcher:', error)
  }
}, { immediate: true })

// Re-add auto step progression
watch(
  () => props.visible,
  (val) => {
    try {
      console.log('[TransactionStatus] Visibility changed:', val)
      if (val) {
        step.value = 1
        console.log('[TransactionStatus] Starting auto progress update')
        const interval = setInterval(() => {
          try {
            // Only progress to step 4, waiting for transaction receipt
            if (step.value < 4 && props.visible) {
              step.value += 1
              console.log('[TransactionStatus] Progress update:', step.value)
            } else {
              console.log('[TransactionStatus] Stopping auto progress update')
              clearInterval(interval)
            }
          } catch (error) {
            console.error('[TransactionStatus] Error in progress update:', error)
            clearInterval(interval)
          }
        }, 3000) // Progress every 3 seconds
      }
    } catch (error) {
      console.error('[TransactionStatus] Error in visibility watcher:', error)
    }
  }
)

// Unified transaction completion logic
function handleTransactionComplete() {
  try {
    console.log('[TransactionStatus] Processing transaction completion')
    // Ensure all steps are complete
    step.value = 5
    
    // Delay closing to show completion animation
    setTimeout(() => {
      try {
        console.log('[TransactionStatus] Delay complete, preparing to close dialog')
        close()
      } catch (error) {
        console.error('[TransactionStatus] Error in close delay function:', error)
      }
    }, 2000)
  } catch (error) {
    console.error('[TransactionStatus] Error in transaction completion:', error)
  }
}

const close = () => {
  try {
    console.log('[TransactionStatus] Close function called, emitting event')
    // Emit done event first, then close dialog
    emit('done')
    // Short delay before closing dialog
    setTimeout(() => {
      try {
        emit('update:visible', false)
        console.log('[TransactionStatus] Dialog closed')
      } catch (error) {
        console.error('[TransactionStatus] Error closing dialog:', error)
      }
    }, 100)
    step.value = 1
  } catch (error) {
    console.error('[TransactionStatus] Error in close function:', error)
    // Try to close dialog even if error occurs
    emit('update:visible', false)
  }
}

const circleClass = (targetStep) => {
  return {
    active: step.value === targetStep,
    completed: step.value > targetStep,
  }
}
</script>

<style scoped>
.progress-grid {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 96px 1fr 96px 1fr 96px;
  grid-template-rows: 96px auto;
  align-items: center;
  justify-items: center;
  width: 900px;
  padding: 0 30px;
  margin: 0 auto;
}
.circle-wrapper {
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: white;
  border: 8px solid #FFB6C1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.circle.active {
  border-color: #FF4081;
}
.circle.completed {
  background-color: #FF4081;
  border-color: #FF4081;
  color: white;
}
.icon-img {
  width: 72px;
  height: auto;
  object-fit: contain;
}
.status-icon,
.checkmark {
  font-size: 30px;
}
.line-cell {
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
}
.line {
  width: 100%;
  height: 4px;
  background-color: #FFB6C1;
}
.line.completed {
  background-color: #FF4081;
}
.piggy {
  position: absolute;
  width: 150px;
  height: auto;
  object-fit: contain;
}
.label-cell {
  grid-row: 2;
  text-align: center;
}
.label {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}
.link {
  font-size: 14px;
  color: #0000ee;
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}
.receipt-info {
  margin-top: 4px;
  font-size: 12px;
  color: #4CAF50;
}
.receipt-text {
  background-color: rgba(76, 175, 80, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
