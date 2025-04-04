<template>
  <v-container fluid class="pa-0">
    <v-parallax
      src="https://cdn.pixabay.com/photo/2021/05/24/09/15/crypto-6278321_1280.jpg"
      height="100vh"
    >
      <v-row
        class="fill-height"
        align="center"
        justify="center"
      >
        <v-col cols="12" md="8" class="text-center">
          <h1 class="text-h2 font-weight-bold white--text mb-4">
            Welcome to <span class="text-primary">Piggy Vault</span>
          </h1>
          <p class="text-h5 white--text mb-8">
            The smart way to earn interest on your idle crypto assets. Start earning today!
          </p>
          <v-btn
            size="x-large"
            color="primary"
            variant="elevated"
            rounded
            @click="dialog = true"
          >
            Get Started
          </v-btn>
        </v-col>
      </v-row>
    </v-parallax>
    
    <!-- Login/Register Dialog -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title class="text-center text-h5 py-4">
          <span v-if="walletStore.isConnected">Wallet Connected</span>
          <span v-else>Connect Your Wallet</span>
        </v-card-title>
        
        <v-divider></v-divider>
        
        <v-card-text class="pt-4">
          <div v-if="walletStore.isConnected" class="text-center pa-4">
            <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
            <p class="text-h6 mb-2">Successfully Connected!</p>
            <p class="mb-2">Your wallet address:</p>
            <v-chip class="mb-4" color="primary" text-color="white">
              {{ walletStore.address.slice(0, 6) + '...' + walletStore.address.slice(-4) }}
            </v-chip>
            <v-btn color="error" @click="walletStore.disconnect()">Disconnect</v-btn>
          </div>
          
          <div v-else>
            <v-tabs v-model="tab" grow>
              <v-tab value="register">Register</v-tab>
              <v-tab value="login">Login</v-tab>
            </v-tabs>
            
            <v-card-text>
              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mb-4"
              >
                {{ error }}
              </v-alert>
              
              <v-alert
                v-if="success"
                type="success"
                variant="tonal"
                class="mb-4"
              >
                {{ success }}
              </v-alert>
              
              <v-text-field
                v-model="username"
                label="Username"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                :disabled="loading"
              ></v-text-field>
              
              <v-btn
                v-if="tab === 'register'"
                block
                color="primary"
                size="large"
                :loading="loading"
                @click="handleRegister"
                class="mt-4"
              >
                Register with Passkey
              </v-btn>
              
              <v-btn
                v-if="tab === 'login'"
                block
                color="primary"
                size="large"
                :loading="loading"
                @click="handleLogin"
                class="mt-4"
              >
                Login with Passkey
              </v-btn>
              
              <div class="text-center mt-4">
                <small>Using Circle's Modular Smart Contract Account (MSCA)</small>
              </div>
            </v-card-text>
          </div>
        </v-card-text>
        
        <v-divider></v-divider>
        
        <v-card-actions class="justify-end pa-4">
          <v-btn
            color="grey"
            variant="text"
            @click="dialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useWalletStore } from '../store/wallet'
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount
} from '@circle-fin/modular-wallets-core'
import {
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction'
import { createPublicClient } from 'viem'
import { polygonAmoy } from 'viem/chains'

const walletStore = useWalletStore()
const dialog = ref(false)
const tab = ref(null)
const username = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const initStatus = reactive({
  type: '',
  message: ''
})

// Get environment variables
const clientKey = import.meta.env.VITE_CLIENT_KEY
const clientUrl = import.meta.env.VITE_CLIENT_URL

async function handleRegister() {
  if (!username.value) {
    error.value = 'Please enter a username'
    return
  }
  
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    // Create Passkey Transport
    const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)
    
    // Register with a passkey
    const credential = await toWebAuthnCredential({
      transport: passkeyTransport,
      mode: 'register',
      username: username.value
    })
    
    // Create modular transport for Polygon Amoy
    const modularTransport = toModularTransport(
      `${clientUrl}/polygonAmoy`,
      clientKey
    )
    
    // Create client to connect to blockchain
    const client = createPublicClient({
      chain: polygonAmoy,
      transport: modularTransport
    })
    
    // Create a circle smart account
    const smartAccount = await toCircleSmartAccount({
      client,
      owner: toWebAuthnAccount({
        credential
      })
    })
    
    // Get wallet address and store it
    const address = smartAccount.address
    walletStore.setAddress(address)
    
    success.value = 'Registration successful!'
    dialog.value = false
  } catch (err) {
    error.value = err.message || 'Registration failed'
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function handleLogin() {
  if (!username.value) {
    error.value = 'Please enter a username'
    return
  }
  
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    // Create Passkey Transport
    const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)
    
    // Login with existing passkey
    const credential = await toWebAuthnCredential({
      transport: passkeyTransport,
      mode: 'login',
      username: username.value
    })
    
    // Create modular transport for Polygon Amoy
    const modularTransport = toModularTransport(
      `${clientUrl}/polygonAmoy`,
      clientKey
    )
    
    // Create client to connect to blockchain
    const client = createPublicClient({
      chain: polygonAmoy,
      transport: modularTransport
    })
    
    // Create a circle smart account
    const smartAccount = await toCircleSmartAccount({
      client,
      owner: toWebAuthnAccount({
        credential
      })
    })
    
    // Get wallet address and store it
    const address = smartAccount.address
    walletStore.setAddress(address)
    
    success.value = 'Login successful!'
    dialog.value = false
  } catch (err) {
    error.value = err.message || 'Login failed'
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script> 