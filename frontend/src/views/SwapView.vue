<template>
  <div class="swap-container">
    <!-- 頂部導航欄 -->
    <v-app-bar class="nav-bar">
      <v-btn to="/home" class="nav-btn" variant="text">
        <v-icon left>mdi-arrow-left</v-icon>
        Back
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn to="/history" class="nav-btn" variant="text">
        <v-icon left>mdi-history</v-icon>
        History
      </v-btn>
    </v-app-bar>

    <!-- 主要內容 -->
    <div class="content-container">
      <v-card class="swap-card">
        <v-card-title class="card-title">
          <span class="text-h5">
            <v-icon left>mdi-swap-horizontal</v-icon>
            Swap
          </span>
        </v-card-title>

        <v-card-text class="pa-6">
          <!-- Swap 表單 -->
          <div class="swap-form">
            <!-- From Token -->
            <div class="token-input-container">
              <v-text-field
                v-model="fromAmount"
                label="From"
                variant="outlined"
                class="mb-4"
                hide-details
              >
                <template v-slot:append>
                  <v-btn
                    class="token-select-btn"
                    @click="showFromTokenList = true"
                    rounded="pill"
                    variant="tonal"
                  >
                    <template v-if="selectedFromToken">
                      {{ selectedFromToken.address.substring(0, 8) }}...
                    </template>
                    <template v-else>
                      Select Token
                    </template>
                    <v-icon right class="ml-2">mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
            </div>

            <!-- Swap Arrow -->
            <div class="swap-arrow">
              <v-btn icon class="swap-arrow-btn" @click="swapTokens">
                <v-icon>mdi-swap-vertical</v-icon>
              </v-btn>
            </div>

            <!-- To Token -->
            <div class="token-input-container">
              <v-text-field
                v-model="toAmount"
                label="To"
                variant="outlined"
                class="mb-4"
                hide-details
              >
                <template v-slot:append>
                  <v-btn
                    class="token-select-btn"
                    @click="showToTokenList = true"
                    rounded="pill"
                    variant="tonal"
                  >
                    <template v-if="selectedToToken">
                      {{ selectedToToken.address.substring(0, 8) }}...
                    </template>
                    <template v-else>
                      Select Token
                    </template>
                    <v-icon right class="ml-2">mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
            </div>
          </div>

          <!-- Swap 按鈕 -->
          <v-btn
            block
            class="swap-btn mt-6"
            size="large"
            elevation="2"
            :disabled="!selectedFromToken || !selectedToToken"
          >
            Swap Now
          </v-btn>
        </v-card-text>
      </v-card>
    </div>

    <!-- From Token 選擇對話框 -->
    <v-dialog v-model="showFromTokenList" max-width="400">
      <v-card class="token-dialog">
        <v-card-title class="dialog-title">
          <span>選擇代幣</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="showFromTokenList = false" class="close-btn">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list v-if="tokens.length > 0">
            <v-list-item
              v-for="token in tokens"
              :key="token.address"
              @click="selectFromToken(token)"
              class="token-list-item"
              :class="{ 'selected': selectedFromToken?.address === token.address }"
            >
              <div class="d-flex justify-space-between align-center w-100">
                <span class="token-address">{{ token.address.substring(0, 8) }}...</span>
                <span class="token-balance">{{ token.balance }}</span>
              </div>
            </v-list-item>
          </v-list>
          <div v-else class="text-center pa-4">
            Loading tokens...
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- To Token 選擇對話框 -->
    <v-dialog v-model="showToTokenList" max-width="400">
      <v-card class="token-dialog">
        <v-card-title class="dialog-title">
          <span>選擇代幣</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="showToTokenList = false" class="close-btn">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list v-if="tokens.length > 0">
            <v-list-item
              v-for="token in tokens"
              :key="token.address"
              @click="selectToToken(token)"
              class="token-list-item"
              :class="{ 'selected': selectedToToken?.address === token.address }"
            >
              <div class="d-flex justify-space-between align-center w-100">
                <span class="token-address">{{ token.address.substring(0, 8) }}...</span>
                <span class="token-balance">{{ token.balance }}</span>
              </div>
            </v-list-item>
          </v-list>
          <div v-else class="text-center pa-4">
            Loading tokens...
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const isLoading = ref(false)
const tokens = ref([])
const fromAmount = ref('')
const toAmount = ref('')
const showFromTokenList = ref(false)
const showToTokenList = ref(false)
const selectedFromToken = ref(null)
const selectedToToken = ref(null)

