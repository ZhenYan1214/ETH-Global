<template>
  <div class="home-container">
    <!-- 使用新的導航欄組件 -->
    <NavigationBar 
      :navigationItems="navigationItems"
      :showWallet="true"
      @toggle-wallet="showWalletInfo = !showWalletInfo"
      @logout="handleLogout"
    />

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
          <h2 class="balance-amount">{{ walletStore.isConnected ? walletStore.balance + ' ETH' : '0.00 ETH' }}</h2>
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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavigationBar from '../components/NavigationBar.vue'
import { useWalletStore } from '../store/wallet'

const walletStore = useWalletStore()

// Navigation items for the navigation bar
const navigationItems = [
  { icon: 'mdi-swap-horizontal', title: 'Swap', route: '/swap' },
  { icon: 'mdi-history', title: 'History', route: '/history' }
]

const showWalletInfo = ref(false)

function openPiggyBank() {
  console.log('Opening piggy bank...')
}

function handleLogout() {
  console.log('User logged out')
  showWalletInfo.value = false
  // Handle any additional cleanup needed after logout
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
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

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style> 