<template>
  <v-dialog
    :model-value="show"
    @update:model-value="$emit('update:show', $event)"
    max-width="420"
    persistent
  >
    <v-card class="finish-dialog">
      <!-- 導航列 -->
      <div class="dialog-header">
        <v-btn icon variant="text" color="#FF4081" @click="$emit('update:show', false)">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <a href="#" target="_blank" class="explorer-link">
          View on Explorer
          <v-icon size="small">mdi-open-in-new</v-icon>
        </a>
      </div>

      <!-- 主內容區：垂直置中 -->
      <div class="main-section">
        <h2 class="status-title">交易完成！</h2>

        <img src="@/assets/pig2.gif" alt="Pig" class="pig-img" />

        <div class="token-exchange">
          <div class="exchange-item">
            <span class="label">你收到了</span>
            <div class="token-amount">
              <v-avatar size="24" class="mr-2">
                <v-img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" />
              </v-avatar>
              <span class="amount">{{ toAmount }} USDC</span>
            </div>
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: Boolean,
  toAmount: {
    type: String,
    default: '0',
  },
})
const emit = defineEmits(['update:show'])

let ws = null
onMounted(() => {
  connectWebSocket()
})
onUnmounted(() => {
  if (ws) ws.close()
})
function connectWebSocket() {
  ws = new WebSocket("ws://localhost:3011")
  ws.onopen = () => console.log("WebSocket connected")
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === "event.emitted" && data.data.name === "Deposit") {
        emit('update:show', true)
      }
    } catch (err) {
      console.error("WebSocket error:", err)
    }
  }
  ws.onerror = (err) => console.error("WebSocket error:", err)
  ws.onclose = () => {
    setTimeout(connectWebSocket, 5000)
  }
}
</script>

<style scoped>
.finish-dialog {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #FFB6C1;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(255, 64, 129, 0.2);
}

/* 導航區 */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fff0f5;
}
.explorer-link {
  display: flex;
  align-items: center;
  color: #FF4081;
  font-size: 0.85rem;
  gap: 4px;
  text-decoration: none;
}

/* 主內容區（垂直置中） */
.main-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
}
.status-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #FF4081;
  margin-bottom: 6px;
}

.pig-img {
  width: 150px;
  height: auto;
  margin-bottom: 8px;
}

/* USDC 區塊 */
.token-exchange {
  background: #fff;
  border: 1px solid #FFB6C1;
  border-radius: 8px;
  padding: 6px 12px;
}
.exchange-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.label {
  font-size: 0.9rem;
  color: #FF4081;
}
.token-amount {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #333;
}
</style>
