import { createRouter, createWebHistory } from 'vue-router'
import Website from '../views/Website.vue'
import HomeView from '../views/HomeView.vue'
import SwapView from '../views/SwapView.vue'
import Allowance from '../components/Allowance.vue'
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
    path: '/allowance',
    name: 'allowance',
    component: Allowance
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Route guard to ensure tokens are loaded when entering Swap page
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