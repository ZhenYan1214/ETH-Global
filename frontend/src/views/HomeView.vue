<!-- HomeView.vue -->
<template>
  <div class="home-container">
    <!-- 背景裝飾 -->
    <div class="background-decoration"></div>
    <div class="particles-container"></div>

    <!-- 頂部導航欄 -->
    <v-app-bar class="nav-bar" elevation="0">
      <div class="logo-container">
        <img src="@/assets/logo.png" alt="Piggy Logo" class="piggy-logo" />
        <span class="logo-text">Piggy Bank</span>
      </div>
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
      </div>
    </v-app-bar>

    <!-- 主要內容區域 -->
    <div class="main-content">
      <div class="content-card">
        <h1 class="main-title">
          Welcome to Your <span class="highlight">Piggy Vault!</span>
        </h1>
        <p class="sub-title">
          Assets in Vault: <span class="balance-amount">{{ vaultBalance }} USDC</span>
        </p>
        <div class="buttons-container">
          <v-btn class="start-deposit-btn" elevation="0" @click="openPiggyBank">
            Deposit
          </v-btn>
          <v-btn class="start-Withdrawals-btn" elevation="0" @click="openWithdraw">
            Withdraw
          </v-btn>
        </div>
      </div>
    </div>

    <!-- 場景容器 -->
    <div class="scene-container">
      <img src="@/assets/newPig.gif" alt="Piggy Scene" class="scene-image" />
    </div>

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

    <!-- 其他對話框和按鈕 -->
    <v-btn class="feedback-btn" icon elevation="0" @click="openFeedbackModal">
      <v-icon>mdi-message-outline</v-icon>
    </v-btn>

    <!-- Feedback Modal -->
    <div v-if="showFeedbackModal" class="feedback-modal">
      <div class="feedback-content">
        <div v-if="!showThankYou && !showCommentInput" class="modal-header">
          <h3>Help Us Make Piggy Vault Better! 🐷</h3>
          <p class="modal-description">Your feedback is important to us. Please share your thoughts!</p>
        </div>

        <div v-if="!showThankYou && !showCommentInput" class="feedback-options">
          <button class="feedback-option" @click="submitFeedback('like')">
            <span class="option-icon">👍</span>
            <span class="option-text">I Like It</span>
          </button>
          <button class="feedback-option" @click="submitFeedback('dislike')">
            <span class="option-icon">👎</span>
            <span class="option-text">I Don't Like It</span>
          </button>
          <button class="feedback-option" @click="showCommentForm">
            <span class="option-icon">💭</span>
            <span class="option-text">I Want to Say Something</span>
          </button>
        </div>

        <div v-if="showCommentInput" class="comment-section">
          <textarea
            v-model="feedbackText"
            class="feedback-textarea"
            placeholder="Tell us what you think..."
          ></textarea>
          <button class="submit-btn" @click="submitComment">Submit</button>
        </div>

        <div v-if="showThankYou" class="thank-you-message">
          <div class="thank-you-icon">{{ thankYouIcon }}</div>
          <p>{{ thankYouText }}</p>
        </div>

        <button class="close-modal" @click="closeFeedbackModal">&times;</button>
      </div>
    </div>

    <History :show="showHistory" @update:show="showHistory = $event" />
    
    <!-- 添加 4626list 對話框 -->
    <TokenList4626 
      v-model="show4626List"
      @select="handleTokenSelect"
    />

    <!-- 添加提款對話框 -->
    <Withdraw 
      :visible="showWithdraw" 
      @update:visible="showWithdraw = $event"
      @confirm="handleWithdrawConfirm"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import History from '../components/History.vue'
import TokenList4626 from '../components/4626list.vue'
import Withdraw from '../components/withdraw.vue'
import { useWalletStore } from '../store/wallet'
import { useRouter } from 'vue-router'

const walletStore = useWalletStore()
const router = useRouter()
const showHistory = ref(false)
const showWalletInfo = ref(false)
const showFeedbackModal = ref(false)
const show4626List = ref(false)
const showWithdraw = ref(false)
const vaultBalance = ref('0.00')
const showThankYou = ref(false)
const showCommentInput = ref(false)
const feedbackText = ref('')
const thankYouIcon = ref('')
const thankYouText = ref('')

const feedbackOptions = [
  { type: 'like', emoji: '👍', text: 'I Like Something' },
  { type: 'dislike', emoji: '👎', text: 'I Don\'t Like Something' },
  { type: 'idea', emoji: '💡', text: 'I Have an Idea' },
  { type: 'bug', emoji: '🐛', text: 'I Found a Bug' }
]

const canSubmit = computed(() => {
  return selectedOption.value && feedbackText.value.trim().length > 0
})

async function updateVaultBalance() {
  if (walletStore.isConnected) {
    try {
      const balance = await walletStore.getUserVaultWithdrawable()
      // Convert balance from BigInt to string with proper decimal places
      vaultBalance.value = (Number(balance) / 1e6).toFixed(2) // USDC has 6 decimals
    } catch (error) {
      console.error('Error fetching vault balance:', error)
      vaultBalance.value = '0.00'
    }
  }
}

// Add watcher for wallet connection status
watch(() => walletStore.isConnected, async (newValue) => {
  if (newValue) {
    await updateVaultBalance()
  } else {
    vaultBalance.value = '0.00'
  }
})

function openPiggyBank() {
  show4626List.value = true
}

function openWithdraw() {
  showWithdraw.value = true
}

function handleWithdrawConfirm() {
  // 處理提款確認後的邏輯
  console.log('Withdrawal confirmed')
  showWithdraw.value = false
}

function handleNavClick(item) {
  console.log('handleNavClick called with:', item)
  if (item.action === 'history') {
    showHistory.value = true
  } else if (item.route) {
    router.push(item.route)
  }
}

