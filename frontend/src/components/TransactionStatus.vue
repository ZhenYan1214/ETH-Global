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
  
        <!-- 進度條 (Grid) -->
        <div class="progress-grid">
          <!-- Step 1 (Column 1) -->
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
  
          <!-- 線段 1 (Column 2) -->
          <div class="line-cell">
            <div class="line" :class="{ completed: step >= 2 }"></div>
            <template v-if="step === 2">
              <img src="@/assets/load.gif" alt="Piggy" class="piggy" />
            </template>
          </div>
  
          <!-- Step 3 (Column 3) -->
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
  
          <!-- 線段 2 (Column 4) -->
          <div class="line-cell">
            <div class="line" :class="{ completed: step >= 4 }"></div>
            <template v-if="step === 4">
              <img src="@/assets/load.gif" alt="Piggy" class="piggy" />
            </template>
          </div>
  
          <!-- Step 5 (Column 5) -->
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
  
          <!-- 第二列：標籤 (分別放在 Column 1, 3, 5) -->
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
  
        <!-- 測試按鈕 -->
        <div class="test-buttons">
          <button
            v-for="i in 5"
            :key="i"
            class="test-btn"
            :class="{ active: step === i }"
            @click="step = i"
          >
            步驟 {{ i }}
          </button>
        </div>
      </v-card>
    </v-dialog>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const props = defineProps({
    visible: Boolean,
    status: String,
    message: String,
    initialStep: {
      type: Number,
      default: 1,
    },
  })
  
  const emit = defineEmits(['update:visible'])
  const step = ref(props.initialStep)
  
  const close = () => emit('update:visible', false)
  
  const circleClass = (targetStep) => {
    return {
      active: step.value === targetStep,
      completed: step.value > targetStep,
    }
  }
  </script>
  
  <style scoped>
  /* 將左右內邊距從15px改為30px */
  .progress-grid {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 96px 1fr 96px 1fr 96px; /* 固定 96px (80px 圓 + 8px*2) */
    grid-template-rows: 96px auto;
    align-items: center;
    justify-items: center;
    gap: 0;
    width: 900px;
    padding: 0 30px;
    margin: 0 auto;
  }
  
  /* 圓圈部分 */
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
  
  /* 線段部分 */
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
  
  /* 小豬 (放大 1.5 倍：原 100px → 150px) */
  .piggy {
    position: absolute;
    width: 150px;
    height: auto;
    object-fit: contain;
  }
  
  /* 標籤部分 (第二列) */
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
  
  /* 測試按鈕 */
  .test-buttons {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding-bottom: 16px;
  }
  .test-btn {
    padding: 4px 12px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .test-btn.active {
    background-color: #FF4081;
    color: white;
    border-color: #FF4081;
  }
  </style>
  