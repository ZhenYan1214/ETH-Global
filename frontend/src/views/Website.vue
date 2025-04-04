<template>
  <div class="website-container">
    <v-container fluid>
      <div class="welcome-content">
        <div class="logo-container">
          <img src="https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png" alt="Piggy Logo" class="welcome-logo" />
        </div>
        <div class="buttons-container">
          <v-btn
            @click="showLoginDialog = true"
            size="x-large"
            class="welcome-btn get-started-btn"
            elevation="4"
          >
            Get Started
          </v-btn>
          <v-btn
            to="/home"
            size="x-large"
            class="welcome-btn enter-btn"
            elevation="4"
          >
            進入豬豬世界
          </v-btn>
        </div>

        <!-- Error message if any -->
        <div v-if="errorMessage" class="error-card">
          <div class="error-title">Something went wrong</div>
          <div class="error-content">{{ errorMessage }}</div>
        </div>
      </div>
    </v-container>

    <!-- MSCA Wallet Login/Register Dialog -->
    <v-dialog v-model="showLoginDialog" max-width="500">
      <v-card class="wallet-dialog">
        <v-card-title class="dialog-title">
          <h2>{{ isRegistering ? 'Create Your Wallet' : 'Connect Your Wallet' }}</h2>
          <v-btn icon="mdi-close" @click="showLoginDialog = false" class="close-btn"></v-btn>
        </v-card-title>
        
        <v-card-text>
          <div class="tab-container">
            <div 
              class="tab-btn" 
              :class="{ active: !isRegistering }"
              @click="isRegistering = false"
            >
              Login
            </div>
            <div 
              class="tab-btn" 
              :class="{ active: isRegistering }"
              @click="isRegistering = true"
            >
              Register
            </div>
          </div>

          <v-form @submit.prevent="connectWallet" class="login-form">
            <v-text-field
              v-model="username"
              label="Username"
              variant="outlined"
              :rules="[v => !!v || 'Username is required']"
              class="input-field"
            ></v-text-field>
            
            <p class="wallet-description">
              {{ isRegistering 
                ? 'Create a passkey-protected wallet for easy and secure access to web3.' 
                : 'Connect to your existing smart contract wallet using your passkey.' }}
            </p>

            <div v-if="walletError" class="error-message">
              {{ walletError }}
            </div>
            
            <v-btn 
              type="submit"
              :loading="isLoading"
              :disabled="!username"
              block
              class="wallet-action-btn"
            >
              {{ isRegistering ? 'Create Wallet' : 'Connect Wallet' }}
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../store/wallet'

const router = useRouter()
const showLoginDialog = ref(false)
const username = ref('')
const isRegistering = ref(false)
const isLoading = ref(false)
const walletError = ref('')
const errorMessage = ref(null)

// Try to use the wallet store
let walletStore = null
try {
  walletStore = useWalletStore()
} catch (error) {
  console.error('Failed to initialize wallet store:', error)
  errorMessage.value = `Wallet initialization error: ${error.message}`
}

// Connect wallet function
const connectWallet = async () => {
  if (!walletStore) {
    walletError.value = 'Wallet module could not be loaded'
    return
  }

  isLoading.value = true
  walletError.value = ''
  
  try {
    walletStore.usernameInput.value = username.value
    walletStore.isRegistering.value = isRegistering.value
    
    const result = await walletStore.connect()
    if (result.success) {
      showLoginDialog.value = false
      router.push('/home')
    } else {
      walletError.value = result.error || 'Failed to connect wallet'
    }
  } catch (error) {
    console.error('Error connecting wallet:', error)
    walletError.value = error.message || 'Unknown error occurred'
  } finally {
    isLoading.value = false
  }
}

// For debugging
onMounted(() => {
  console.log('Website component mounted', { walletStore: !!walletStore })
})
</script>

<style>
.website-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
  width: 100%;
}

.welcome-content {
  text-align: center;
  width: 100%;
}

.logo-container {
  margin-bottom: 2rem;
}

.welcome-logo {
  width: 200px;
  height: 200px;
  animation: float 3s ease-in-out infinite;
}

.buttons-container {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.welcome-btn {
  font-size: 1.5rem !important;
  padding: 1rem 3rem !important;
  letter-spacing: 1px !important;
  text-transform: none !important;
  transition: all 0.3s ease !important;
  color: white !important;
  border: none !important;
  border-radius: 50px !important;
  min-width: 250px !important;
}

.get-started-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
}

.enter-btn {
  background: linear-gradient(45deg, #FFB6C1, #FFC0CB) !important;
}

.welcome-btn:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 7px 14px rgba(255, 153, 153, 0.3) !important;
}

/* Error Card */
.error-card {
  margin: 20px auto;
  max-width: 600px;
  padding: 16px;
  background: rgba(255, 82, 82, 0.1);
  border-radius: 12px;
  border-left: 5px solid #FF5252;
}

.error-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #FF5252;
  margin-bottom: 8px;
}

.error-content {
  color: #333;
  font-size: 1rem;
  word-break: break-word;
}

/* Dialog Styles */
.wallet-dialog {
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}

.dialog-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(to right, #FFF5F5, #FFE0E0);
}

.dialog-title h2 {
  font-size: 1.8rem;
  color: #FF6B6B;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  color: #FF6B6B;
}

.tab-container {
  display: flex;
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #FFE0E0;
}

.tab-btn {
  flex: 1;
  text-align: center;
  padding: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  color: #777;
}

.tab-btn.active {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
}

.login-form {
  padding: 20px 0;
}

.input-field {
  margin-bottom: 16px;
}

.wallet-description {
  margin: 20px 0;
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
}

.error-message {
  color: #FF5252;
  margin-bottom: 16px;
  padding: 10px;
  background-color: rgba(255, 82, 82, 0.1);
  border-radius: 8px;
}

.wallet-action-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  font-size: 1.1rem !important;
  padding: 12px 0 !important;
  margin-top: 16px !important;
  border-radius: 12px !important;
  text-transform: none !important;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
</style> 