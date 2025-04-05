<template>
  <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="800px">
    <v-card class="history-dialog">
      <!-- Title area with close button -->
      <v-card-title class="history-title">
        <span>Transaction History</span>
        <v-btn icon @click="$emit('update:show', false)">
          <v-img :src="closeIcon" class="close-img" />
        </v-btn>
      </v-card-title>

      <!-- Content area -->
      <v-card-text class="history-content">
        <!-- Search input -->
        <div class="search-container pa-4">
          <v-text-field
            v-model="searchText"
            label="Search transactions (address, date...)"
            variant="outlined"
            density="compact"
            clearable
            hide-details
            prepend-inner-icon="mdi-magnify"
          ></v-text-field>
        </div>

        <!-- Loading, error or no data states -->
        <div v-if="loading" class="text-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">Loading transaction records...</p>
        </div>
        <div v-else-if="errorMessage" class="text-center text-red">
          <p>{{ errorMessage }}</p>
        </div>
        <div v-else-if="filteredTransactions.length === 0" class="no-transactions">
          <v-icon size="64" color="grey">mdi-history</v-icon>
          <p class="mt-4">No transaction records yet</p>
          <p class="text-caption text-grey">Start using Piggy Vault to create your first transaction!</p>
        </div>

        <!-- Transaction records table with auto-pagination -->
        <v-data-table
          v-else
          :headers="headersWithExpand"
          :items="filteredTransactions"
          item-key="id"
          :items-per-page="pageSize"
          :footer-props="{ 'items-per-page-options': [10, 25, 50, 100] }"
          class="elevation-1"
        >
          <template v-slot:item.triggered_at="{ item }">
            {{ formatDate(item.triggered_at) }}
          </template>
          <!-- Custom sender field with address link -->
          <template v-slot:item.sender="{ item }">
            <a :href="polygonscanUrl(item.sender)" target="_blank" class="address-link">
              {{ item.sender }}
            </a>
          </template>
          <template v-slot:item.usdAmount="{ item }">
            {{ item.usdAmount ? item.usdAmount.toFixed(2) : 'N/A' }} USD
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import closeIcon from '@/assets/search.png'; // Verify path and filename

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
});
const emit = defineEmits(['update:show']);

const transactions = ref([]);
const loading = ref(false);
const errorMessage = ref('');
const searchText = ref('');
const pageSize = ref(10);

const headersWithExpand = [
  { title: 'Date', key: 'triggered_at' },
  { title: 'Address', key: 'sender' },
  { title: 'Fee', key: 'usdAmount' }
];

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString('en-US', { timeZone: 'UTC' });
};

// Generate Polygonscan URL
const polygonscanUrl = (address) => {
  return address ? `https://polygonscan.com/address/${address}` : '#';
};

const fetchTransactions = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await axios.get('http://localhost:3011/api/webhook/events/bookray', {
      timeout: 5000
    });
    console.log('Backend raw data:', response.data);
    const rows = Array.isArray(response.data) ? response.data : response.data.result?.rows || [];
    transactions.value = rows.map(row => {
      const usdAmount = row.assets && !isNaN(Number(row.assets)) ? Number(row.assets) : 0;
      return { ...row, usdAmount };
    });
  } catch (error) {
    console.error('Failed to fetch transaction records:', error);
    errorMessage.value = 'Failed to load transaction records, please try again later';
    transactions.value = [];
  } finally {
    loading.value = false;
  }
};

const filteredTransactions = computed(() => {
  if (!searchText.value) return transactions.value;
  const search = searchText.value.toLowerCase();
  return transactions.value.filter(item => {
    return (
      (item.sender && item.sender.toLowerCase().includes(search)) ||
      (item.triggered_at && item.triggered_at.toLowerCase().includes(search)) ||
      (item.id && String(item.id).toLowerCase().includes(search))
    );
  });
});

onMounted(async () => {
  console.log('History.vue component mounted, fetching data');
  await fetchTransactions();
});
</script>

<style scoped>
.history-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.history-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
}

.history-content {
  padding: 20px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.no-transactions {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-transactions p {
  margin-top: 8px;
  font-size: 1.1rem;
}

.text-red {
  color: red;
}

.search-container {
  margin-bottom: 16px;
}

/* Expanded row details style (currently unused) */
.expanded-details {
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
  font-size: 0.9rem;
  padding: 12px;
}

/* Close button image style */
.close-img {
  width: 48px;
  height: 48px;
  transition: transform 0.2s ease;
}
.close-img:hover {
  transform: scale(1.1);
  cursor: pointer;
}

/* Address link style */
.address-link {
  color: var(--v-theme-primary);
  text-decoration: none;
}
.address-link:hover {
  text-decoration: underline;
}
</style>
