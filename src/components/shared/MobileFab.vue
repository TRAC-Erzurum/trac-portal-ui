<script setup lang="ts">
import { ref, watch, type Component } from 'vue'
import { EllipsisVertical, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

export interface MobileFabAction {
  key: string
  label: string
  icon: Component
}

const props = defineProps<{
  actions: MobileFabAction[]
}>()

const emit = defineEmits<{
  action: [key: string]
}>()

const isOpen = ref(false)

const handleFabClick = () => {
  if (props.actions.length === 1) {
    emit('action', props.actions[0]!.key)
  } else {
    isOpen.value = !isOpen.value
  }
}

const handleAction = (key: string) => {
  emit('action', key)
  isOpen.value = false
}

// Close speed dial when actions change (e.g. net status change)
watch(() => props.actions, () => {
  isOpen.value = false
})
</script>

<template>
  <div v-if="actions.length > 0" class="lg:hidden">
    <!-- Backdrop overlay -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/40 z-30"
        @click="isOpen = false"
      />
    </Transition>

    <!-- Speed dial action items -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="isOpen && actions.length > 1"
        class="fixed bottom-36 right-4 z-40 flex flex-col items-end gap-3"
      >
        <button
          v-for="action in actions"
          :key="action.key"
          class="flex items-center gap-3"
          @click="handleAction(action.key)"
        >
          <span class="bg-background border border-border shadow-md rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap">
            {{ action.label }}
          </span>
          <span class="h-10 w-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center shrink-0">
            <component :is="action.icon" class="h-4 w-4" />
          </span>
        </button>
      </div>
    </Transition>

    <!-- Main FAB button -->
    <Button
      variant="outline"
      size="icon"
      class="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-background"
      @click="handleFabClick"
    >
      <!-- Single action: show the action's icon -->
      <component
        v-if="actions.length === 1"
        :is="actions[0]!.icon"
        class="h-6 w-6"
      />
      <!-- Multiple actions: ⋮ when closed, X when open -->
      <Transition
        v-else
        enter-active-class="transition-all duration-150"
        enter-from-class="opacity-0 scale-75"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-75"
        mode="out-in"
      >
        <X v-if="isOpen" class="h-6 w-6" />
        <EllipsisVertical v-else class="h-6 w-6" />
      </Transition>
    </Button>
  </div>
</template>
