<template>
  <div class="home-container">
    <!-- 頂部導航欄 -->
    <v-app-bar class="nav-bar">
      <v-spacer></v-spacer>
      <v-btn @click="showSwap = true" class="nav-btn" variant="text">
        <v-icon left>mdi-swap-horizontal</v-icon>
        Swap
      </v-btn>
      <v-btn @click="showHistory = true" class="nav-btn" variant="text">
        <v-icon left>mdi-history</v-icon>
        History
      </v-btn>
    </v-app-bar>

    <!-- 主要內容 -->
    <div class="content-container">
      <div class="piggy-bank-section">
        <!-- 豬豬 Logo -->
        <div class="logo-container">
          <img src="https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png" alt="Piggy Logo" class="piggy-logo" />
        </div>

        <!-- 餘額顯示 -->
        <div class="balance-display">
          <p class="balance-label">總資產</p>
          <h2 class="balance-amount">0.00 ETH</h2>
          <p class="apy-info">年化收益率: <span class="apy-value">5.5%</span></p>
        </div>

        <!-- 豬豬金庫按鈕 -->
        <v-btn
          class="piggy-bank-btn"
          size="x-large"
          elevation="4"
          @click="openPiggyBank"
        >
          <v-icon size="32" class="mr-2">mdi-piggy-bank</v-icon>
          豬豬金庫
        </v-btn>
      </div>
    </div>

    <!-- Swap 對話框 -->
    <v-dialog v-model="showSwap" width="500" class="dialog-container">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">
          <span class="text-h5">
            <v-icon left>mdi-swap-horizontal</v-icon>
            Swap Tokens
          </span>
          <v-spacer></v-spacer>
          <v-btn icon @click="showSwap = false" class="close-btn">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <v-text-field
            label="From"
            variant="outlined"
            class="mb-4"
            hide-details
          ></v-text-field>
          <v-text-field
            label="To"
            variant="outlined"
            hide-details
          ></v-text-field>
          <v-btn
            block
            class="swap-btn mt-6"
            size="large"
            elevation="2"
          >
            Swap Now
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- History 對話框 -->
    <v-dialog v-model="showHistory" width="800" class="dialog-container">
      <History @close="showHistory = false" />
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import History from '../components/History.vue'

const showSwap = ref(false)
const showHistory = ref(false)

function openPiggyBank() {
  // 實現豬豬金庫的功能
  console.log('Opening piggy bank...')
}
</script>

<style scoped>
.home-container {
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
  align-items: center;
  min-height: calc(100vh - 64px);
  padding: 2rem;
}

.piggy-bank-section {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.logo-container {
  margin-bottom: 2rem;
}

.piggy-logo {
  width: 150px;
  height: 150px;
  animation: bounce 2s infinite;
}

.balance-display {
  margin-bottom: 2rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(255, 153, 153, 0.1);
}

.balance-label {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.balance-amount {
  font-size: 3rem;
  color: #FF6B88;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.apy-info {
  font-size: 1.1rem;
  color: #666;
}

.apy-value {
  color: #FF6B88;
  font-weight: 600;
}

.piggy-bank-btn {
  font-size: 1.8rem !important;
  padding: 1.5rem 4rem !important;
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  border-radius: 50px !important;
  transition: all 0.3s ease !important;
  text-transform: none !important;
  min-width: 300px !important;
}

.piggy-bank-btn:hover {
  transform: scale(1.05) !important;
  box-shadow: 0 10px 20px rgba(255, 153, 153, 0.3) !important;
}

.dialog-container {
  border-radius: 20px;
  overflow: hidden;
}

.dialog-card {
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

.swap-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  font-size: 1.1rem !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  border-radius: 12px !important;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style> 