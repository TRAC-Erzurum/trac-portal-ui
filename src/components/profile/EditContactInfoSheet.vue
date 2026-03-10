<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, Plus, Trash2, X } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LocatorMapPicker } from '@/components/shared'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface Address {
  type: string
  address: string
  qth: string
}

interface UserProfile {
  phoneNumbers?: string[] | null
  addresses?: Address[] | null
}

const props = defineProps<{
  open: boolean
  initialProfile?: UserProfile | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()
const phoneNumbers = ref<string[]>([])
const addresses = ref<Address[]>([])
const isLoading = ref(false)

watch(() => props.open, (isOpen) => {
  if (isOpen && props.initialProfile) {
    phoneNumbers.value = props.initialProfile.phoneNumbers ? [...props.initialProfile.phoneNumbers] : []
    addresses.value = props.initialProfile.addresses ? JSON.parse(JSON.stringify(props.initialProfile.addresses)) : []
  }
})

function addPhone() {
  phoneNumbers.value.push('')
}

function removePhone(index: number) {
  phoneNumbers.value.splice(index, 1)
}

function addAddress() {
  addresses.value.push({ type: '', address: '', qth: '' })
}

function removeAddress(index: number) {
  addresses.value.splice(index, 1)
}

function handleQthSelect(index: number, val: { gridSquare: string; city: string; district: string } | null) {
  if (val) {
    const addr = addresses.value[index]
    if (addr) {
      addr.qth = val.gridSquare
    }
  }
}

async function handleSubmit() {
  isLoading.value = true
  try {
    const payload = {
      phoneNumbers: phoneNumbers.value.filter(p => !!p),
      addresses: addresses.value.filter(a => !!a.address || !!a.qth),
    }

    await api.patch('/user', payload)
    toast.success(t('profile.profileUpdated'))
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
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('account.contactInfo') }}</SheetTitle>
        <SheetDescription>{{ t('profile.editContactDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-10 pb-10">
        <!-- Phone Numbers -->
        <div class="space-y-4">
          <Label class="text-base font-semibold">{{ t('account.phoneNumbers') }}</Label>
          
          <div class="space-y-3">
            <div v-for="(_, index) in phoneNumbers" :key="index" class="flex gap-2">
              <Input 
                v-model="phoneNumbers[index]" 
                type="tel" 
                placeholder="+90 (5xx) xxx xx xx"
                @input="phoneNumbers[index] = ($event.target as HTMLInputElement).value.replace(/[^\d+()\s-]/g, '')"
              />
              <Button type="button" variant="ghost" size="icon-sm" @click="removePhone(index)" class="trac-btn-icon-destructive shrink-0">
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>

            <Button type="button" variant="outline" class="w-full border-dashed py-6 hover:text-primary hover:border-primary/50 transition-all" @click="addPhone">
              <Plus class="w-4 h-4 mr-2" />
              {{ t('account.addPhone') }}
            </Button>
          </div>
        </div>

        <!-- Addresses -->
        <div class="space-y-4">
          <Label class="text-base font-semibold">{{ t('account.addresses') }}</Label>
          
          <div class="space-y-4">
            <div v-for="(addr, index) in addresses" :key="index" class="space-y-4 p-4 border rounded-lg relative bg-muted/20">
              <Button type="button" variant="ghost" size="icon-sm" @click="removeAddress(index)" class="absolute top-2 right-2 trac-btn-icon-destructive">
                <Trash2 class="w-4 h-4" />
              </Button>
              
              <div class="space-y-2 pr-8">
                <Label>{{ t('account.addressType') }} <span class="text-destructive">*</span></Label>
                <Select v-model="addr.type" required>
                  <SelectTrigger>
                    <SelectValue :placeholder="t('account.addressTypePlaceholder')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{{ t('account.addressHome') }}</SelectItem>
                    <SelectItem value="work">{{ t('account.addressWork') }}</SelectItem>
                    <SelectItem value="other">{{ t('account.addressOther') }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label>{{ t('profile.qth') }}</Label>
                <LocatorMapPicker
                  :model-value="{ gridSquare: addr.qth, city: '', district: '' }"
                  :standalone="false"
                  class="h-48 border rounded-md"
                  @update:model-value="(val) => handleQthSelect(index, val)"
                />
              </div>

              <div class="space-y-2">
                <Label>{{ t('account.addressFull') }} <span class="text-destructive">*</span></Label>
                <Textarea 
                  v-model="addr.address" 
                  :placeholder="t('account.addressFull')"
                  class="resize-none"
                  :rows="3"
                  required
                />
              </div>
            </div>

            <Button type="button" variant="outline" class="w-full border-dashed py-8 hover:text-primary hover:border-primary/50 transition-all" @click="addAddress">
              <Plus class="w-4 h-4 mr-2" />
              {{ t('account.addAddress') }}
            </Button>
          </div>
        </div>

        <div class="trac-sheet-actions border-t bg-background sticky bottom-0 z-10 -mx-4 px-4 pb-2 mt-auto pt-6">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" class="trac-sheet-btn" :loading="isLoading">
            <Check class="h-4 w-4 mr-2" />
            {{ t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
