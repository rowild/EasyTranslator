<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import Background from '../components/Background.vue';

const router = useRouter();
</script>

<template>
  <div class="main-view">
    <header>
      <h1><span>Saved</span><span>&</span><span>Transcripts</span></h1>
    </header>

    <div class="center-content">
      <main>
        <div class="warning-box">
          <p>Saved transcripts UI is coming next.</p>
        </div>
      </main>
    </div>

    <footer class="app-footer">
      <div class="footer-left">
        <button class="footer-info-btn" @click="router.push('/')" title="Back to main">
          <ArrowLeft :size="20" />
          <span class="info-label">Back</span>
        </button>
      </div>
      <div class="footer-right"></div>
    </footer>

    <Background />
  </div>
</template>