// Feedback modal functions
const openFeedbackModal = () => {
  showFeedbackModal.value = true
  showThankYou.value = false
  showCommentInput.value = false
  feedbackText.value = ''
}

const closeFeedbackModal = () => {
  showFeedbackModal.value = false
  showThankYou.value = false
  showCommentInput.value = false
  feedbackText.value = ''
}

const showCommentForm = () => {
  showCommentInput.value = true
}

const submitFeedback = (type) => {
  if (type === 'like') {
    thankYouIcon.value = '🥰'
    thankYouText.value = 'Your like is our motivation, thank you!'
  } else if (type === 'dislike') {
    thankYouIcon.value = '🙏'
    thankYouText.value = 'Thank you for your valuable feedback!'
  }
  showThankYou.value = true
  
  // 這裡可以加入發送反饋到後端的邏輯
  setTimeout(() => {
    closeFeedbackModal()
  }, 1000)
}

const submitComment = () => {
  if (feedbackText.value.trim()) {
    thankYouIcon.value = '🙏'
    thankYouText.value = 'Thank you for your valuable feedback!'
    showThankYou.value = true
    showCommentInput.value = false
    
    // 這裡可以加入發送反饋到後端的邏輯
    setTimeout(() => {
      closeFeedbackModal()
    }, 1000)
  }
}

function handleTokenSelect(token) {
  console.log('Selected token:', token)
  // 這裡可以添加選擇代幣後的處理邏輯
}

onMounted(async () => {
  createParticles()
  await updateVaultBalance()
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
  position: relative;
  z-index: 2;
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0; 
}

.content-card {
  width: 100%;
  max-width: 960px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transform: scale(0.9);
  margin-top: -20px;
}

.main-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 33px;
  color: #2D2D2D;
  margin-bottom: 14px;
}

.highlight {
  color: #FF6F91;
  position: relative;
  display: inline-block;
}

.balance-amount {
  font-size: 2.7rem;
  color: #FF6B88;
  font-weight: 700;
  display: block;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.sub-title {
  font-size: 1.26rem;
  color: #2D2D2D;
  margin-bottom: 22px;
  font-weight: 500;
}

.buttons-container {
  display: flex;
  justify-content: center;
  gap: 36px;
  margin-top: 18px;
}

.start-deposit-btn {
  width: 288px !important;
  height: 65px !important;
  font-size: 25px !important;
  font-weight: 700 !important;
  color: white !important;
  background: linear-gradient(45deg, #FF6F91, #FF8DA1) !important;
  border-radius: 36px !important;
  transition: all 0.3s ease !important;
  margin-right: 20px;
}

.start-deposit-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 111, 145, 0.3) !important;
}

.start-Withdrawals-btn {
  width: 288px !important;
  height: 65px !important;
  font-size: 25px !important;
  font-weight: 700 !important;
  color: white !important;
  background: linear-gradient(45deg, #f4305e, #FF8DA1) !important;
  border-radius: 36px !important;
  transition: all 0.3s ease !important;
  margin-left: 20px;
}

.start-Withdrawals-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 111, 145, 0.3) !important;
}

.piggy-section {
  width: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  margin-top: -10px;
}

.piggy-container {
  position: relative;
}

.piggy-gif {
  width: 240px;
  height: 240px;
  filter: drop-shadow(0 2px 4px rgba(255, 111, 145, 0.2));
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
  width: 100%;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 0;
  position: fixed;
  bottom: 0;
  left: 0;
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
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  z-index: 100 !important;
  width: 48px !important;
  height: 48px !important;
  border-radius: 50% !important;
  transition: all 0.3s ease !important;
}

.feedback-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: translateY(-2px);
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.scene-container {
  position: fixed;
  bottom: 60px;
  left: 0;
  width: 100vw;
  height: calc(100vh - 60px);
  z-index: 1;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  margin: 0;
  padding: 0;
}

.scene-image {
  width: 100vw;
  height: auto;
  object-fit: contain;
  max-height: calc(100vh - 60px);
  margin: 0;
  padding: 0;
  display: block;
}

.feedback-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.feedback-content {
  background: white;
  padding: 32px;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.modal-header h3 {
  font-size: 24px;
  color: #2D2D2D;
  margin-bottom: 8px;
}

.modal-header .modal-description {
  color: #666;
  font-size: 16px;
}

.feedback-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-option {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #F8F9FA;
  border: 1px solid #E9ECEF;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feedback-option:hover {
  background: #FFF5F7;
  border-color: #FF6F91;
  transform: translateY(-2px);
}

.option-icon {
  font-size: 24px;
  margin-right: 12px;
}

.option-text {
  font-size: 16px;
  color: #2D2D2D;
}

.close-modal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: #F8F9FA;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-modal:hover {
  background: #FFF5F7;
  color: #FF6F91;
}

.comment-section {
  margin-top: 20px;
}

.feedback-textarea {
  width: 100%;
  height: 120px;
  padding: 12px;
  border: 1px solid #E9ECEF;
  border-radius: 12px;
  resize: none;
  font-size: 16px;
  margin-bottom: 16px;
  transition: border-color 0.3s ease;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #FF6F91;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #FF6F91;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-btn:hover {
  background: #FF8DA1;
  transform: translateY(-2px);
}

.thank-you-message {
  text-align: center;
  padding: 20px;
}

.thank-you-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.thank-you-message p {
  font-size: 18px;
  color: #2D2D2D;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .feedback-content {
    width: 95%;
    padding: 24px;
    margin: 10px;
  }

  .modal-header h3 {
    font-size: 20px;
  }

  .modal-header .modal-description {
    font-size: 14px;
  }

  .feedback-option {
    padding: 12px;
  }
}
</style>