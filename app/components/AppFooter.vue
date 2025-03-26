<template>
  <v-footer class="footer-wrapper px-2 py-1" app>
    <v-container>
      <v-row align="center" no-gutters>
        <v-col cols="auto">
          <v-btn icon @click="toggleTheme" :title="$t(`common.theme.${theme.global.name.value}`)">
            <v-icon>{{
              theme.global.name.value === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny'
            }}</v-icon>
          </v-btn>
        </v-col>
        <v-spacer></v-spacer>
        <v-col cols="auto">
          <div class="text-caption text-medium-emphasis">
            {{ $t('common.copyright', { year: currentYear }) }}
            <br />
            <span class="small">
              {{ $t('common.poweredBy') }}
            </span>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const theme = useTheme()
const currentYear = ref(new Date().getFullYear())

function toggleTheme() {
  const newTheme = theme.global.name.value === 'light' ? 'dark' : 'light'
  theme.global.name.value = newTheme
  if (import.meta.client) {
    localStorage.setItem('theme', newTheme)
  }
}

onMounted(() => {
  if (import.meta.client) {
    theme.global.name.value = localStorage.getItem('theme') || 'light'
  }
})
</script>
