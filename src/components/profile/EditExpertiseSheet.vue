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

interface Training {
  title: string
  institution?: string
  year?: number
}

interface UserProfile {
  expertiseAreas?: string[] | null
  trainings?: Training[] | null
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
const expertiseAreas = ref<string[]>([])
const newExpertiseInput = ref('')
const trainings = ref<Training[]>([])
const isLoading = ref(false)

watch(() => props.open, (isOpen) => {
  if (isOpen && props.initialProfile) {
    expertiseAreas.value = props.initialProfile.expertiseAreas ? [...props.initialProfile.expertiseAreas] : []
    trainings.value = props.initialProfile.trainings ? JSON.parse(JSON.stringify(props.initialProfile.trainings)) : []
  }
})

function addExpertise() {
  const val = newExpertiseInput.value.trim()
  if (val && !expertiseAreas.value.includes(val)) {
    expertiseAreas.value.push(val)
    newExpertiseInput.value = ''
  }
}

function removeExpertise(index: number) {
  expertiseAreas.value.splice(index, 1)
}

function addTraining() {
  trainings.value.push({ title: '', institution: '', year: undefined })
}

function removeTraining(index: number) {
  trainings.value.splice(index, 1)
}

async function handleSubmit() {
  isLoading.value = true
  try {
    const payload = {
      expertiseAreas: expertiseAreas.value,
      trainings: trainings.value.filter(t => !!t.title),
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
        <SheetTitle>{{ t('account.editExpertise') }}</SheetTitle>
        <SheetDescription>{{ t('account.editExpertiseDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-10 pb-10">
        <!-- Expertise Areas -->
        <div class="space-y-4">
          <Label class="text-base font-semibold">{{ t('account.expertiseAreas') }}</Label>

          <div class="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-muted/30">
            <div v-for="(area, idx) in expertiseAreas" :key="idx"
              class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground gap-1 px-3 py-1">
              {{ area }}
              <Button type="button" variant="ghost" size="icon-sm" @click="removeExpertise(idx)" class="trac-chip-remove-btn">
                <X class="h-3 w-3" />
              </Button>
            </div>
            <p v-if="!expertiseAreas.length" class="text-sm text-muted-foreground italic px-1">
              {{ t('account.expertiseEmpty') }}
            </p>
          </div>

          <div class="flex gap-2">
            <Input v-model="newExpertiseInput" :placeholder="t('account.expertiseAreaPlaceholder')"
              @keyup.enter.prevent="addExpertise" />
            <Button type="button" variant="outline" size="sm" @click="addExpertise">
              <Plus class="h-4 w-4 mr-2" />
              {{ t('account.addExpertiseArea') }}
            </Button>
          </div>
        </div>

        <!-- Trainings & Certificates -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <Label class="text-base font-semibold">{{ t('account.trainings') }}</Label>
          </div>

          <div class="space-y-4">
            <div v-for="(training, index) in trainings" :key="index"
              class="space-y-3 p-4 border rounded-lg relative bg-muted/20">
              <Button type="button" variant="ghost" size="icon-sm" @click="removeTraining(index)"
                class="absolute top-2 right-2 trac-btn-icon-destructive">
                <Trash2 class="w-4 h-4" />
              </Button>

              <div class="space-y-4 pr-8">
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div class="space-y-2 sm:col-span-3">
                    <Label>{{ t('account.trainingTitle') }}</Label>
                    <Input v-model="training.title" />
                  </div>
                  <div class="space-y-2">
                    <Label>{{ t('account.trainingYear') }}</Label>
                    <Input v-model.number="training.year" type="number" />
                  </div>
                </div>

                <div class="space-y-2">
                  <Label>{{ t('account.trainingInstitution') }}</Label>
                  <Input v-model="training.institution" />
                </div>
              </div>
            </div>

            <Button type="button" variant="outline" class="w-full border-dashed" @click="addTraining">
              <Plus class="w-4 h-4 mr-2" />
              {{ t('account.addTraining') }}
            </Button>
          </div>
        </div>

        <div class="trac-sheet-actions border-t pt-6">
          <Button type="button" variant="outline" class="trac-sheet-btn" :disabled="isLoading" @click="emit('update:open', false)">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" class="trac-sheet-btn" :disabled="isLoading">
            <Check class="h-4 w-4 mr-2" />
            <span v-if="isLoading">{{ t('common.saving') }}...</span>
            <span v-else>{{ t('common.save') }}</span>
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
