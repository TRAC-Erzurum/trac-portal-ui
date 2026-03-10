<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, Plus, Trash2, X } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface EmergencyContact {
  name: string
  callSign?: string
  phone: string
}

interface UserProfile {
  emergencyContacts?: EmergencyContact[] | null
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
const emergencyContacts = ref<EmergencyContact[]>([])
const isLoading = ref(false)

watch(() => props.open, (isOpen) => {
  if (isOpen && props.initialProfile) {
    emergencyContacts.value = props.initialProfile.emergencyContacts ? JSON.parse(JSON.stringify(props.initialProfile.emergencyContacts)) : []
  }
})

function addEmergencyContact() {
  emergencyContacts.value.push({ name: '', callSign: '', phone: '' })
}

function removeEmergencyContact(index: number) {
  emergencyContacts.value.splice(index, 1)
}

async function handleSubmit() {
  isLoading.value = true
  try {
    const payload = {
      emergencyContacts: emergencyContacts.value.filter(c => !!c.name && !!c.phone)
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
        <SheetTitle>{{ t('account.emergencyContacts') }}</SheetTitle>
        <SheetDescription>{{ t('profile.editEmergencyDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-10 pb-10">
        <div class="space-y-4">
          <Label class="text-base font-semibold">{{ t('account.emergencyContacts') }}</Label>
          
          <div class="space-y-4">
            <div v-for="(contact, index) in emergencyContacts" :key="index" class="space-y-3 p-4 border rounded-lg relative bg-muted/20">
              <Button type="button" variant="ghost" size="icon-sm" @click="removeEmergencyContact(index)" class="absolute top-2 right-2 trac-btn-icon-destructive">
                <Trash2 class="w-4 h-4" />
              </Button>
              <div class="space-y-4 pr-8">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-2">
                    <Label>{{ t('form.fullName') }}</Label>
                    <Input v-model="contact.name" />
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('form.callSign') }}</Label>
                    <Input v-model="contact.callSign" class="uppercase" />
                  </div>
                </div>
                <div class="space-y-2">
                  <Label>{{ t('account.phone') }}</Label>
                  <Input 
                    v-model="contact.phone" 
                    type="tel"
                    placeholder="+90 (5xx) xxx xx xx"
                    @input="contact.phone = ($event.target as HTMLInputElement).value.replace(/[^\d+()\s-]/g, '')"
                  />
                </div>
              </div>
            </div>

            <Button type="button" variant="outline" class="w-full border-dashed py-8 hover:text-primary hover:border-primary/50 transition-all" @click="addEmergencyContact">
              <Plus class="w-4 h-4 mr-2" />
              {{ t('account.addEmergencyContact') }}
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
