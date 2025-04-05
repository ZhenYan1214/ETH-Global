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
        <a 
          v-if="transactionHash" 
          :href="`https://polygonscan.com/tx/${transactionHash}`" 
          target="_blank" 
          class="explorer-link"
        >
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
        
        <!-- 交易信息 -->
        <div v-if="transactionHash" class="transaction-info">
          <div class="info-row">
            <span class="info-label">交易哈希:</span>
            <span class="info-value">{{ shortHash }}</span>
          </div>
          <div v-if="blockNumber" class="info-row">
            <span class="info-label">區塊:</span>
            <span class="info-value">{{ blockNumber }}</span>
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  show: Boolean,
  toAmount: {
    type: String,
    default: '0',
  },
  transactionHash: {
    type: String,
    default: '',
  },
  receipt: {
    type: Object,
    default: null,
  }
})
const emit = defineEmits(['update:show'])

// 計算屬性：縮短的交易哈希
const shortHash = computed(() => {
  if (!props.transactionHash) return '';
  const hash = props.transactionHash;
  return hash.substring(0, 6) + '...' + hash.substring(hash.length - 4);
});

// 計算屬性：區塊號
const blockNumber = computed(() => {
  return props.receipt?.blockNumber || '';
});

let ws = null
onMounted(() => {
  connectWebSocket()
})
onUnmounted(() => {
  if (ws) ws.close()
})
function connectWebSocket() {
  ws = new WebSocket("ws://localhost:3012")
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
  margin-bottom: 12px;
  width: 100%;
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

/* 交易信息區 */
.transaction-info {
  width: 100%;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  font-size: 0.85rem;
}
.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.info-label {
  color: #666;
}
.info-value {
  color: #333;
  font-family: monospace;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