const DEFAULT_WALLET_ADDRESS = "0x4EC7a00D26d392e1B29e6b7fA0199D5849A1459d"

async function checkWalletTokens() {
  isLoading.value = true
  tokens.value = [] // 清空現有代幣列表
  
  try {
    console.log('開始獲取代幣列表...')
    console.log('API URL:', `http://localhost:3010/wallet/balances/137/${DEFAULT_WALLET_ADDRESS}`)
    
    const response = await axios.get(`http://localhost:3010/wallet/balances/137/${DEFAULT_WALLET_ADDRESS}`)
    console.log('完整的 API 響應:', response)
    console.log('API 響應數據:', response.data)
    
    if (!response.data) {
      console.error('API 響應為空')
      return
    }

    if (!response.data.balances) {
      console.error('API 響應中沒有 balances 字段:', response.data)
      return
    }

    if (!Array.isArray(response.data.balances)) {
      console.error('balances 不是數組:', response.data.balances)
      return
    }

    const filteredTokens = response.data.balances.filter(token => {
      if (!token.token || !token.balance) {
        console.log('跳過無效的代幣數據:', token)
        return false
      }
      const balance = parseFloat(token.balance)
      console.log(`代幣 ${token.token} 的餘額:`, balance)
      return balance > 0
    })

    console.log('過濾後的代幣:', filteredTokens)

    tokens.value = filteredTokens.map(token => {
      const processed = {
        address: token.token,
        balance: parseFloat(token.balance).toFixed(4)
      }
      console.log('處理後的代幣數據:', processed)
      return processed
    })

    console.log('最終的代幣列表:', tokens.value)
    
    if (tokens.value.length === 0) {
      console.log('沒有找到任何代幣')
    }
  } catch (error) {
    console.error('獲取代幣時出錯:', error)
    if (error.response) {
      console.error('錯誤響應:', error.response.data)
      console.error('錯誤狀態:', error.response.status)
    } else if (error.request) {
      console.error('沒有收到響應:', error.request)
    } else {
      console.error('請求配置錯誤:', error.message)
    }
  } finally {
    isLoading.value = false
  }
}

function selectFromToken(token) {
  selectedFromToken.value = token
  showFromTokenList.value = false
}

function selectToToken(token) {
  selectedToToken.value = token
  showToTokenList.value = false
}

function swapTokens() {
  const temp = selectedFromToken.value
  selectedFromToken.value = selectedToToken.value
  selectedToToken.value = temp
}

onMounted(() => {
  checkWalletTokens()
})
</script>

<style scoped>
.swap-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
}

.nav-bar {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
}

.content-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  min-height: calc(100vh - 64px);
}

.swap-card {
  width: 100%;
  max-width: 480px;
  border-radius: 20px !important;
}

.card-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  padding: 1rem 1.5rem !important;
}

.token-select-btn {
  background: rgba(255, 182, 193, 0.1) !important;
  color: #333 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 0 16px !important;
  height: 40px !important;
}

.swap-arrow {
  display: flex;
  justify-content: center;
  margin: -12px 0;
  position: relative;
  z-index: 1;
}

.swap-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  font-size: 1.1rem !important;
  text-transform: none !important;
  border-radius: 12px !important;
}

.token-dialog {
  border-radius: 12px !important;
}

.dialog-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
}

.close-btn {
  color: white !important;
}

.token-list-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.token-list-item:hover {
  background-color: rgba(255, 182, 193, 0.1) !important;
}

.token-list-item.selected {
  background-color: rgba(255, 182, 193, 0.2) !important;
}

.token-address {
  font-family: monospace;
  font-size: 14px;
}

.token-balance {
  color: #FF6B88;
  font-weight: 500;
}
</style> 