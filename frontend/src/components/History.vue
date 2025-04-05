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
          <template v-slot:item.assets="{ item }">
            {{ item.usdAmount.toFixed(2) }} USD
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
const ethPrice = ref(0);
const errorMessage = ref(''); // 新增錯誤訊息

// 表格標頭
const headers = [
  { title: '日期', key: 'triggered_at' },
  { title: '地址', key: 'sender' },
  { title: '金額', key: 'assets' }
];

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-TW', { timeZone: 'UTC' });
};

// 獲取 ETH 價格
const fetchEthPrice = async () => {
  const cachedPrice = localStorage.getItem('ethPrice');
  const cachedTimestamp = localStorage.getItem('ethPriceTimestamp');
  const now = Date.now();
  const cacheDuration = 5 * 60 * 1000; // 快取 5 分鐘

  if (cachedPrice && cachedTimestamp && (now - cachedTimestamp < cacheDuration)) {
    console.log('使用快取的 ETH 價格:', cachedPrice);
    ethPrice.value = Number(cachedPrice);
    return;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      ethPrice.value = response.data.ethereum.usd;
      console.log('成功獲取 ETH 價格:', ethPrice.value);
      localStorage.setItem('ethPrice', ethPrice.value);
      localStorage.setItem('ethPriceTimestamp', now.toString());
      return;
    } catch (error) {
      attempt++;
      if (error.response && error.response.status === 429) {
        console.warn(`第 ${attempt} 次嘗試失敗：429 Too Many Requests，等待重試...`);
        if (attempt === maxRetries) {
          console.error('超過最大重試次數，使用預設值');
          ethPrice.value = 0;
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
      } else {
        console.error('無法獲取 ETH 價格:', error.message);
        ethPrice.value = 0;
        return;
      }
    }
  }
};

// 獲取交易記錄
const fetchTransactions = async () => {
  loading.value = true;
  errorMessage.value = ''; // 重置錯誤訊息
  try {
    const response = await axios.get('http://localhost:3011/api/webhook/events/bookray');
    const rows = response.data.result.rows;

    // 將 wei 轉換成 USD
    transactions.value = rows.map(row => {
      const ethAmount = Number(row.assets) / 10**18; // wei 轉 ETH
      const usdAmount = ethAmount * ethPrice.value; // ETH 轉 USD
      return {
        ...row,
        usdAmount
      };
    });
  } catch (error) {
    console.error('無法獲取交易記錄:', error);
    errorMessage.value = '無法載入交易記錄，請稍後再試';
    transactions.value = [];
  } finally {
    loading.value = false;
  }
};

// 當組件掛載時，獲取 ETH 價格和交易記錄
onMounted(async () => {
  await fetchEthPrice();
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