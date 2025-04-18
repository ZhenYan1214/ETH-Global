<template>
  <div class="website-container">
    <!-- Background Image -->
    <div class="background-image-container">
      <img src="@/assets/wsBG.png" alt="Background" class="background-image" />
    </div>

    <!-- Navigation Bar -->
    <nav class="nav-bar">
      <div class="logo" @click="scrollToTop">
        <img src="@/assets/logo.png" alt="Piggy Logo" class="logo-img" />
        <span class="logo-text">Piggy Vault</span>
      </div>
      <div class="nav-links">
        <div class="social-nav-links">
          <a href="https://twitter.com" target="_blank" class="social-nav-link">
            <i class="fa-brands fa-twitter"></i>
          </a>
          <a href="https://discord.com" target="_blank" class="social-nav-link">
            <i class="fa-brands fa-discord"></i>
          </a>
          <a href="https://t.me" target="_blank" class="social-nav-link">
            <i class="fa-brands fa-telegram"></i>
          </a>
          <a href="https://instagram.com" target="_blank" class="social-nav-link">
            <i class="fa-brands fa-instagram"></i>
          </a>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1>
          Manage Your Tokens with Ease & <span class="highlight">Earn Rewards!</span>
        </h1>
        <p>Convert your tokens to USDC, deposit into yend for interest, and withdraw anytime.</p>
        <div class="buttons-container">
          <v-btn
            @click="showLoginDialog = true"
            size="x-large"
            class="welcome-btn get-started-btn"
            elevation="4"
          >
            Get Started
          </v-btn>
          <v-btn
            @click="scrollToHowItWorks"
            size="x-large"
            class="welcome-btn enter-btn"
            elevation="4"
          >
            Learn More
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
      <div class="hero-image">
        <div class="piggy-container">
          <img src="@/assets/wsPig.gif" alt="Piggy Vault Mascot" class="piggy-mascot" />
          <div class="floating-coins">
            <v-icon icon="mdi-currency-usd" class="coin-icon" />
            <v-icon icon="mdi-currency-usd" class="coin-icon" />
            <v-icon icon="mdi-currency-usd" class="coin-icon" />
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works" id="howItWorks" ref="howItWorks">
      <h2>Three Simple Steps to Earn Rewards</h2>
      <div class="steps-container">
        <div v-for="(step, index) in steps" :key="index" class="step">
          <div class="step-icon">
            <v-icon :icon="step.icon" size="32" color="#FF6F91" />
          </div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </section>

    <!-- MSCA Wallet Login/Register Dialog -->
    <v-dialog v-model="showLoginDialog" max-width="500">
      <v-card class="wallet-dialog">
        <v-card-title class="dialog-title">
          <h2>{{ isRegistering ? 'Create Your Wallet' : 'Connect Your Wallet' }}</h2>
          <v-btn icon="mdi-close" @click="showLoginDialog = false" class="close-btn"></v-btn>
        </v-card-title>
        
        <v-card-text>
          <div class="tab-container">
            <div 
              class="tab-btn" 
              :class="{ active: !isRegistering }"
              @click="isRegistering = false"
            >
              Login
            </div>
            <div 
              class="tab-btn" 
              :class="{ active: isRegistering }"
              @click="isRegistering = true"
            >
              Register
            </div>
          </div>

          <v-form @submit.prevent="connectWallet" class="login-form">
            <v-text-field
              v-model="username"
              label="Username"
              variant="outlined"
              :rules="[v => !!v || 'Username is required']"
              class="input-field"
            ></v-text-field>
            
            <p class="wallet-description">
              {{ isRegistering 
                ? 'Create a passkey-protected wallet for easy and secure access to web3.' 
                : 'Connect to your existing smart contract wallet using your passkey.' }}
            </p>

            <div v-if="walletError" class="error-message">
              {{ walletError }}
            </div>
            
            <v-btn 
              type="submit"
              :loading="isLoading"
              :disabled="!username"
              block
              class="wallet-action-btn"
            >
              {{ isRegistering ? 'Create Wallet' : 'Connect Wallet' }}
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Feedback Button -->
    <button class="feedback-btn" @click="openFeedbackModal">
      <v-icon icon="mdi-message-text" />
    </button>

    <!-- Feedback Modal -->
    <div v-if="showFeedbackModal" class="feedback-modal">
      <div class="feedback-content">
        <div v-if="!showThankYou && !showCommentInput" class="modal-header">
          <h3>Help Us Make Piggy Vault Better! 🐷</h3>
          <p class="modal-description">Your feedback is important to us. Please share your thoughts!</p>
        </div>

        <div v-if="!showThankYou && !showCommentInput" class="feedback-options">
          <button class="feedback-option" @click="submitFeedback('like')">
            <span class="option-icon">👍</span>
            <span class="option-text">I Like It</span>
          </button>
          <button class="feedback-option" @click="submitFeedback('dislike')">
            <span class="option-icon">👎</span>
            <span class="option-text">I Don't Like It</span>
          </button>
          <button class="feedback-option" @click="showCommentForm">
            <span class="option-icon">💭</span>
            <span class="option-text">I Want to Say Something</span>
          </button>
        </div>

        <div v-if="showCommentInput" class="comment-section">
          <textarea
            v-model="feedbackText"
            class="feedback-textarea"
            placeholder="Tell us what you think..."
          ></textarea>
          <button class="submit-btn" @click="submitComment">Submit</button>
        </div>

        <div v-if="showThankYou" class="thank-you-message">
          <div class="thank-you-icon">{{ thankYouIcon }}</div>
          <p>{{ thankYouText }}</p>
        </div>

        <button class="close-modal" @click="closeFeedbackModal">&times;</button>
      </div>
    </div>


    <!-- Scroll to Top Button -->
    <button
      class="scroll-to-top"
      :class="{ visible: showScrollToTop }"
      @click="scrollToTop"
    >
      <v-icon icon="mdi-arrow-up" />
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWalletStore } from '../store/wallet';

