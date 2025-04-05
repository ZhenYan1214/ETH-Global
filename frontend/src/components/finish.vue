<template>
  <v-dialog
    :model-value="show"
    @update:model-value="$emit('update:show', $event)"
    max-width="460px"
    persistent
  >
    <v-card class="finish-dialog">
      <!-- 頂部導航 -->
      <div class="dialog-header">
        <v-btn icon variant="text" color="white" @click="$emit('update:show', false)">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <a href="#" target="_blank" class="explorer-link">
          <span>View on Explorer</span>
          <v-icon size="small">mdi-open-in-new</v-icon>
        </a>
      </div>

      <!-- 交易完成狀態 -->
      <div class="status-section">
        <div class="success-icon">
          <v-icon color="success" size="40">mdi-check-circle</v-icon>
        </div>
        <h2 class="status-title">交易完成！</h2>
      </div>

      <!-- 交易詳情 -->
      <div class="transaction-details">
        <div class="token-exchange">
          <div class="exchange-item">
            <span class="label">你賣出了</span>
            <div class="token-amount">
              <v-avatar size="24" class="mr-2">
                <v-img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" />
              </v-avatar>
              <span class="amount">{{ fromAmount }} ETH</span>
            </div>
          </div>

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

        <!-- Solver 排名 -->
        <div class="solver-section">
          <h3 class="solver-title">Solver 排名</h3>
          <div class="solver-stats">
            <span>{{ solverCount }} 個 solvers 中的 {{ submittedCount }} 個提交了解決方案</span>
          </div>

          <div class="solver-list">
            <div v-for="(solver, index) in solvers" :key="solver.name" 
                 class="solver-item"
                 :class="{ 'winner': index === 0 }">
              <div class="solver-rank">{{ index + 1 }}</div>
              <div class="solver-avatar">
                <v-avatar size="28">
                  <v-img :src="solver.avatar" />
                </v-avatar>
              </div>
              <div class="solver-name">{{ solver.name }}</div>
              <div v-if="index === 0" class="winner-badge">
                <v-icon color="success" size="small">mdi-crown</v-icon>
                <span>最佳 solver</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 提示卡片 -->
        <div class="tip-card">
          <div class="tip-content">
            <div class="tip-icon">
              <img src="https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png" 
                   alt="Tip" class="tip-piggy" />
            </div>
            <div class="tip-text">
              <h4>小提示</h4>
              <p>使用豬豬金庫進行大額交易時，可以享受更優惠的手續費！</p>
            </div>
          </div>
          <v-btn
            block
            color="primary"
            class="share-btn mt-4"
            prepend-icon="mdi-share-variant"
          >
            分享這個提示！
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, onUnmounted, ref } from 'vue'

const show = ref(false)
const fromAmount = ref('0')
const toAmount = ref('0')
const transactionData = ref(null)

let ws = null

onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})

const connectWebSocket = () => {
  ws = new WebSocket("ws://localhost:3011")

  ws.onopen = () => {
    console.log("WebSocket connected")
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === "event.emitted") {
        // 更新交易數據
        transactionData.value = data.data
        
        // 根據不同的事件類型設置顯示數據
        if (data.data.name === "Deposit") {
          fromAmount.value = data.data.returnValues.amount
          toAmount.value = data.data.returnValues.amount
          show.value = true
        }
        // 可以添加其他事件類型的處理
      }
    } catch (error) {
      console.error("WebSocket message parsing error:", error)
    }
  }

  ws.onerror = (error) => {
    console.error("WebSocket error:", error)
  }

  ws.onclose = () => {
    console.log("WebSocket disconnected")
    // 可選：添加重連邏輯
    setTimeout(connectWebSocket, 5000)
  }
}

// 導出 show 屬性供父組件使用
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  fromAmount: {
    type: String,
    default: '0'
  },
  toAmount: {
    type: String,
    default: '0'
  }
})

defineEmits(['update:show'])

// 模擬數據
const solvers = [
  { name: 'Rizzolver', avatar: 'https://picsum.photos/id/1/100' },
  { name: 'ApeOut 1inch', avatar: 'https://picsum.photos/id/2/100' },
  { name: '0x API', avatar: 'https://picsum.photos/id/3/100' }
]

const solverCount = 13
const submittedCount = 5
</script>

<style scoped>
.finish-dialog {
  background: linear-gradient(180deg, #1a1b2b 0%, #2a2b3b 100%);
  color: white;
  border-radius: 24px;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.explorer-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8899ff;
  text-decoration: none;
  font-size: 0.9rem;
}

.status-section {
  text-align: center;
  padding: 32px 0;
}

.success-icon {
  background: rgba(76, 175, 80, 0.1);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.status-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #4CAF50;
}

.transaction-details {
  padding: 24px;
}

.token-exchange {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.exchange-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.exchange-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #8899aa;
  font-size: 0.9rem;
}

.token-amount {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.solver-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.solver-title {
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.solver-stats {
  color: #8899aa;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.solver-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.solver-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.solver-item.winner {
  background: linear-gradient(45deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.solver-rank {
  font-weight: 600;
  color: #8899aa;
}

.solver-name {
  flex-grow: 1;
  font-weight: 500;
}

.winner-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #4CAF50;
  font-size: 0.8rem;
}

.tip-card {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  border-radius: 16px;
  padding: 20px;
  color: white;
}

.tip-content {
  display: flex;
  gap: 16px;
  align-items: center;
}

.tip-icon {
  flex-shrink: 0;
}

.tip-piggy {
  width: 48px;
  height: 48px;
  animation: bounce 2s infinite;
}

.tip-text h4 {
  font-size: 1.1rem;
  margin-bottom: 4px;
}

.tip-text p {
  font-size: 0.9rem;
  opacity: 0.9;
}

.share-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  font-weight: 600 !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}

.share-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: translateY(-2px);
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
