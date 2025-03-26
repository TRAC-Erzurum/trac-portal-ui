<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4" class="text-center">
        <v-card class="pa-6" elevation="3">
          <v-card-title class="text-h4 font-weight-bold mb-4">
            {{ $t('error.403.title') }}
          </v-card-title>
          <v-card-text class="text-body-1 mb-6">
            {{ $t('error.403.message') }}
          </v-card-text>
          <v-btn color="primary" :to="'/'">
            {{ $t('error.backHome') }}
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
definePageMeta({
  requiresAuth: false,
})
</script>
