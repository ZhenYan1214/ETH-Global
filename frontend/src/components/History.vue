<template>
  <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="800px">
    <v-card class="history-dialog">
      <!-- 標題區：包含標題與關閉按鈕 -->
      <v-card-title class="history-title">
        <span>交易歷史記錄</span>
        <v-btn icon @click="$emit('update:show', false)">
          <v-img :src="closeIcon" class="close-img" />
        </v-btn>
      </v-card-title>

      <!-- 內容區 -->
      <v-card-text class="history-content">
        <!-- 搜尋輸入框 -->
        <div class="search-container pa-4">
          <v-text-field
            v-model="searchText"
            label="搜尋交易 (地址、日期…)"
            variant="outlined"
            density="compact"
            clearable
            hide-details
            prepend-inner-icon="mdi-magnify"
          ></v-text-field>
        </div>

        <!-- 載入中、錯誤或無資料提示 -->
        <div v-if="loading" class="text-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">正在載入交易記錄...</p>
        </div>
        <div v-else-if="errorMessage" class="text-center text-red">
          <p>{{ errorMessage }}</p>
        </div>
        <div v-else-if="filteredTransactions.length === 0" class="no-transactions">
          <v-icon size="64" color="grey">mdi-history</v-icon>
          <p class="mt-4">目前沒有交易記錄</p>
          <p class="text-caption text-grey">開始使用豬豬金庫，創建你的第一筆交易吧！</p>
        </div>

        <!-- 交易記錄表格：使用 v-data-table 自動分頁 -->
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
          <!-- 自訂 sender 欄位，將地址轉換成超連結 -->
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
import closeIcon from '@/assets/search.png'; // 請確認路徑與檔名正確

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
  { title: '日期', key: 'triggered_at' },
  { title: '地址', key: 'sender' },
  { title: '手續費', key: 'usdAmount' }
];

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString('zh-TW', { timeZone: 'UTC' });
};

// 產生指向 polygonscan 的 URL
const polygonscanUrl = (address) => {
  return address ? `https://polygonscan.com/address/${address}` : '#';
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
    transactions.value = rows.map(row => {
      const usdAmount = row.assets && !isNaN(Number(row.assets)) ? Number(row.assets) : 0;
      return { ...row, usdAmount };
    });
  } catch (error) {
    console.error('無法獲取交易記錄:', error);
    errorMessage.value = '無法載入交易記錄，請稍後再試';
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

/* 展開行細節樣式（目前不使用展開功能） */
.expanded-details {
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
  font-size: 0.9rem;
  padding: 12px;
}

/* 關閉按鈕圖片樣式 */
.close-img {
  width: 48px;
  height: 48px;
  transition: transform 0.2s ease;
}
.close-img:hover {
  transform: scale(1.1);
  cursor: pointer;
}

/* 地址超連結樣式 */
.address-link {
  color: var(--v-theme-primary);
  text-decoration: none;
}
.address-link:hover {
  text-decoration: underline;
}
</style>
