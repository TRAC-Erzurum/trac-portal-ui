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
import { useQthData } from '@/composables'

interface BranchCallSign {
  id: string
  callSign: string
  isDefault: boolean
}

interface Branch {
  id: string
  name: string
  type: 'branch' | 'representative'
  isHeadquarters: boolean
  isActive: boolean
  city?: string
  address?: string
  phone?: string
  email?: string
  callSigns: BranchCallSign[]
  createdAt: string
}

const props = defineProps<{
  open: boolean
  branch: Branch
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()
const { cities, loadCities } = useQthData()

const name = ref('')
const type = ref<'branch' | 'representative'>('branch')
const city = ref('')
const address = ref('')
const phone = ref('')
const email = ref('')
const callSigns = ref<Array<{ id?: string; callSign: string; isDefault: boolean }>>([])
const isLoading = ref(false)

const isValid = computed(() => {
  const hasValidCallSigns = props.branch.isHeadquarters 
    ? true 
    : callSigns.value.length > 0 && callSigns.value.every(cs => cs.callSign.trim())
  
  return (
    name.value.trim() &&
    hasValidCallSigns &&
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
  if (isOpen && props.branch) {
    loadCities()
    name.value = props.branch.name
    type.value = props.branch.type
    city.value = props.branch.city || ''
    address.value = props.branch.address || ''
    phone.value = props.branch.phone || ''
    email.value = props.branch.email || ''
    callSigns.value = props.branch.callSigns.map(cs => ({
      id: cs.id,
      callSign: cs.callSign,
      isDefault: cs.isDefault
    }))
  }
})

async function handleSubmit() {
  if (!isValid.value) return

  isLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      name: name.value.trim(),
      city: city.value.trim() || undefined,
      address: address.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      email: email.value.trim() || undefined,
    }

    // Only include type and callSigns for non-headquarters branches
    if (!props.branch.isHeadquarters) {
      payload.type = type.value
      payload.callSigns = callSigns.value
        .filter(cs => cs.callSign.trim())
        .map(cs => ({
          callSign: cs.callSign.trim(),
          isDefault: cs.isDefault
        }))
    }

    await api.patch(`/branches/${props.branch.id}`, payload)

    toast.success(t('branches.updateSuccess'))
    emit('updated')
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
        <SheetTitle>{{ t('branches.edit') }}</SheetTitle>
        <SheetDescription>{{ t('branches.editDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6">
        <div class="space-y-2">
          <Label for="name">{{ t('branches.name') }} <span class="text-destructive">*</span></Label>
          <Input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('branches.namePlaceholder')"
            :disabled="props.branch.isHeadquarters"
            required
          />
        </div>

        <div v-if="!props.branch.isHeadquarters" class="space-y-2">
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

        <div class="space-y-2">
          <Label for="city">{{ t('form.city') }}</Label>
          <Select v-model="city">
            <SelectTrigger id="city" class="w-full">
              <SelectValue :placeholder="t('form.cityPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="c in cities" :key="c" :value="c">{{ c }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator v-if="!props.branch.isHeadquarters" />

        <div v-if="!props.branch.isHeadquarters" class="space-y-3">
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
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        <div class="space-y-2">
          <Label for="address">{{ t('branches.address') }}</Label>
          <textarea
            id="address"
            v-model="address"
            rows="3"
            :placeholder="t('branches.addressPlaceholder')"
            class="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive resize-none"
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
