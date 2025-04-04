<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Your Vault Dashboard</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium text-gray-900">Total Value Locked</h3>
          <p class="text-3xl font-bold text-primary">0.00 ETH</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium text-gray-900">Current APY</h3>
          <p class="text-3xl font-bold text-secondary">0.00%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWalletStore } from '../store/wallet'
import { useVaultStore } from '../store/vault'

const walletStore = useWalletStore()
const vaultStore = useVaultStore()
</script> 