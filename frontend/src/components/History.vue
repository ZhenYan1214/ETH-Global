<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Transaction History</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <!-- 示例交易記錄 -->
            <tr v-for="(transaction, index) in transactions" :key="index">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ transaction.date }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ transaction.type }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ transaction.amount }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(transaction.status)">
                  {{ transaction.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 示例數據
const transactions = ref([
  {
    date: '2024-03-15',
    type: 'Deposit',
    amount: '0.5 ETH',
    status: 'Completed'
  },
  {
    date: '2024-03-14',
    type: 'Withdraw',
    amount: '0.2 ETH',
    status: 'Pending'
  },
  {
    date: '2024-03-13',
    type: 'Swap',
    amount: '100 USDC',
    status: 'Failed'
  }
])

const getStatusClass = (status) => {
  const classes = 'px-2 py-1 text-xs font-medium rounded-full '
  switch (status) {
    case 'Completed':
      return classes + 'bg-green-100 text-green-800'
    case 'Pending':
      return classes + 'bg-yellow-100 text-yellow-800'
    case 'Failed':
      return classes + 'bg-red-100 text-red-800'
    default:
      return classes + 'bg-gray-100 text-gray-800'
  }
}
</script>

<style scoped>
.min-w-full {
  min-width: 100%;
}
</style> 