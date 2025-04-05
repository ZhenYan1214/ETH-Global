import { createRouter, createWebHistory } from 'vue-router'
import Website from '../views/Website.vue'
import HomeView from '../views/HomeView.vue'
import SwapView from '../views/SwapView.vue'
import HistoryView from '../views/HistoryView.vue'
import { useTokenStore } from '../store/tokens'

const routes = [
  {
    path: '/',
    name: 'website',
    component: Website
  },
  {
    path: '/home',
    name: 'home',
    component: HomeView
  },
  {
    path: '/swap',
    name: 'swap',
    component: SwapView
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫，确保在进入Swap页面时加载代币
router.beforeEach(async (to, from, next) => {
  if (to.name === 'swap') {
    const tokenStore = useTokenStore()
    if (!tokenStore.tokens.length) {
      try {
        await tokenStore.fetchTokens()
      } catch (error) {
        console.error('Failed to load tokens:', error)
      }
    }
  }
  next()
})

export default router 