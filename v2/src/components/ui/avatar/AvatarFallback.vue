<script setup lang="ts">
import type { AvatarFallbackProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AvatarFallback } from "reka-ui"
import { cn } from "@/lib/utils"
import { DEFAULT_AVATAR } from "@/composables"

const props = defineProps<AvatarFallbackProps & { class?: HTMLAttributes["class"] }>()
const defaultAvatarSrc = DEFAULT_AVATAR

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <AvatarFallback
    data-slot="avatar-fallback"
    v-bind="delegatedProps"
    :class="cn('bg-muted flex size-full items-center justify-center rounded-full overflow-hidden', props.class)"
  >
    <img :src="defaultAvatarSrc" alt="" class="h-full w-full object-cover" />
  </AvatarFallback>
</template>
