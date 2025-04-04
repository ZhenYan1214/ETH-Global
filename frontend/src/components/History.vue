<template>
  <v-card class="history-dialog">
    <v-card-title class="dialog-title">
      <div class="d-flex align-center">
        <img src="https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png" alt="Piggy Logo" class="dialog-logo mr-2" />
        <span class="text-h5 font-weight-medium">Transaction History</span>
      </div>
      <v-spacer></v-spacer>
      <v-btn icon @click="$emit('close')" class="close-btn">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text class="pa-4">
      <v-table>
        <thead>
          <tr>
            <th class="text-left table-header">Date</th>
            <th class="text-left table-header">Type</th>
            <th class="text-left table-header">Amount</th>
            <th class="text-left table-header">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(transaction, index) in transactions" :key="index" class="transaction-row">
            <td>{{ transaction.date }}</td>
            <td>
              <v-chip :color="getTypeColor(transaction.type)" size="small" class="type-chip">
                {{ transaction.type }}
              </v-chip>
            </td>
            <td>{{ transaction.amount }}</td>
            <td>
              <v-chip
                :color="getStatusColor(transaction.status)"
                size="small"
                :text-color="getStatusTextColor(transaction.status)"
                class="status-chip"
              >
                {{ transaction.status }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
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

const getTypeColor = (type) => {
  switch (type) {
    case 'Deposit':
      return 'pink-lighten-4'
    case 'Withdraw':
      return 'pink-lighten-3'
    case 'Swap':
      return 'pink-lighten-2'
    default:
      return 'pink-lighten-4'
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Completed':
      return 'success-lighten-4'
    case 'Pending':
      return 'warning-lighten-4'
    case 'Failed':
      return 'error-lighten-4'
    default:
      return 'grey-lighten-4'
  }
}

const getStatusTextColor = (status) => {
  switch (status) {
    case 'Completed':
      return 'success'
    case 'Pending':
      return 'warning-darken-2'
    case 'Failed':
      return 'error-darken-1'
    default:
      return 'grey-darken-1'
  }
}
</script>

<style scoped>
.history-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(255, 153, 153, 0.2) !important;
}

.dialog-title {
  background: linear-gradient(135deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  padding: 16px !important;
}

.dialog-logo {
  height: 32px;
  width: 32px;
  margin-right: 12px;
  animation: bounce 2s infinite;
}

.close-btn {
  color: white !important;
  transition: transform 0.3s ease;
}

.close-btn:hover {
  transform: rotate(90deg);
}

.table-header {
  background-color: #FFF0F5 !important;
  color: #FF6B88 !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

.transaction-row {
  transition: all 0.3s ease;
}

.transaction-row:hover {
  background-color: #FFF0F0;
  transform: translateX(4px);
}

.type-chip {
  font-weight: 500;
  letter-spacing: 0.5px;
}

.status-chip {
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

:deep(.v-table) {
  background: transparent !important;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(255, 153, 153, 0.1);
}

:deep(.v-table__wrapper) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.v-table > .v-table__wrapper > table) {
  background: transparent !important;
}
</style> 