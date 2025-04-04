<script setup>
import { ref, onMounted } from 'vue'
import { useTokenStore } from './store/tokens'

const theme = {
  primary: '#FF9999', // 溫柔的粉紅色
  secondary: '#FFB6C1', // 淺粉紅
  accent: '#FFC0CB', // 粉紅色
  title: '#FF6B88', // 標題粉紅
}

// 在應用啟動時初始化 Token Store
onMounted(async () => {
  try {
    console.log('App mounted - initializing token store...')
    const tokenStore = useTokenStore()
    await tokenStore.initialize()
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
})
</script>

<template>
  <v-app>
    <v-main>
      <Suspense>
        <template #default>
          <router-view></router-view>
        </template>
        <template #fallback>
          <div class="loading-container">
            <div class="loading-content">
              <img src="https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png" alt="Piggy Logo" class="loading-logo" />
              <div class="loading-text">Loading...</div>
            </div>
          </div>
        </template>
      </Suspense>
    </v-main>

    <v-footer app :color="theme.primary" class="text-center d-flex justify-center">
      <span class="footer-text">&copy; {{ new Date().getFullYear() }} 🐷 Piggy Vault</span>
    </v-footer>
  </v-app>
</template>

<style>
.v-application {
  font-family: 'Roboto', sans-serif;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%) !important;
}

/* 自定義主題顏色 */
:root {
  --v-theme-primary: #FF9999;
  --v-theme-secondary: #FFB6C1;
  --v-theme-accent: #FFC0CB;
}

.footer-text {
  color: white;
  font-weight: 500;
}

/* Loading styles */
.loading-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
}

.loading-content {
  text-align: center;
}

.loading-logo {
  width: 120px;
  height: 120px;
  animation: bounce 2s infinite;
}

.loading-text {
  margin-top: 20px;
  font-size: 1.5rem;
  color: #FF6B88;
  font-weight: 500;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}
</style>
