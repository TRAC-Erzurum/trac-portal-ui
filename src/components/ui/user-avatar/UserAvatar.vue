<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Avatar } from '@/components/ui/avatar'
import { getAvatarUrl, DEFAULT_AVATAR } from '@/composables'

const props = defineProps<{
  picture?: string | null
  class?: string
}>()

const hasError = ref(false)
const avatarUrl = computed(() => getAvatarUrl(props.picture))
const displayUrl = computed(() => hasError.value ? DEFAULT_AVATAR : avatarUrl.value)

watch(() => props.picture, () => {
  hasError.value = false
})

const handleError = () => {
  hasError.value = true
}
</script>

<template>
  <Avatar :class="props.class">
    <img 
      :src="displayUrl" 
      alt=""
      class="h-full w-full object-cover"
      @error="handleError"
    />
  </Avatar>
</template>