const router = useRouter();
const walletStore = useWalletStore();

// Navigation links data
const navLinks = ref([
  { text: 'Home', href: '#home' },
  { text: 'Token Management', href: '#token-management' },
  { text: 'History', href: '#history' },
  { text: 'About', href: '#about' },
]);
const activeSection = ref('home');

// Steps data for "How It Works" section
const steps = ref([
  { 
    title: 'Create Wallet', 
    description: 'Sign in with Google and set your username.', 
    icon: 'mdi-wallet'
  },
  { 
    title: 'Select Tokens', 
    description: 'Choose the tokens you want to convert, e.g., A, C, D.', 
    icon: 'mdi-check-circle'
  },
  { 
    title: 'Convert & Earn', 
    description: 'Convert to USDC, deposit into yend, and earn interest.', 
    icon: 'mdi-currency-usd'
  },
]);

// Feedback modal data
const showFeedbackModal = ref(false);
const showThankYou = ref(false);
const showCommentInput = ref(false);
const feedbackText = ref('');
const thankYouIcon = ref('');
const thankYouText = ref('');

// Social icons data
const socialIcons = ref([
  { href: '#', icon: 'mdi-twitter' },
  { href: '#', icon: 'mdi-discord' },
  { href: '#', icon: 'mdi-telegram' },
  { href: '#', icon: 'mdi-medium' },
]);

// Scroll to top button visibility
const showScrollToTop = ref(false);

// MSCA Wallet Login/Register Dialog
const showLoginDialog = ref(false);
const isRegistering = ref(false);
const username = ref('');
const walletError = ref('');
const isLoading = ref(false);

// Smooth scroll function
const smoothScroll = (href) => {
  const target = document.querySelector(href);
  if (target) {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
};

// Handle navigation link active state on scroll
const updateActiveSection = () => {
  let current = '';
  const sections = document.querySelectorAll('section');
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= sectionTop - 60) {
      current = section.getAttribute('id');
    }
  });
  activeSection.value = current || 'home';
};

// Connect Wallet button hover animation
const walletBtn = ref(null);
const hoverWalletBtn = (event) => {
  event.target.style.transform = 'scale(1.02)';
  event.target.style.boxShadow = '0 0 8px rgba(255, 111, 145, 0.2)';
};
const leaveWalletBtn = (event) => {
  event.target.style.transform = 'scale(1)';
  event.target.style.boxShadow = 'none';
};

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
};
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
    }
  });
}, observerOptions);

