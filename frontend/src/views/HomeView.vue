<template>
  <div class="home-container">
    <!-- 背景裝飾 -->
    <div class="background-decoration"></div>
    <div class="particles-container"></div>

    <!-- 頂部導航欄 - 保留原有功能並使用新設計 -->
    <v-app-bar class="nav-bar" elevation="0">
      <!-- Logo 區域 -->
      <div class="logo-container">
        <img src="https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png" alt="Piggy Logo" class="piggy-logo" />
        <span class="logo-text">Piggy Bank</span>
      </div>

      <!-- 導航按鈕 - 整合原有功能 -->
      <v-spacer></v-spacer>
      <div class="nav-buttons">
        <v-btn to="/swap" class="nav-btn" elevation="0" @click="handleNavClick({route: '/swap'})">
          <v-icon class="nav-icon">mdi-swap-horizontal</v-icon>
          Swap
        </v-btn>
        <v-btn class="nav-btn" elevation="0" @click="handleNavClick({action: 'history'})">
          <v-icon class="nav-icon">mdi-history</v-icon>
          History
        </v-btn>
        <!-- 錢包按鈕 -->
        <v-btn class="nav-btn wallet-btn" elevation="0" @click="showWalletInfo = !showWalletInfo">
          <v-icon class="nav-icon">mdi-wallet</v-icon>
          {{ walletStore.isConnected ? walletStore.shortAddress : '連接錢包' }}
        </v-btn>
      </div>
    </v-app-bar>

    <!-- 主要內容區域 -->
    <div class="main-content">
      <div class="content-card">
        <h1 class="main-title">
          Welcome to Your <span class="highlight">Piggy Vault!</span>
        </h1>
        <p class="sub-title">
          總資產: <span class="balance-amount">{{ walletStore.isConnected ? walletStore.balance + ' ETH' : '0.00 ETH' }}</span>
        </p>
        <p class="apy-info">年化收益率: <span class="apy-value">5.5%</span></p>
        <v-btn
          class="start-deposit-btn"
          elevation="0"
          @click="openPiggyBank"
        >
          開始存款！！
        </v-btn>
      </div>

      <!-- 豬豬區域 -->
      <div class="piggy-section">
        <div class="piggy-container">
          <img src="@/assets/homePig.gif" alt="Piggy Main" class="piggy-gif" />
          <div class="ground-shadow"></div>
        </div>
      </div>
    </div>

    <!-- 背景圖片 -->
    <div class="background-image"></div>

    <!-- 頁腳 -->
    <footer class="footer">
      <div class="social-icons">
        <v-btn icon class="social-icon" elevation="0">
          <v-icon>mdi-twitter</v-icon>
        </v-btn>
        <v-btn icon class="social-icon" elevation="0">
          <v-icon>mdi-github</v-icon>
        </v-btn>
        <v-btn icon class="social-icon" elevation="0">
          <v-icon>mdi-instagram</v-icon>
        </v-btn>
      </div>
    </footer>

    <!-- 反饋按鈕 -->
    <v-btn class="feedback-btn" fab @click="openFeedback">
      <v-icon>mdi-message-outline</v-icon>
    </v-btn>

    <!-- 反饋對話框 -->
    <v-dialog v-model="showFeedback" max-width="480">
      <v-card class="feedback-dialog">
        <v-card-title class="feedback-title">
          We'd Love Your Feedback!
        </v-card-title>
        <v-card-text>
          <v-btn
            v-for="(option, index) in feedbackOptions"
            :key="index"
            class="feedback-option"
            block
            @click="submitFeedback(option)"
          >
            {{ option }}
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 保留原有的 History 對話框 -->
    <History :show="showHistory" @update:show="showHistory = $event" />
    
    <!-- 添加 4626list 對話框 -->
    <TokenList4626 
      v-model="show4626List"
      @select="handleTokenSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import History from '../components/History.vue'
import TokenList4626 from '../components/4626list.vue'
import { useWalletStore } from '../store/wallet'
import { useRouter } from 'vue-router'

const walletStore = useWalletStore()
const router = useRouter()
const showHistory = ref(false)
const showWalletInfo = ref(false)
const showFeedback = ref(false)
const show4626List = ref(false)

const feedbackOptions = [
  'I Like Something',
  'I Don\'t Like Something',
  'I Have an Idea'
]

function openPiggyBank() {
  show4626List.value = true
}

