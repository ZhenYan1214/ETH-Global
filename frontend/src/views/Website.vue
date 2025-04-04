<template>
  <v-container fluid class="website-container">
    <div class="welcome-content">
      <div class="logo-container">
        <img src="https://em-content.zobj.net/source/microsoft-teams/363/pig-face_1f437.png" alt="Piggy Logo" class="welcome-logo" />
      </div>
      <div class="buttons-container">
        <v-btn
          to="/home"
          size="x-large"
          class="welcome-btn get-started-btn"
          elevation="4"
        >
          Get Started
        </v-btn>
        <v-btn
          to="/home"
          size="x-large"
          class="welcome-btn enter-btn"
          elevation="4"
        >
          進入豬豬世界
        </v-btn>
      </div>
    </div>
  </v-container>
</template>

<script setup>
</script>

<style scoped>
.website-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFE0E0 100%);
}

.welcome-content {
  text-align: center;
}

.logo-container {
  margin-bottom: 2rem;
}

.welcome-logo {
  width: 200px;
  height: 200px;
  animation: float 3s ease-in-out infinite;
}

.buttons-container {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.welcome-btn {
  font-size: 1.5rem !important;
  padding: 1rem 3rem !important;
  letter-spacing: 1px !important;
  text-transform: none !important;
  transition: all 0.3s ease !important;
  color: white !important;
  border: none !important;
  border-radius: 50px !important;
  min-width: 250px !important;
}

.get-started-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
}

.enter-btn {
  background: linear-gradient(45deg, #FFB6C1, #FFC0CB) !important;
}

.welcome-btn:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 7px 14px rgba(255, 153, 153, 0.3) !important;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
</style> 