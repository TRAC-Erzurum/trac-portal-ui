<template>
  <v-app>
    <client-only>
      <template v-if="$auth.isInitialized.value">
        <AppHeader />
        <v-main class="main-content">
          <slot />
        </v-main>
        <AppFooter />
      </template>
      <template v-else>
        <v-main class="main-content d-flex align-center justify-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </v-main>
      </template>
    </client-only>
  </v-app>
</template>

<script setup>
const { $auth } = useNuxtApp()
</script>

<style scoped>
.main-content {
  background-color: var(--v-background);
  min-height: calc(100vh - 96px);
}
</style>
