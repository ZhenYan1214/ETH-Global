<template>
  <v-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    max-width="900"
    persistent
  >
    <v-card class="rounded-lg" style="background-color: #FFF5F5;">
      <!-- 標題區 -->
      <div class="text-center pt-6 px-6">
        <h2 class="text-2xl font-bold" :style="{ color: status === 'success' ? '#4CAF50' : (status === 'error' ? '#F44336' : '#FF6B88') }">
          {{ status === 'pending' ? '處理中' : (status === 'success' ? '成功' : '失敗') }}
        </h2>
        <p class="text-gray-700 text-base mt-2 mb-6">{{ message }}</p>
      </div>

      <!-- 進度條 -->
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

        <!-- 線段 1 -->
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

        <!-- 線段 2 -->
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

        <!-- 標籤 -->
        <div class="label-cell" style="grid-column: 1;">
          <div class="label">發送交易</div>
          <a v-if="hash" :href="`https://polygonscan.com/tx/${hash}`" target="_blank" class="link">查看交易</a>
        </div>
        <div class="label-cell" style="grid-column: 3;">
          <div class="label">交易確認</div>
          <a v-if="hash" :href="`https://polygonscan.com/tx/${hash}`" target="_blank" class="link">查看詳情</a>
        </div>
        <div class="label-cell" style="grid-column: 5;">
          <div class="label">完成存款</div>
          <!-- 顯示Transaction Receipt信息，但僅當交易成功時 -->
          <div v-if="receipt && status === 'success'" class="receipt-info">
            <span class="receipt-text">收據已確認</span>
          </div>
        </div>
      </div>

      <!-- OK 按鈕 -->
      <div class="text-center py-4">
        <v-btn v-if="status !== 'pending'" color="#FFB6C1" text class="px-10 text-white rounded-full" @click="close">
          OK
        </v-btn>
        <v-btn v-else color="#FFB6C1" text class="px-10 text-white rounded-full" disabled>
          处理中...
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
    default: '交易處理中，請稍候...'
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

// 在掛載時記錄初始props
onMounted(() => {
  console.log('[TransactionStatus] 組件掛載時狀態:', {
    visible: props.visible,
    status: props.status,
    message: props.message,
    hash: props.hash,
    initialStep: props.initialStep,
    receipt: props.receipt ? '已提供' : 'null'
  })
})

// 記錄所有的 prop 變化，以便調試
watch(
  () => ({ 
    status: props.status,
    hash: props.hash,
    receipt: props.receipt,
    visible: props.visible
  }),
  (newProps, oldProps) => {
    try {
      console.log('[TransactionStatus] 屬性變化:', {
        status: `${oldProps.status} -> ${newProps.status}`,
        hash: newProps.hash !== oldProps.hash ? `已更新: ${newProps.hash}` : '無變化',
        receipt: newProps.receipt !== oldProps.receipt ? 
          (newProps.receipt ? '收據已設置' : '收據已移除') : '無變化',
        visible: `${oldProps.visible} -> ${newProps.visible}`
      })
      
      // 檢查是否同時滿足完成條件
      if (newProps.status === 'success' && newProps.receipt) {
        console.log('[TransactionStatus] 檢測到成功條件: status=success AND receipt已提供')
        handleTransactionComplete()
      }
    } catch (error) {
      console.error('[TransactionStatus] 屬性變化監聽器發生錯誤:', error)
    }
  },
  { deep: true, immediate: true }
)

// 處理 receipt 變化
watch(() => props.receipt, (newReceipt) => {
  try {
    console.log('[TransactionStatus] receipt變化:', newReceipt ? '收據已接收' : 'null或undefined')
    
    if (newReceipt) {
      console.log('[TransactionStatus] 收據詳情:', {
        blockNumber: newReceipt.blockNumber || 'N/A',
        status: newReceipt.status || 'N/A',
        gasUsed: (newReceipt.gasUsed && newReceipt.gasUsed.toString()) || 'N/A'
      })
      
      // 檢查是否應該進入成功狀態
      if (props.status === 'success') {
        console.log('[TransactionStatus] 收據收到且狀態為success')
        handleTransactionComplete()
      }
    }
  } catch (error) {
    console.error('[TransactionStatus] receipt監聽器發生錯誤:', error)
  }
}, { deep: true, immediate: true })

// 處理 status 變化
watch(() => props.status, (newStatus) => {
  try {
    console.log('[TransactionStatus] 狀態變化:', newStatus)
    
    if (newStatus === 'success' && props.receipt) {
      console.log('[TransactionStatus] 狀態變更為success且已有收據')
      handleTransactionComplete()
    } else if (newStatus === 'error') {
      console.log('[TransactionStatus] 交易發生錯誤')
    }
  } catch (error) {
    console.error('[TransactionStatus] 狀態監聽器發生錯誤:', error)
  }
}, { immediate: true })

// 重新加入修改自動步驟前進功能
watch(
  () => props.visible,
  (val) => {
    try {
      console.log('[TransactionStatus] 可見性變化:', val)
      if (val) {
        step.value = 1
        console.log('[TransactionStatus] 開始自動進度更新')
        const interval = setInterval(() => {
          try {
            // 只前進到第4步，等待交易收據
            if (step.value < 4 && props.visible) {
              step.value += 1
              console.log('[TransactionStatus] 進度更新:', step.value)
            } else {
              console.log('[TransactionStatus] 停止自動進度更新')
              clearInterval(interval)
            }
          } catch (error) {
            console.error('[TransactionStatus] 進度更新發生錯誤:', error)
            clearInterval(interval)
          }
        }, 3000) // 每 3 秒前進
      }
    } catch (error) {
      console.error('[TransactionStatus] 可見性監聽器發生錯誤:', error)
    }
  }
)

// 統一處理交易完成邏輯
function handleTransactionComplete() {
  try {
    console.log('[TransactionStatus] 處理交易完成')
    // 確保所有步驟完成
    step.value = 5
    
    // 延遲關閉，讓用戶看到完成的動畫
    setTimeout(() => {
      try {
        console.log('[TransactionStatus] 延遲完畢，準備關閉對話框')
        close()
      } catch (error) {
        console.error('[TransactionStatus] 關閉延遲函數發生錯誤:', error)
      }
    }, 2000)
  } catch (error) {
    console.error('[TransactionStatus] 處理交易完成發生錯誤:', error)
  }
}

const close = () => {
  try {
    console.log('[TransactionStatus] 關閉函數被調用，發出事件')
    // 先發出 done 事件，再關閉對話框
    emit('done')
    // 短暫延遲後關閉對話框
    setTimeout(() => {
      try {
        emit('update:visible', false)
        console.log('[TransactionStatus] 對話框已關閉')
      } catch (error) {
        console.error('[TransactionStatus] 關閉對話框發生錯誤:', error)
      }
    }, 100)
    step.value = 1
  } catch (error) {
    console.error('[TransactionStatus] close函數發生錯誤:', error)
    // 即使發生錯誤，也嘗試關閉對話框
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
