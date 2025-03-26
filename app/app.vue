<template>
  <div :lang="$i18n.locale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <v-snackbar v-model="toast.show" :color="toast.color" :timeout="toast.timeout" location="top">
      {{ toast.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="hideToast" icon="mdi-close"> </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
const { locale } = useI18n()
const route = useRoute()
const persistedLocale = useState('locale', () => '')
const { toast, hideToast } = useToast()

onMounted(() => {
  if (import.meta.client) {
    const savedLocale = localStorage.getItem('user-locale')
    if (savedLocale) {
      locale.value = savedLocale
      persistedLocale.value = savedLocale
    }
  }
})

watch(locale, (newLocale) => {
  if (import.meta.client) {
    localStorage.setItem('user-locale', newLocale)
    persistedLocale.value = newLocale
  }
})

watch(
  route,
  () => {
    if (persistedLocale.value) {
      locale.value = persistedLocale.value
    }
  },
  { deep: true }
)
</script>
