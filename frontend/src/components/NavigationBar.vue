<template>
  <v-app-bar class="nav-bar">
    <!-- Left side: Show back button if showBackButton prop is true -->
    <template v-if="showBackButton">
      <v-btn :to="backRoute" class="nav-btn" variant="text" prepend-icon="mdi-arrow-left">
        Back
      </v-btn>
    </template>
    
    <!-- Chain ID and Total Value Display -->
    <div v-if="showWallet" class="wallet-info">
      <span class="chain-info">Chain ID: {{ chainId }}</span>
      <span class="value-info">${{ totalValue.toFixed(2) }}</span>
    </div>
    
    <!-- Spacer for flexible layout -->
    <v-spacer></v-spacer>
    
    <!-- Middle/Right side navigation buttons -->
    <v-btn 
      v-for="item in navigationItems" 
      :key="item.title"
      class="nav-btn" 
      variant="text"
      :prepend-icon="item.icon"
      @click="handleItemClick(item)"
    >
      {{ item.title }}
    </v-btn>
    
    <!-- Right side: Show wallet if showWallet prop is true -->
    <div v-if="showWallet">
      <v-menu 
        v-if="walletStore.isConnected" 
        location="bottom end"
        :close-on-content-click="true"
        :scrim="false"
        transition="scale-transition"
      >
        <template v-slot:activator="{ props: menuProps }">
          <v-btn 
            class="wallet-btn" 
            variant="text" 
            v-bind="menuProps"
            prepend-icon="mdi-wallet"
            append-icon="mdi-chevron-down"
          >
            {{ formatAddress(walletStore.address) }}
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="toggleWalletInfo">
            <v-list-item-title>Wallet Details</v-list-item-title>
          </v-list-item>
          <v-list-item @click="logout">
            <v-list-item-title color="error">Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      
      <v-btn v-else class="wallet-btn" variant="text" @click="connect" prepend-icon="mdi-wallet">
        Connect
      </v-btn>
    </div>
  </v-app-bar>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue'
import { useWalletStore } from '../store/wallet'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
  // Navigation items array with icon, title, and route for each
  navigationItems: {
    type: Array,
    default: () => []
  },
  // Whether to show the back button
  showBackButton: {
    type: Boolean,
    default: false
  },
  // Route for back button
  backRoute: {
    type: String,
    default: '/home'
  },
  // Whether to show wallet information
  showWallet: {
    type: Boolean,
    default: false
  },
  // Tokens data for calculating total value
  tokens: {
    type: Array,
    default: () => []
  }
})

const walletStore = useWalletStore()
const chainId = ref(137) // Chain ID for Polygon
const totalValue = ref(0) // Total value of all tokens

// Watch for changes in tokens and calculate total value
watch(
  () => props.tokens,
  (newTokens) => {
    if (newTokens && newTokens.length > 0) {
      totalValue.value = newTokens.reduce((sum, token) => {
        const balance = parseFloat(token.balance)
        const price = parseFloat(token.price)
        return sum + (balance * price)
      }, 0)
    } else {
      totalValue.value = 0
    }
  },
  { immediate: true }
)

// Format wallet address to show only first and last characters
function formatAddress(address) {
  if (!address) return 'Connect'
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

// Function to connect wallet
function connect() {
  // Redirect to website page for connecting wallet
  router.push('/')
}

// Function to logout/disconnect wallet
function logout() {
  walletStore.disconnect()
  emit('logout')
  // Optional: redirect to home page or show notification
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
}

// Function to emit wallet toggle event
function toggleWalletInfo() {
  emit('toggle-wallet')
}

// Emit events to parent components
const emit = defineEmits(['toggle-wallet', 'logout', 'nav-click'])

function handleItemClick(item) {
  console.log('Navigation item clicked:', item)
  emit('nav-click', item)
}
</script>

<style scoped>
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

.wallet-btn {
  color: white !important;
  font-weight: 600 !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  padding: 0 16px !important;
  margin-left: 12px !important;
  transition: all 0.3s ease;
}

.wallet-btn:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-2px);
}

.wallet-info {
  display: flex;
  align-items: center;
  color: white;
  font-weight: 500;
  margin-left: 16px;
}

.chain-info {
  margin-right: 12px;
  font-size: 14px;
}

.value-info {
  font-size: 14px;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
}
</style> 