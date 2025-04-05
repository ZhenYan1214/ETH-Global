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

const circleClass = (targetStep) => {
  return {
    active: step.value === targetStep,
    completed: step.value > targetStep,
  }
}

const close = () => {
  console.log('TransactionStatus close called, emitting done event')
  emit('update:visible', false)
  emit('done')
  step.value = 1
}

// 監聽 receipt，當收到時才顯示完成步驟
watch(() => props.receipt, (newReceipt) => {
  if (newReceipt && props.status === 'success') {
    console.log('交易收據已接收', newReceipt)
    // 確保所有步驟完成
    step.value = 5
    
    // 延遲關閉，讓用戶看到完成的動畫
    setTimeout(() => {
      console.log('交易完成，關閉狀態對話框，發出 done 事件')
      close()
    }, 2000)
  }
}, { deep: true })

// 修改自動步驟前進，但停在第4步等待交易確認
watch(
  () => props.visible,
  (val) => {
    if (val) {
      step.value = 1
      const interval = setInterval(() => {
        // 只前進到第4步，等待交易收據
        if (step.value < 4 && props.visible) {
          step.value += 1
        } else {
          clearInterval(interval)
        }
      }, 3000) // 每 3 秒前進
    }
  }
)

// 監聽交易狀態變化
watch(
  () => props.status,
  (newStatus) => {
    if (newStatus === 'success' && props.receipt) {
      // 如果已經有收據並且狀態是成功，直接前進到最後步驟
      step.value = 5
      setTimeout(() => {
        close()
      }, 2000)
    } else if (newStatus === 'error') {
      // 如果交易錯誤，保持在當前步驟，但不自動關閉
      console.log('交易發生錯誤')
    }
  }
)
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
