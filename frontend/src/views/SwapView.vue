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
          <v-spacer></v-spacer>
          <v-btn icon @click="checkWalletTokens" :loading="isLoading">
            <v-icon>mdi-wallet</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-6">
          <!-- 代幣列表 -->
          <div v-if="tokens.length > 0" class="tokens-list mb-6">
            <v-list class="token-list-bg">
              <v-list-item
                v-for="token in tokens"
                :key="token.symbol"
                class="token-item"
              >
                <div class="d-flex align-center justify-space-between w-100">
                  <div class="d-flex align-center">
                    <v-avatar size="32" class="mr-3">
                      <v-img :src="token.logoURI" :alt="token.symbol"></v-img>
                    </v-avatar>
                    <div>
                      <div class="token-symbol">{{ token.symbol }}</div>
                      <div class="token-name">{{ token.name }}</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="token-balance">{{ token.balance }}</div>
                    <div class="token-value">${{ token.value }}</div>
                  </div>
                </div>
              </v-list-item>
            </v-list>
          </div>

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
                :readonly="true"
              >
                <template v-slot:prepend-inner>
                  <v-btn
                    class="token-select-btn"
                    @click="showFromTokenList = true"
                  >
                    <v-avatar size="24" class="mr-2" v-if="selectedFromToken">
                      <v-img :src="selectedFromToken.logoURI" :alt="selectedFromToken.symbol"></v-img>
                    </v-avatar>
                    {{ selectedFromToken ? selectedFromToken.symbol : 'Select Token' }}
                    <v-icon right>mdi-chevron-down</v-icon>
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
                :readonly="true"
              >
                <template v-slot:prepend-inner>
                  <v-btn
                    class="token-select-btn"
                    @click="showToTokenList = true"
                  >
                    <v-avatar size="24" class="mr-2" v-if="selectedToToken">
                      <v-img :src="selectedToToken.logoURI" :alt="selectedToToken.symbol"></v-img>
                    </v-avatar>
                    {{ selectedToToken ? selectedToToken.symbol : 'Select Token' }}
                    <v-icon right>mdi-chevron-down</v-icon>
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
    <v-dialog v-model="showFromTokenList" max-width="500">
      <v-card class="token-dialog">
        <v-card-title class="dialog-title">
          <span>選擇代幣</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="showFromTokenList = false" class="close-btn">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list class="token-list" select-strategy="single-select">
            <v-list-item
              v-for="token in tokens"
              :key="token.address"
              :value="token"
              @click="selectFromToken(token)"
              :class="{ 'selected-token': selectedFromToken?.address === token.address }"
            >
              <template v-slot:prepend>
                <v-checkbox-btn
                  :model-value="selectedFromToken?.address === token.address"
                  color="pink"
                ></v-checkbox-btn>
                <v-avatar size="32" class="mr-3">
                  <v-img :src="token.logoURI" :alt="token.symbol"></v-img>
                </v-avatar>
              </template>
              <v-list-item-title class="token-name">{{ token.symbol }}</v-list-item-title>
              <template v-slot:append>
                <div class="text-right">
                  <div class="token-balance">{{ token.balance }}</div>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- To Token 選擇對話框 -->
    <v-dialog v-model="showToTokenList" max-width="500">
      <v-card class="token-dialog">
        <v-card-title class="dialog-title">
          <span>選擇代幣</span>
          <v-spacer></v-spacer>
          <v-btn icon @click="showToTokenList = false" class="close-btn">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-list class="token-list" select-strategy="single-select">
            <v-list-item
              v-for="token in tokens"
              :key="token.address"
              :value="token"
              @click="selectToToken(token)"
              :class="{ 'selected-token': selectedToToken?.address === token.address }"
            >
              <template v-slot:prepend>
                <v-checkbox-btn
                  :model-value="selectedToToken?.address === token.address"
                  color="pink"
                ></v-checkbox-btn>
                <v-avatar size="32" class="mr-3">
                  <v-img :src="token.logoURI" :alt="token.symbol"></v-img>
                </v-avatar>
              </template>
              <v-list-item-title class="token-name">{{ token.symbol }}</v-list-item-title>
              <template v-slot:append>
                <div class="text-right">
                  <div class="token-balance">{{ token.balance }}</div>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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
  try {
    const response = await axios.get(`https://api.1inch.io/v5.0/1/address/${DEFAULT_WALLET_ADDRESS}/tokens`)
    if (response.data && response.data.tokens) {
      tokens.value = Object.values(response.data.tokens)
        .filter(token => parseFloat(token.balance) > 0)
        .map(token => ({
          ...token,
          balance: (parseFloat(token.balance) / Math.pow(10, token.decimals)).toFixed(4),
        }))
    }
  } catch (error) {
    console.error('Error fetching tokens:', error)
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

// 初始化時自動獲取代幣列表
checkWalletTokens()
</script>

<style scoped>
.swap-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
}

.nav-bar {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.nav-btn {
  color: white !important;
  font-weight: 500 !important;
  letter-spacing: 0.5px;
  margin: 0 0.5rem !important;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  transform: translateY(-2px);
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
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(255, 153, 153, 0.1);
}

.card-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  padding: 1rem 1.5rem !important;
}

.token-input-container {
  position: relative;
}

.token-select-btn {
  background: transparent !important;
  color: #333 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  padding: 0 8px !important;
  min-width: 120px !important;
  justify-content: flex-start !important;
}

.swap-form {
  position: relative;
}

.swap-arrow {
  display: flex;
  justify-content: center;
  margin: -12px 0;
  position: relative;
  z-index: 1;
}

.swap-arrow-btn {
  background: white !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  width: 40px !important;
  height: 40px !important;
}

.swap-arrow-btn:hover {
  transform: scale(1.1);
}

.swap-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  font-size: 1.1rem !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  border-radius: 12px !important;
}

.token-dialog {
  border-radius: 20px !important;
  overflow: hidden;
}

.dialog-title {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  padding: 1rem 1.5rem !important;
}

.close-btn {
  color: white !important;
}

.token-list {
  max-height: 400px;
  overflow-y: auto;
  background: transparent !important;
}

.token-list::-webkit-scrollbar {
  width: 6px;
}

.token-list::-webkit-scrollbar-track {
  background: rgba(255, 182, 193, 0.1);
  border-radius: 3px;
}

.token-list::-webkit-scrollbar-thumb {
  background: rgba(255, 182, 193, 0.5);
  border-radius: 3px;
}

.token-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 182, 193, 0.7);
}

.selected-token {
  background-color: rgba(255, 182, 193, 0.1) !important;
}

.token-name {
  font-weight: 600;
  color: #333;
  margin-left: 8px;
}

.token-balance {
  font-weight: 600;
  color: #FF6B88;
  text-align: right;
}
</style> 