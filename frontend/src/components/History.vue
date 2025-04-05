<template>
  <v-dialog
    :model-value="show"
    @update:model-value="$emit('update:show', $event)"
    max-width="800px"
  >
    <v-card class="history-dialog">
      <v-card-title class="history-title">
        <span>交易歷史記錄</span>
        <v-btn icon @click="$emit('update:show', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="history-content">
        <div v-if="loading" class="text-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">正在載入交易記錄...</p>
        </div>
        <div v-else-if="errorMessage" class="text-center text-red">
          <p>{{ errorMessage }}</p>
        </div>
        <div v-else-if="transactions.length === 0" class="no-transactions">
          <v-icon size="64" color="grey">mdi-history</v-icon>
          <p class="mt-4">目前沒有交易記錄</p>
          <p class="text-caption text-grey">開始使用豬豬金庫，創建你的第一筆交易吧！</p>
        </div>
        <v-data-table
          v-else
          :headers="headers"
          :items="transactions"
          class="elevation-1"
        >
          <template v-slot:item.triggered_at="{ item }">
            {{ formatDate(item.triggered_at) }}
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
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const transactions = ref([]);
const loading = ref(false);
const errorMessage = ref('');

const headers = [
  { title: '日期', key: 'triggered_at' },
  { title: '地址', key: 'sender' },
  { title: '手續費', key: 'usdAmount' }
];

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString('zh-TW', { timeZone: 'UTC' });
};

const fetchTransactions = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await axios.get('http://localhost:3012/api/webhook/events/bookray', {
      timeout: 5000
    });
    console.log('後端原始資料:', response.data);
    const rows = Array.isArray(response.data) ? response.data : response.data.result?.rows || [];
    console.log('Rows 陣列:', rows);
    transactions.value = rows.map(row => {
      // 後端已將 assets 轉換為 USD，直接使用
      const usdAmount = row.assets && !isNaN(Number(row.assets)) ? Number(row.assets) : 0;
      console.log('處理單筆資料:', { ...row, usdAmount });
      return {
        ...row,
        usdAmount
      };
    });
    console.log('最終 transactions:', transactions.value);
  } catch (error) {
    console.error('無法獲取交易記錄:', error);
    errorMessage.value = '無法載入交易記錄，請稍後再試';
    transactions.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  console.log('History.vue 組件已掛載，開始獲取資料');
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
  align-items: center;
  justify-content: center;
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
</style>