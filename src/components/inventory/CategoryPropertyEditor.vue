<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Save, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PropertyData {
  id?: string
  name: string
  type: string
  isRequired: boolean
  sortOrder: number
  enumValues: string[] | null
  numberArrayMaxLength: number | null
  minValue: number | null
  maxValue: number | null
}

const PROPERTY_TYPES = ['enum', 'number', 'number_array', 'string', 'boolean', 'date'] as const

const props = defineProps<{
  property?: PropertyData
}>()

const emit = defineEmits<{
  save: [data: Record<string, unknown>]
  cancel: []
}>()

const { t } = useI18n()

const name = ref('')
const type = ref<string>('string')
const isRequired = ref(false)
const sortOrder = ref(0)
const enumValues = ref<string[]>([])
const newEnumValue = ref('')
const minValue = ref<number | null>(null)
const maxValue = ref<number | null>(null)
const numberArrayMaxLength = ref<number | null>(null)

function initForm() {
  if (props.property) {
    name.value = props.property.name
    type.value = props.property.type
    isRequired.value = props.property.isRequired
    sortOrder.value = props.property.sortOrder
    enumValues.value = props.property.enumValues ? [...props.property.enumValues] : []
    minValue.value = props.property.minValue
    maxValue.value = props.property.maxValue
    numberArrayMaxLength.value = props.property.numberArrayMaxLength
  } else {
    name.value = ''
    type.value = 'string'
    isRequired.value = false
    sortOrder.value = 0
    enumValues.value = []
    minValue.value = null
    maxValue.value = null
    numberArrayMaxLength.value = null
  }
}

watch(() => props.property, initForm, { immediate: true })

function addEnumValue() {
  const val = newEnumValue.value.trim()
  if (val && !enumValues.value.includes(val)) {
    enumValues.value.push(val)
    newEnumValue.value = ''
  }
}

function removeEnumValue(index: number) {
  enumValues.value.splice(index, 1)
}

function handleSave() {
  if (!name.value.trim()) return

  const data: Record<string, unknown> = {
    name: name.value.trim(),
    type: type.value,
    isRequired: isRequired.value,
    sortOrder: sortOrder.value,
  }

  if (type.value === 'enum') {
    data.enumValues = enumValues.value.length > 0 ? enumValues.value : null
  }

  if (type.value === 'number') {
    data.minValue = minValue.value
    data.maxValue = maxValue.value
  }

  if (type.value === 'number_array') {
    data.numberArrayMaxLength = numberArrayMaxLength.value
  }

  emit('save', data)
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <Label class="text-xs">{{ t('inventory.propertyName') }} *</Label>
        <Input
          v-model="name"
          :placeholder="t('inventory.propertyName')"
          class="h-8 text-sm"
        />
      </div>
      <div class="space-y-1.5">
        <Label class="text-xs">{{ t('inventory.propertyType') }}</Label>
        <Select v-model="type">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="pt in PROPERTY_TYPES"
              :key="pt"
              :value="pt"
            >
              {{ t(`inventory.propertyTypes.${pt}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <label class="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" v-model="isRequired" class="h-4 w-4 rounded border-input" />
      <span class="text-xs">{{ t('inventory.required') }}</span>
    </label>

    <template v-if="type === 'enum'">
      <div class="space-y-1.5">
        <Label class="text-xs">{{ t('inventory.enumValues') }}</Label>
        <div class="flex flex-wrap gap-1 mb-2">
          <span
            v-for="(val, idx) in enumValues"
            :key="idx"
            class="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full"
          >
            {{ val }}
            <button
              class="hover:text-destructive"
              @click="removeEnumValue(idx)"
              :aria-label="t('common.delete')"
            >
              <X class="h-3 w-3" />
            </button>
          </span>
        </div>
        <div class="flex gap-2">
          <Input
            v-model="newEnumValue"
            :placeholder="t('inventory.addEnumValue')"
            class="h-8 text-sm flex-1"
            @keyup.enter="addEnumValue"
          />
          <Button
            variant="outline"
            size="sm"
            class="h-8"
            @click="addEnumValue"
            :disabled="!newEnumValue.trim()"
          >
            <Plus class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </template>

    <template v-if="type === 'number'">
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <Label class="text-xs">{{ t('inventory.minValue') }}</Label>
          <Input
            v-model.number="minValue"
            type="number"
            class="h-8 text-sm"
          />
        </div>
        <div class="space-y-1.5">
          <Label class="text-xs">{{ t('inventory.maxValue') }}</Label>
          <Input
            v-model.number="maxValue"
            type="number"
            class="h-8 text-sm"
          />
        </div>
      </div>
    </template>

    <template v-if="type === 'number_array'">
      <div class="space-y-1.5">
        <Label class="text-xs">{{ t('inventory.numberArrayMaxLength') }}</Label>
        <Input
          v-model.number="numberArrayMaxLength"
          type="number"
          min="1"
          class="h-8 text-sm"
        />
      </div>
    </template>

    <div class="flex items-center justify-end gap-2 pt-2">
      <Button variant="outline" size="sm" class="h-7" @click="emit('cancel')">
        <X class="h-3 w-3 mr-1" />
        {{ t('common.cancel') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-7"
        @click="handleSave"
        :disabled="!name.trim()"
      >
        <Save class="h-3 w-3 mr-1" />
        {{ t('common.save') }}
      </Button>
    </div>
  </div>
</template>
