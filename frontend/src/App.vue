<script setup>
import { ref } from 'vue'

const drawer = ref(false)
const items = [
  { title: 'Home', icon: 'mdi-home', to: '/home' },
  { title: 'Swap', icon: 'mdi-swap-horizontal', to: '/swap' },
]
</script>

<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>
        <router-link to="/" class="text-decoration-none text-white">
          Piggy Vault
        </router-link>
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn to="/home" text>Home</v-btn>
      <v-btn to="/swap" text>Swap</v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item
          v-for="item in items"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-main>

    <v-footer app color="primary" class="text-center d-flex justify-center">
      <span class="white--text">&copy; {{ new Date().getFullYear() }} Piggy Vault</span>
    </v-footer>
  </v-app>
</template>

<style>
.v-application {
  font-family: 'Roboto', sans-serif;
}
</style>
