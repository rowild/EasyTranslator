<script setup lang="ts">
import MainView from './views/MainView.vue';
import './assets/fonts.css';
</script>

<template>
  <MainView />
</template>

<style>
/* CSS Custom Properties */
:root {
  /* Color scheme */
  --primary-color: #ff2d77; /* Bright magenta */
  --secondary-color: #074369; /* Dark petrol */
  --secondary-light: #146284; /* Less dark petrol */

  /* Input language colors */
  --input-language-color: rgba(66, 184, 131, 0.1);
  --input-language-border: #42b883;

  /* Output language colors */
  --output-language-color: rgba(255, 45, 119, 0.1);
  --output-language-border: var(--primary-color);
}

/* Reset and base styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: 'Fraunces', serif;
}

body {
  /* Diagonal gradient background */
  background: linear-gradient(30deg, var(--secondary-color) 0%, var(--secondary-light) 100%);
  background-attachment: fixed;
}

#app {
  height: 100%;
  min-height: 100vh;
}
</style>
