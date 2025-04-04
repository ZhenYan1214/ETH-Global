<script setup>
// Component logic will be added here
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between h-16">
          <div class="flex">
            <router-link to="/" class="flex items-center">
              <span class="text-xl font-bold text-primary">Piggy Vault</span>
            </router-link>
          </div>
          <div class="flex items-center">
            <router-link to="/home" class="text-gray-700 hover:text-primary px-3 py-2">Home</router-link>
            <router-link to="/swap" class="text-gray-700 hover:text-primary px-3 py-2">Swap</router-link>
          </div>
        </div>
      </div>
    </nav>
    <router-view></router-view>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
