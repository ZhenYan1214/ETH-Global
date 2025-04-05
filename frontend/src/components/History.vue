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
        <div class="no-transactions">
          <v-icon size="64" color="grey">mdi-history</v-icon>
          <p class="mt-4">目前沒有交易記錄</p>
          <p class="text-caption text-grey">開始使用豬豬金庫，創建你的第一筆交易吧！</p>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
})
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
</style> 