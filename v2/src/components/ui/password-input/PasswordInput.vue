<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-vue-next'

const model = defineModel<string>()

defineProps<{
  id?: string
  placeholder?: string
  required?: boolean
}>()

const showPassword = ref(false)

function togglePassword() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="relative">
    <Input
      :id="id"
      v-model="model"
      :type="showPassword ? 'text' : 'password'"
      :placeholder="placeholder"
      :required="required"
      class="pr-10"
    />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
      @click="togglePassword"
    >
      <Eye v-if="!showPassword" class="h-4 w-4 text-muted-foreground" />
      <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
    </Button>
  </div>
</template>
