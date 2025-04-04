<template>
  <div class="swap-container">
    <!-- 使用新的導航欄組件 -->
    <NavigationBar 
      :navigationItems="navigationItems"
      :showBackButton="true"
      backRoute="/home"
      :showWallet="true"
      :tokens="tokens"
      @logout="handleLogout"
    />

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
            <!-- 添加標題行 -->
            <v-list-item class="token-list-header">
              <div class="d-flex w-100">
                <div class="token-column">Token</div>
                <div class="balance-column">餘額 (價格)</div>
              </div>
            </v-list-item>
            
            <!-- 代幣列表項 -->
            <v-list-item
              v-for="token in tokens"
              :key="token.address"
              @click="selectFromToken(token)"
              class="token-list-item"
              :class="{ 'selected': selectedFromToken?.address === token.address }"
            >
              <div class="d-flex justify-space-between align-center w-100">
                <span class="token-address">{{ token.address.substring(0, 8) }}...</span>
                <span class="token-balance">{{ token.balance }} (${{ token.price }})</span>
              </div>
            </v-list-item>
          </v-list>
          <div v-else-if="errorMessage" class="text-center pa-4 text-error">
            {{ errorMessage }}
          </div>
          <div v-else-if="!isLoading" class="text-center pa-4">
            沒有找到代幣，請稍後再試
          </div>
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
            <!-- 添加標題行 -->
            <v-list-item class="token-list-header">
              <div class="d-flex w-100">
                <div class="token-column">Token</div>
                <div class="balance-column">餘額 (價格)</div>
              </div>
            </v-list-item>
            
            <!-- 代幣列表項 -->
            <v-list-item
              v-for="token in tokens"
              :key="token.address"
              @click="selectToToken(token)"
              class="token-list-item"
              :class="{ 'selected': selectedToToken?.address === token.address }"
            >
              <div class="d-flex justify-space-between align-center w-100">
                <span class="token-address">{{ token.address.substring(0, 8) }}...</span>
                <span class="token-balance">{{ token.balance }} (${{ token.price }})</span>
              </div>
            </v-list-item>
          </v-list>
          <div v-else-if="errorMessage" class="text-center pa-4 text-error">
            {{ errorMessage }}
          </div>
          <div v-else-if="!isLoading" class="text-center pa-4">
            沒有找到代幣，請稍後再試
          </div>
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
import NavigationBar from '../components/NavigationBar.vue'

// Navigation items for the navigation bar
const navigationItems = [
  { icon: 'mdi-history', title: 'History', route: '/history' }
]

const isLoading = ref(false)
const tokens = ref([])
const fromAmount = ref('')
const toAmount = ref('')
const showFromTokenList = ref(false)
const showToTokenList = ref(false)
const selectedFromToken = ref(null)
const selectedToToken = ref(null)
const errorMessage = ref('')

const DEFAULT_WALLET_ADDRESS = "0x4EC7a00D26d392e1B29e6b7fA0199D5849A1459d"

async function checkWalletTokens() {
  isLoading.value = true;
  tokens.value = [];
  errorMessage.value = '';

  try {
    console.log("開始獲取代幣列表...");
    const balanceUrl = `http://localhost:3011/wallet/balances/137/${DEFAULT_WALLET_ADDRESS}`;
    console.log("Balance API URL:", balanceUrl);

    const balanceResponse = await axios.get(balanceUrl);
    console.log("完整的餘額 API 響應:", balanceResponse.data);

    if (!balanceResponse.data.balances) {
      console.error("API 響應中沒有 balances 字段:", balanceResponse.data);
      errorMessage.value = '無法獲取代幣列表：數據格式不正確';
      return;
    }

    const filteredTokens = balanceResponse.data.balances.filter(token => {
      const balance = parseFloat(token.balance);
      console.log(`代幣 ${token.token} 的餘額:`, balance);
      return balance > 0;
    });

    if (filteredTokens.length === 0) {
      console.log("沒有找到餘額大於 0 的代幣");
      errorMessage.value = '沒有找到任何代幣';
      return;
    }

    // 獲取價格
    const tokenAddresses = filteredTokens.map(token => token.token).join(",");
    const priceUrl = `http://localhost:3011/wallet/prices/137/${tokenAddresses}`;
    console.log("Price API URL:", priceUrl);
    const priceResponse = await axios.get(priceUrl);
    console.log("價格 API 響應:", priceResponse.data);

    tokens.value = filteredTokens.map(token => ({
      address: token.token,
      balance: parseFloat(token.balance).toFixed(4),
      price: priceResponse.data[token.token] || "0.00",
    }));

    console.log("最終的代幣列表:", tokens.value);
  } catch (error) {
    console.error("獲取代幣時出錯:", error);
    if (error.response) {
      console.error("錯誤響應:", error.response.data);
      console.error("錯誤狀態:", error.response.status);
      errorMessage.value = `無法獲取代幣列表：${error.response.status} ${error.response.data.error || ''}`;
    } else if (error.request) {
      console.error("沒有收到響應:", error.request);
      errorMessage.value = '無法連接到伺服器，請檢查後端是否運行';
    } else {
      console.error("請求配置錯誤:", error.message);
      errorMessage.value = `請求錯誤：${error.message}`;
    }
  } finally {
    isLoading.value = false;
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

function handleLogout() {
  console.log('User logged out')
  // Reset any swap-specific state if needed
  selectedFromToken.value = null
  selectedToToken.value = null
  fromAmount.value = ''
  toAmount.value = ''
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

.text-error {
  color: #ff5252;
  font-weight: 500;
}

.token-list-header {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #666;
  border-bottom: 1px solid #e0e0e0;
}

.token-address {
  font-family: monospace;
  font-size: 14px;
  color: #333;
}

.token-balance {
  font-weight: 500;
  color: #666;
}

.token-column {
  flex: 2;
  font-weight: 600;
  color: #666;
}

.balance-column {
  flex: 1;
  text-align: right;
  font-weight: 600;
  color: #666;
}

.token-list-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.token-list-item:hover {
  background-color: #f5f5f5;
}

.token-list-item.selected {
  background-color: #e3f2fd;
}
</style> 