// Feedback modal functions
const openFeedbackModal = () => {
  showFeedbackModal.value = true;
  showThankYou.value = false;
  showCommentInput.value = false;
  feedbackText.value = '';
};
const closeFeedbackModal = () => {
  showFeedbackModal.value = false;
  showThankYou.value = false;
  showCommentInput.value = false;
  feedbackText.value = '';
};
const showCommentForm = () => {
  showCommentInput.value = true;
};
const submitFeedback = (type) => {
  if (type === 'like') {
    thankYouIcon.value = '🥰';
    thankYouText.value = 'Your like is our motivation, thank you!';
  } else if (type === 'dislike') {
    thankYouIcon.value = '🙏';
    thankYouText.value = 'Thank you for your valuable feedback!';
  }
  showThankYou.value = true;
  
  // 這裡可以加入發送反饋到後端的邏輯
  setTimeout(() => {
    closeFeedbackModal();
  }, 1000);
};
const submitComment = () => {
  if (feedbackText.value.trim()) {
    thankYouIcon.value = '🙏';
    thankYouText.value = 'Thank you for your valuable feedback!';
    showThankYou.value = true;
    showCommentInput.value = false;
    
    // 這裡可以加入發送反饋到後端的邏輯
    setTimeout(() => {
      closeFeedbackModal();
    }, 1000);
  }
};

// Scroll to specific sections
const scrollToHowItWorks = () => {
  const howItWorksSection = document.getElementById('howItWorks');
  howItWorksSection.scrollIntoView({ behavior: 'smooth' });
};
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

// Show/hide scroll-to-top button
const handleScroll = () => {
  showScrollToTop.value = window.pageYOffset > 300;
};