function handleNavClick(item) {
  console.log('handleNavClick called with:', item)
  if (item.action === 'history') {
    showHistory.value = true
  } else if (item.route) {
    router.push(item.route)
  }
}

function openFeedback() {
  showFeedback.value = true
}

function submitFeedback(option) {
  console.log('Feedback submitted:', option)
  showFeedback.value = false
}

function handleTokenSelect(token) {
  console.log('Selected token:', token)
  // 這裡可以添加選擇代幣後的處理邏輯
}

onMounted(() => {
  createParticles()
})

function createParticles() {
  const container = document.querySelector('.particles-container')
  if (container) {
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.left = `${Math.random() * 100}%`
      particle.style.animationDelay = `${Math.random() * 5}s`
      container.appendChild(particle)
    }
  }
}
</script>

<style scoped>
/* 保留原有樣式並添加新的樣式 */
.home-container {
  height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #E6F0FA 0%, #FFDDE5 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%);
  background-size: 100px 100px;
  opacity: 0.1;
  pointer-events: none;
}

.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #FFD700;
  border-radius: 50%;
  opacity: 0.6;
  animation: particleFloat 10s infinite linear;
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) rotate(0deg);
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
  }
}

.nav-bar {
  height: 64px !important;
  padding: 0 40px !important;
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid;
  border-image: linear-gradient(90deg, #FF6F91, #FF8DA1) 1;
  position: relative;
  z-index: 10;
}

.logo-container {
  display: flex;
  align-items: center;
}

.piggy-logo {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  transition: transform 0.3s ease;
}

.logo-text {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 24px;
  color: #2D2D2D;
}

.nav-buttons {
  display: flex;
  gap: 24px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.5) !important;
  border-radius: 24px !important;
  padding: 0 24px !important;
  height: 48px !important;
  font-weight: 500 !important;
  font-size: 16px !important;
  color: #2D2D2D !important;
  transition: all 0.3s ease !important;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.8) !important;
  color: #FF6F91 !important;
  transform: translateY(-2px);
}

.wallet-btn {
  background: linear-gradient(45deg, #FF6F91, #FF8DA1) !important;
  color: white !important;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  position: relative;
  z-index: 10;
  max-height: calc(100vh - 164px);
}

.content-card {
  width: 100%;
  max-width: 1200px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 32px;
  padding: 32px;
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.main-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 42px;
  color: #2D2D2D;
  margin-bottom: 16px;
}

.highlight {
  color: #FF6F91;
  position: relative;
  display: inline-block;
}

.balance-amount {
  font-size: 3rem;
  color: #FF6B88;
  font-weight: 700;
  margin: 0.5rem 0;
  display: block;
}

.apy-info {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 24px;
}

.apy-value {
  color: #FF6B88;
  font-weight: 600;
}

.start-deposit-btn {
  width: 320px !important;
  height: 72px !important;
  font-weight: 700 !important;
  font-size: 28px !important;
  color: white !important;
  background: linear-gradient(45deg, #FF6F91, #FF8DA1) !important;
  border-radius: 36px !important;
  transition: all 0.3s ease !important;
}

.start-deposit-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 111, 145, 0.3) !important;
}

.piggy-section {
  width: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  margin-top: auto;
}

.piggy-container {
  position: relative;
  margin-bottom: 20px;
}

.piggy-gif {
  width: 240px;
  height: 240px;
  filter: drop-shadow(0 2px 4px rgba(255, 111, 145, 0.2));
  animation: bounce 2s infinite;
}

.ground-shadow {
  position: absolute;
  bottom: -20px;
  width: 320px;
  height: 40px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 70%);
  border-radius: 50%;
}

.footer {
  height: 60px;
  background: #FF8DA1;
  padding: 10px 0;
  position: relative;
  width: 100%;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
}

.social-icons {
  display: flex;
  gap: 24px;
}

.social-icon {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}

.feedback-btn {
  position: fixed !important;
  bottom: 80px !important;
  right: 40px !important;
  background: linear-gradient(45deg, #FF6F91, #FF8DA1) !important;
  color: white !important;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 背景圖片樣式 */
.background-image {
  position: absolute;
  bottom: 130px;
  left: 0;
  width: 100%;
  height: 200px;
  background-image: url('@/assets/BG1.webp');
  background-repeat: no-repeat;
  background-position: bottom center;
  background-size: cover;
  z-index: 1;
}
</style> 