<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Plus, Trash2, Star } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
}>()

const { t } = useI18n()

const name = ref('')
const type = ref<'branch' | 'representative'>('branch')
const address = ref('')
const phone = ref('')
const email = ref('')
const callSigns = ref<Array<{ callSign: string; isDefault: boolean }>>([{ callSign: '', isDefault: true }])
const isLoading = ref(false)

const isValid = computed(() => {
  return (
    name.value.trim() &&
    callSigns.value.length > 0 &&
    callSigns.value.every(cs => cs.callSign.trim()) &&
    (!email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
  )
})

const addCallSign = () => {
  callSigns.value.push({ callSign: '', isDefault: false })
}

const removeCallSign = (index: number) => {
  if (callSigns.value.length === 1) return
  const item = callSigns.value[index]
  if (!item) return
  const wasDefault = item.isDefault
  callSigns.value.splice(index, 1)
  if (wasDefault) {
    const firstItem = callSigns.value[0]
    if (firstItem) {
      firstItem.isDefault = true
    }
  }
}

const setDefaultCallSign = (index: number) => {
  callSigns.value.forEach((cs, i) => {
    cs.isDefault = i === index
  })
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    name.value = ''
    type.value = 'branch'
    address.value = ''
    phone.value = ''
    email.value = ''
    callSigns.value = [{ callSign: '', isDefault: true }]
  }
})

async function handleSubmit() {
  if (!isValid.value) return

  isLoading.value = true
  try {
    await api.post('/branches', {
      name: name.value.trim(),
      type: type.value,
      address: address.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      email: email.value.trim() || undefined,
      callSigns: callSigns.value
        .filter(cs => cs.callSign.trim())
        .map(cs => ({
          callSign: cs.callSign.trim(),
          isDefault: cs.isDefault
        }))
    })

    toast.success(t('branches.createSuccess'))
    emit('created')
    emit('update:open', false)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md px-6 overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{{ t('branches.create') }}</SheetTitle>
        <SheetDescription>{{ t('branches.createDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6">
        <div class="space-y-2">
          <Label for="name">{{ t('branches.name') }} <span class="text-destructive">*</span></Label>
          <Input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('branches.namePlaceholder')"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="type">{{ t('branches.type') }} <span class="text-destructive">*</span></Label>
          <Select v-model="type">
            <SelectTrigger id="type" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="branch">{{ t('branches.typeBranch') }}</SelectItem>
              <SelectItem value="representative">{{ t('branches.typeRepresentative') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>{{ t('branches.callSigns') }} <span class="text-destructive">*</span></Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="addCallSign"
              class="h-8"
            >
              <Plus class="h-3 w-3 mr-1" />
              {{ t('branches.addCallSign') }}
            </Button>
          </div>

          <div v-for="(callSign, index) in callSigns" :key="index" class="flex items-center gap-2">
            <div class="flex-1 relative">
              <Input
                v-model="callSign.callSign"
                :placeholder="t('branches.callSignPlaceholder')"
                required
              />
              <button
                v-if="callSign.isDefault"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                :aria-label="t('branches.defaultCallSign')"
              >
                <Star class="h-4 w-4 text-amber-500 fill-amber-500" />
              </button>
              <button
                v-else
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-500 cursor-pointer transition-colors"
                @click="setDefaultCallSign(index)"
                :aria-label="t('branches.setDefault')"
              >
                <Star class="h-4 w-4" />
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              @click="removeCallSign(index)"
              :disabled="callSigns.length === 1"
              class="h-9 w-9"
              :aria-label="t('branches.removeCallSign')"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        <div class="space-y-2">
          <Label for="address">{{ t('branches.address') }}</Label>
          <Input
            id="address"
            v-model="address"
            type="text"
            :placeholder="t('branches.addressPlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="phone">{{ t('branches.phone') }}</Label>
          <Input
            id="phone"
            v-model="phone"
            type="tel"
            :placeholder="t('branches.phonePlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="email">{{ t('branches.email') }}</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('branches.emailPlaceholder')"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" :disabled="isLoading || !isValid">
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