// Connect wallet function
const connectWallet = async () => {
  isLoading.value = true;
  walletError.value = '';
  
  try {
    walletStore.usernameInput = username.value;
    walletStore.isRegistering = isRegistering.value;
    
    const result = await walletStore.connect();
    if (result.success) {
      showLoginDialog.value = false;
      router.push('/home');
    } else {
      walletError.value = result.error || 'Failed to connect wallet';
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
    walletError.value = error.message || 'Unknown error occurred';
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  // Initialize Intersection Observer for fade-in animations
  document.querySelectorAll('section, .step, .bottom-bg-image').forEach((element) => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
  });

  // Add scroll event listeners
  window.addEventListener('scroll', updateActiveSection);
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  // Cleanup event listeners
  window.removeEventListener('scroll', updateActiveSection);
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* Reset and Base Styles */
.website-container {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background: linear-gradient(180deg, #E6F0FA 0%, #FFDDE5 100%);
}

.background-image-container {
  position: fixed;
  top: calc(50% - 50px);
  left: calc(50% + 330px);
  transform: translate(-50%, -50%);
  width: 480px;
  height: auto;
  z-index: 0;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: center;
}

.background-image {
  width: 100%;
  height: auto;
  object-fit: contain;
  opacity: 0.3;
}

/* 確保其他內容在背景之上 */
.nav-bar,
.hero-section,
.how-it-works,
.feedback-modal,
.scroll-to-top {
  position: relative;
  z-index: 1;
}

/* Navigation Bar */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  z-index: 1000;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-img {
  width: 40px;
  height: 40px;
  
  box-shadow: inset 0 1px 2px rgba(255, 111, 145, 0.2);
  transition: transform 0.3s ease;
}

.logo:hover .logo-img {
  transform: scale(1.1);
}

.logo-text {
  font-size: 24px;
  font-weight: 600;
  color: #2D2D2D;
  transition: color 0.3s ease;
}

.logo:hover .logo-text {
  color: #FF6F91;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-link {
  text-decoration: none;
  color: #4A4A4A;
  font-size: 16px;
  font-weight: 500;
  position: relative;
  transition: color 0.3s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: #FF6F91;
  transition: width 0.3s ease;
}

.nav-link:hover {
  color: #FF6F91;
}

.nav-link:hover::after {
  width: 100%;
}

.nav-link.active {
  color: #FF6F91;
}

.nav-link.active::after {
  width: 100%;
}

.connect-wallet-btn {
  width: 160px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(90deg, #FF6F91, #FF8DA1);
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Hero Section */
.hero-section {
  max-width: 1200px;
  margin: 140px auto 80px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 60px;
  overflow: visible;
}

.hero-content {
  flex: 1;
}

.hero-content h1 {
  font-size: 56px;
  line-height: 64px;
  color: #2D2D2D;
  margin-bottom: 24px;
}

.highlight {
  color: #FF6F91;
  position: relative;
}

.highlight::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 4px;
  background: #FF6F91;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.5s ease;
}

.hero-content:hover .highlight::after {
  transform: scaleX(1);
}

.hero-content p {
  font-size: 20px;
  line-height: 28px;
  color: #4A4A4A;
  margin-bottom: 40px;
}

.buttons-container {
  display: flex;
  gap: 24px;
}

.welcome-btn {
  font-size: 1.5rem ;
  padding: 1.5rem 3rem ;
  letter-spacing: 1px ;
  text-transform: none ;
  transition: all 0.3s ease ;
  color: white ;
  border: none ;
  border-radius: 50px ;
  min-width: 250px ;
  height: 70px !important; 
}

.get-started-btn {
  background: linear-gradient(90deg, #FF6F91, #FF8DA1) !important;
}

.enter-btn {
  background: linear-gradient(45deg, #FFB6C1, #FFC0CB) !important;
}

.welcome-btn:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 7px 14px rgba(255, 153, 153, 0.3) !important;
}

.hero-image {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  overflow: visible;
}

.piggy-container {
  position: relative;
  width: 400px;
  height: 400px;
  margin: 0 auto;
  transform-origin: center;
  transform: scale(1.5);
  margin-right: -20px
}

.piggy-mascot {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: relative;
  z-index: 2;
  transform-origin: center center;
  filter: drop-shadow(0 4px 8px rgba(211, 199, 229, 0.3));
}

/* Background glow effect */
.piggy-container::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%);
  border-radius: 50%;
  z-index: 1;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.1;
  }
}

/* How It Works Section */
.how-it-works {
  max-width: 1200px;
  margin: 0 auto 80px;
  padding: 60px 20px;
  background: #F5F7FA;
  border-radius: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.how-it-works h2 {
  text-align: center;
  font-size: 36px;
  color: #2D2D2D;
  margin-bottom: 40px;
}

.steps-container {
  display: flex;
  justify-content: space-between;
  gap: 60px;
}

.step {
  flex: 1;
  text-align: center;
}

.step-icon {
  width: 80px;
  height: 80px;
  background: #FFDDE5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  transition: all 0.3s ease;
}

.step-icon i {
  font-size: 32px;
  color: #FF6F91;
  transition: color 0.3s ease;
}

.step:hover .step-icon {
  transform: scale(1.1);
}

.step:hover .step-icon i {
  color: #FF8DA1;
}

.step h3 {
  font-size: 20px;
  font-weight: 600;
  color: #2D2D2D;
  margin-bottom: 12px;
}

.step p {
  font-size: 16px;
  color: #4A4A4A;
}

/* Feedback Button and Modal */
.feedback-btn {
  position: fixed;
  bottom: 100px;
  right: 40px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #FF6F91;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 1000;
}

.feedback-btn:hover {
  transform: rotate(360deg);
  box-shadow: 0 0 12px rgba(255, 111, 145, 0.3);
}

.feedback-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.feedback-content {
  background: white;
  padding: 32px;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.modal-header h3 {
  font-size: 24px;
  color: #2D2D2D;
  margin-bottom: 8px;
}

.modal-header .modal-description {
  color: #666;
  font-size: 16px;
}

.feedback-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-option {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #F8F9FA;
  border: 1px solid #E9ECEF;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feedback-option:hover {
  background: #FFF5F7;
  border-color: #FF6F91;
  transform: translateY(-2px);
}

.option-icon {
  font-size: 24px;
  margin-right: 12px;
}

.option-text {
  font-size: 16px;
  color: #2D2D2D;
}

.close-modal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: #F8F9FA;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-modal:hover {
  background: #FFF5F7;
  color: #FF6F91;
}

@media (max-width: 480px) {
  .feedback-content {
    width: 95%;
    padding: 24px;
    margin: 10px;
  }

  .modal-header h3 {
    font-size: 20px;
  }

  .modal-header .modal-description {
    font-size: 14px;
  }

  .feedback-option {
    padding: 12px;
  }
}

/* Footer */
.footer {
  background: #2D2D2D;
  padding: 40px 0;
  text-align: center;
}

.social-icons {
  margin-bottom: 16px;
}

.social-icons a {
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
  margin: 0 12px;
  transition: all 0.3s ease;
}

.social-icons a:hover {
  color: #FF6F91;
  transform: scale(1.1);
}

.copyright {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
}

/* Scroll to Top Button */
.scroll-to-top {
  position: fixed;
  bottom: 40px;
  right: 40px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(90deg, #FF6F91, #FF8DA1);
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll-to-top.visible {
  opacity: 1;
  visibility: visible;
}

.scroll-to-top:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(255, 111, 145, 0.3);
}

.scroll-to-top i {
  transition: transform 0.3s ease;
}

.scroll-to-top:hover i {
  transform: translateY(-2px);
}

/* Fade-in Animation */
.fade-in {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

/* Highlight Animation */
@keyframes highlightSection {
  0% {
    background: #F5F7FA;
  }
  50% {
    background: #FFDDE5;
  }
  100% {
    background: #F5F7FA;
  }
}

/* Dialog Styles */
.wallet-dialog {
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}

.dialog-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(to right, #FFF5F5, #FFE0E0);
}

.dialog-title h2 {
  font-size: 1.8rem;
  color: #FF6B6B;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  color: #FF6B6B;
}

.tab-container {
  display: flex;
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #FFE0E0;
}

.tab-btn {
  flex: 1;
  text-align: center;
  padding: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  color: #777;
}

.tab-btn.active {
  background: linear-gradient(45deg, #FF9999, #FFB6C1);
  color: white;
}

.login-form {
  padding: 20px 0;
}

.input-field {
  margin-bottom: 16px;
}

.wallet-description {
  margin: 20px 0;
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
}

.error-message {
  color: #FF5252;
  margin-bottom: 16px;
  padding: 10px;
  background-color: rgba(255, 82, 82, 0.1);
  border-radius: 8px;
}

.wallet-action-btn {
  background: linear-gradient(45deg, #FF9999, #FFB6C1) !important;
  color: white !important;
  font-size: 1.1rem !important;
  padding: 12px 0 !important;
  margin-top: 16px !important;
  border-radius: 12px !important;
  text-transform: none !important;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    gap: 40px;
  }

  .hero-content {
    max-width: 600px;
  }

  .buttons-container {
    justify-content: center;
  }

  .steps-container {
    flex-direction: column;
    gap: 40px;
  }

  .background-image-container {
    width: 120px;
  }
}

@media (max-width: 768px) {
  .nav-bar {
    padding: 0 20px;
  }

  .nav-links {
    display: none;
  }

  .hero-content h1 {
    font-size: 40px;
    line-height: 48px;
  }

  .piggy-container {
    width: 300px;
    height: 300px;
  }

  .scroll-to-top {
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .feedback-btn {
    bottom: 80px;
  }

  .background-image-container {
    width: 100px;
  }
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

.coin-icon {
  font-size: 24px;
  color: #FFD700;
  animation: float 3s ease-in-out infinite;
}

.floating-coins {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 16px;
}

.floating-coins .coin-icon:nth-child(1) {
  animation-delay: 0s;
}

.floating-coins .coin-icon:nth-child(2) {
  animation-delay: 0.5s;
}

.floating-coins .coin-icon:nth-child(3) {
  animation-delay: 1s;
}

.comment-section {
  margin-top: 20px;
}

.feedback-textarea {
  width: 100%;
  height: 120px;
  padding: 12px;
  border: 1px solid #E9ECEF;
  border-radius: 12px;
  resize: none;
  font-size: 16px;
  margin-bottom: 16px;
  transition: border-color 0.3s ease;
}

.feedback-textarea:focus {
  outline: none;
  border-color: #FF6F91;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #FF6F91;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-btn:hover {
  background: #FF8DA1;
  transform: translateY(-2px);
}

.thank-you-message {
  text-align: center;
  padding: 20px;
}

.thank-you-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.thank-you-message p {
  font-size: 18px;
  color: #2D2D2D;
  line-height: 1.5;
}

.social-nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.social-nav-link {
  color: #666;
  font-size: 24px;
  text-decoration: none;
  transition: all 0.3s ease;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.social-nav-link:hover {
  color: #FF6F91;
  transform: translateY(-2px);
  background: rgba(255, 111, 145, 0.1);
}

@media (max-width: 768px) {
  .social-nav-links {
    gap: 12px;
  }

  .social-nav-link {
    font-size: 20px;
    width: 36px;
    height: 36px;
  }
}
</style> 