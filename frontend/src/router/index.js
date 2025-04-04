import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'website',
    component: () => import('../views/Website.vue')
  },
  {
    path: '/swap',
    name: 'swap',
    component: () => import('../views/Swap.vue')
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('../components/History.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 