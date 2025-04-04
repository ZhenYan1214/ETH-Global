<script setup>
import { ref } from 'vue'
import History from './components/History.vue'

const theme = {
  primary: '#FF9999', // 溫柔的粉紅色
  secondary: '#FFB6C1', // 淺粉紅
  accent: '#FFC0CB', // 粉紅色
  title: '#FF6B88', // 標題粉紅
}
</script>

<template>
  <v-app>
    <v-main>
      <router-view></router-view>
    </v-main>

    <v-footer app :color="theme.primary" class="text-center d-flex justify-center">
      <span class="footer-text">&copy; {{ new Date().getFullYear() }} 🐷 Piggy Vault</span>
    </v-footer>
  </v-app>
</template>

<style>
.v-application {
  font-family: 'Roboto', sans-serif;
}

/* 自定義主題顏色 */
:root {
  --v-primary-base: #FF9999;
  --v-secondary-base: #FFB6C1;
  --v-accent-base: #FFC0CB;
}

.footer-text {
  color: white;
  font-weight: 500;
}
</style>
