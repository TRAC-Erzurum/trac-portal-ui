import { defineStore } from 'pinia'
import { ref } from 'vue'

export type FeedbackCategoryUi =
  | 'bug'
  | 'enhancement'
  | 'improvement'
  | 'question'
  | 'security'

export const useFeedbackStore = defineStore('feedback', () => {
  const sheetOpen = ref(false)
  const category = ref<FeedbackCategoryUi | null>(null)
  const summary = ref('')
  const body = ref('')

  function openSheet() {
    category.value = null
    summary.value = ''
    body.value = ''
    sheetOpen.value = true
  }

  function closeSheet() {
    sheetOpen.value = false
  }

  function setSheetOpen(open: boolean) {
    sheetOpen.value = open
  }

  return {
    sheetOpen,
    category,
    summary,
    body,
    openSheet,
    closeSheet,
    setSheetOpen,
  }
})
