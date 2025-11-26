<script setup lang="ts">
import MainView from './views/MainView.vue';
</script>

<template>
  <MainView />
</template>

<style>
/* CSS Custom Properties */
:root {
  --input-language-color: #e8f5e9;
  --input-language-border: #4caf50;
  --output-language-color: #fff3e0;
  --output-language-border: #ff6f00;
}

/* Reset some basics if not covered by style.css */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
#app {
  height: 100%;
}
</style>
