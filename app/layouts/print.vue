<template>
  <div class="print-layout" v-if="$auth.isInitialized.value">
    <slot />
  </div>
  <div v-else>
    <v-container class="fill-height">
      <v-row justify="center" align="center">
        <v-col cols="12">
          <v-skeleton-loader type="table" height="800"></v-skeleton-loader>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
const { $auth } = useNuxtApp()
</script>

<style scoped>
.print-layout {
  min-height: 100vh;
  background: white;
}

@media print {
  .print-layout {
    margin: 0;
    padding: 0;
  }
}
</style>
