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
        <h2 class="text-2xl font-bold" style="color: #FF6B88">{{ status }}</h2>
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
            <img src="@/assets/load.gif" alt="Piggy" class="piggy" />
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
            <img src="@/assets/load.gif" alt="Piggy" class="piggy" />
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
          <div class="label">Sent ETH</div>
          <a href="#" class="link">View transaction</a>
        </div>
        <div class="label-cell" style="grid-column: 3;">
          <div class="label">Order Created</div>
          <a href="#" class="link">View details</a>
        </div>
        <div class="label-cell" style="grid-column: 5;">
          <div class="label">Receive USDC</div>
        </div>
      </div>

      <!-- OK 按鈕 -->
      <div class="text-center py-4">
        <v-btn color="#FFB6C1" text class="px-10 text-white rounded-full" @click="close">
          OK
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  visible: Boolean,
  status: String,
  message: String,
  initialStep: {
    type: Number,
    default: 1,
  },
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

// 當視窗打開時自動開始跑步驟
watch(
  () => props.visible,
  (val) => {
    if (val) {
      step.value = 1
      const interval = setInterval(() => {
        if (step.value < 5 && props.visible) {
          step.value += 1
        } else {
          clearInterval(interval)
        }
      }, 3000) // 每 3 秒前進
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
</style>
