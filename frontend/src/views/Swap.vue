<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Swap Tokens</h2>
      <div class="max-w-md mx-auto">
        <div class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <label class="block text-sm font-medium text-gray-700">From</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                class="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="0.0"
              />
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <label class="block text-sm font-medium text-gray-700">To</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                class="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="0.0"
              />
            </div>
          </div>
          <button
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Swap
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWalletStore } from '../store/wallet'

const walletStore = useWalletStore()
</script> 