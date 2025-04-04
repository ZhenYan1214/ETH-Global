<template>
  <div class="history-view-container">
    <!-- 使用新的導航欄組件 -->
    <NavigationBar 
      :navigationItems="navigationItems"
      :showBackButton="true"
      backRoute="/home"
      :showWallet="true"
      @logout="handleLogout"
    />

    <!-- 主要內容 -->
    <div class="content-container">
      <History />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavigationBar from '../components/NavigationBar.vue'
import History from '../components/History.vue'
import { useWalletStore } from '../store/wallet'

const walletStore = useWalletStore()

// Navigation items for the navigation bar
const navigationItems = [
  { icon: 'mdi-home', title: 'Home', route: '/home' },
  { icon: 'mdi-swap-horizontal', title: 'Swap', route: '/swap' },
]

function handleLogout() {
  console.log('User logged out from history view')
  // Handle any history-specific state reset if needed
}
</script>

<style scoped>
.history-view-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
}

.content-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  min-height: calc(100vh - 64px);
}
</style> 