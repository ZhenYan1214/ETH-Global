import { createRouter, createWebHistory } from 'vue-router'
import Website from '../views/Website.vue'
import HomeView from '../views/HomeView.vue'
import SwapView from '../views/SwapView.vue'
import History from '../components/History.vue'

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
    component: History
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 