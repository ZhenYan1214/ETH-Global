<template>
  <v-card class="status-dialog">
    <!-- 加載動畫 -->
    <div class="status-container pa-8" v-if="status === 'pending'">
      <div class="animation-container">
        <v-progress-circular
          indeterminate
          color="pink"
          size="64"
        ></v-progress-circular>
        <span class="pig-emoji">🐷</span>
      </div>
      <h3 class="text-h6 mt-6 text-center">處理中...</h3>
      <p class="text-body-2 text-center text-grey mt-2">
        正在將您的資產存入金庫，請稍候...
      </p>
    </div>

    <!-- 成功狀態 -->
    <div class="status-container pa-8" v-else-if="status === 'success'">
      <div class="animation-container">
        <v-icon
          color="success"
          size="64"
          class="success-icon"
        >mdi-check-circle</v-icon>
        <span class="pig-emoji happy">🐽</span>
      </div>
      <h3 class="text-h6 mt-6 text-center">存入成功！</h3>
      <p class="text-body-2 text-center text-grey mt-2">
        您的資產已經安全存入金庫
      </p>
      <v-btn
        block
        class="mt-6 close-button"
        @click="closeDialog"
      >
        完成
      </v-btn>
    </div>

    <!-- 失敗狀態 -->
    <div class="status-container pa-8" v-else-if="status === 'error'">
      <div class="animation-container">
        <v-icon
          color="error"
          size="64"
          class="error-icon"
        >mdi-alert-circle</v-icon>
        <span class="pig-emoji sad">🐷</span>
      </div>
      <h3 class="text-h6 mt-6 text-center">存入失敗</h3>
      <p class="text-body-2 text-center text-grey mt-2">
        {{ errorMessage || '交易處理過程中發生錯誤' }}
      </p>
      <v-btn
        block
        class="mt-6 retry-button"
        @click="retryTransaction"
      >
        重試
      </v-btn>
      <v-btn
        block
        text
        class="mt-2"
        @click="closeDialog"
      >
        關閉
      </v-btn>
    </div>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'pending'  // 'pending', 'success', 'error'
  },
  errorMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['retry', 'close'])

function closeDialog() {
  if (props.status !== 'pending') {
    emit('close')
  }
}

function retryTransaction() {
  emit('retry')
}
</script>

<style scoped>
.status-dialog {
  border-radius: 20px;
  overflow: hidden;
  background: white;
  animation: fadeIn 0.3s ease;
}

.status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 300px;
}

.animation-container {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pig-emoji {
  position: absolute;
  font-size: 48px;
  line-height: 1;
}

.success-icon {
  animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.error-icon {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.pig-emoji.happy {
  animation: bounce 1s infinite;
}

.pig-emoji.sad {
  animation: wobble 2s infinite;
}

.close-button {
  background: linear-gradient(135deg, #FFB6C1, #FF69B4) !important;
  color: white !important;
  font-weight: 600;
  border-radius: 12px;
}

.retry-button {
  background: linear-gradient(135deg, #FFB6C1, #FF69B4) !important;
  color: white !important;
  font-weight: 600;
  border-radius: 12px;
}

@keyframes popIn {
  0% {
    transform: scale(0);
  }
  70% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-5px);
  }
  40%, 80% {
    transform: translateX(5px);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes wobble {
  0%, 100% {
    transform: rotate(0);
  }
  25% {
    transform: rotate(-5deg);
  }
  75% {
    transform: rotate(5deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
  