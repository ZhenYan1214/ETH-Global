<!-- App.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useTokenStore } from './store/tokens'
import { useRoute } from 'vue-router'

const route = useRoute()
const showModal = ref(false)

const theme = {
  primary: '#FF9999',
  secondary: '#FFB6C1',
  accent: '#FFC0CB',
  title: '#FF6B88',
}

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
    <v-main :class="{ 'no-footer-padding': route.name === 'home' }">
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

    <v-footer
      v-if="route.name !== 'home'"
      app
      :color="theme.primary"
      class="text-center d-flex justify-center"
    >
      <span class="footer-text">© {{ new Date().getFullYear() }} 🐷 Piggy Vault</span>
    </v-footer>
  </v-app>
</template>

<style scoped>
.no-footer-padding {
  padding-bottom: 0 !important; /* 移除 v-main 的 padding-bottom */
}


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
