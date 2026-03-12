<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type PropertyType = 'enum' | 'number' | 'number_array' | 'string' | 'boolean' | 'date'

interface PropertyDefinition {
  id: string
  categoryId: string
  name: string
  type: PropertyType
  isRequired: boolean
  sortOrder: number
  enumValues?: string[] | null
  numberArrayMaxLength?: number | null
  minValue?: number | null
  maxValue?: number | null
}

interface PropertyValue {
  propertyDefinitionId: string
  value: any
}

interface Props {
  properties: PropertyDefinition[]
  modelValue: PropertyValue[]
  errors?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  errors: () => ({}),
})

const emit = defineEmits<{
  'update:modelValue': [values: PropertyValue[]]
}>()

const { t } = useI18n()

const sortedProperties = computed(() =>
  [...props.properties].sort((a, b) => a.sortOrder - b.sortOrder),
)

function getValue(defId: string): any {
  return props.modelValue.find((v) => v.propertyDefinitionId === defId)?.value ?? null
}

function updateValue(defId: string, value: any) {
  const existing = props.modelValue.filter((v) => v.propertyDefinitionId !== defId)
  emit('update:modelValue', [...existing, { propertyDefinitionId: defId, value }])
}

function getNumberArrayValue(defId: string): number[] {
  const val = getValue(defId)
  if (Array.isArray(val)) return val
  return []
}

function updateNumberArrayElement(defId: string, index: number, numVal: string) {
  const arr = [...getNumberArrayValue(defId)]
  arr[index] = numVal === '' ? 0 : Number(numVal)
  updateValue(defId, arr)
}

function addNumberArrayElement(defId: string, maxLen?: number | null) {
  const arr = [...getNumberArrayValue(defId)]
  if (maxLen && arr.length >= maxLen) return
  arr.push(0)
  updateValue(defId, arr)
}

function removeNumberArrayElement(defId: string, index: number) {
  const arr = [...getNumberArrayValue(defId)]
  arr.splice(index, 1)
  updateValue(defId, arr)
}

function rangeHint(prop: PropertyDefinition): string {
  if (prop.minValue != null && prop.maxValue != null)
    return `${prop.minValue} – ${prop.maxValue}`
  if (prop.minValue != null) return `≥ ${prop.minValue}`
  if (prop.maxValue != null) return `≤ ${prop.maxValue}`
  return ''
}
</script>

<template>
  <div class="space-y-4">
    <div v-for="prop in sortedProperties" :key="prop.id" class="space-y-1.5">
      <!-- Boolean -->
      <template v-if="prop.type === 'boolean'">
        <div class="flex items-center gap-2">
          <Checkbox
            :id="`prop-${prop.id}`"
            :checked="!!getValue(prop.id)"
            @update:checked="(v: boolean) => updateValue(prop.id, v)"
          />
          <Label :for="`prop-${prop.id}`" class="text-sm cursor-pointer">
            {{ prop.name }}
            <span v-if="prop.isRequired" class="text-destructive ml-0.5">*</span>
          </Label>
        </div>
      </template>

      <!-- All other types -->
      <template v-else>
        <Label :for="`prop-${prop.id}`" class="text-sm">
          {{ prop.name }}
          <span v-if="prop.isRequired" class="text-destructive ml-0.5">*</span>
        </Label>

        <!-- ENUM -->
        <template v-if="prop.type === 'enum'">
          <Select
            :model-value="getValue(prop.id) ?? undefined"
            @update:model-value="(v) => updateValue(prop.id, v === null ? undefined : String(v))"
          >
            <SelectTrigger :id="`prop-${prop.id}`" class="w-full">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in (prop.enumValues || [])"
                :key="option"
                :value="option"
              >
                {{ option }}
              </SelectItem>
            </SelectContent>
          </Select>
        </template>

        <!-- NUMBER -->
        <template v-else-if="prop.type === 'number'">
          <Input
            :id="`prop-${prop.id}`"
            type="number"
            :model-value="getValue(prop.id) ?? ''"
            :min="prop.minValue ?? undefined"
            :max="prop.maxValue ?? undefined"
            @update:model-value="(v: string | number) => updateValue(prop.id, v === '' ? null : Number(v))"
          />
          <p v-if="rangeHint(prop)" class="text-xs text-muted-foreground">
            {{ rangeHint(prop) }}
          </p>
        </template>

        <!-- NUMBER_ARRAY -->
        <template v-else-if="prop.type === 'number_array'">
          <div class="flex flex-wrap items-center gap-1.5">
            <template v-for="(num, idx) in getNumberArrayValue(prop.id)" :key="idx">
              <span v-if="idx > 0" class="text-sm text-muted-foreground">×</span>
              <div class="relative">
                <Input
                  type="number"
                  class="w-20 pr-6"
                  :model-value="num"
                  @update:model-value="(v: string | number) => updateNumberArrayElement(prop.id, idx, String(v))"
                />
                <button
                  type="button"
                  class="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  :aria-label="t('common.delete')"
                  @click="removeNumberArrayElement(prop.id, idx)"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </template>
            <Button
              v-if="!prop.numberArrayMaxLength || getNumberArrayValue(prop.id).length < prop.numberArrayMaxLength"
              variant="outline"
              size="sm"
              class="h-9 w-9 p-0"
              type="button"
              :aria-label="t('common.add')"
              @click="addNumberArrayElement(prop.id, prop.numberArrayMaxLength)"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </div>
          <p v-if="prop.numberArrayMaxLength" class="text-xs text-muted-foreground">
            {{ t('inventory.numberArrayMaxLength') }}: {{ prop.numberArrayMaxLength }}
          </p>
        </template>

        <!-- STRING -->
        <template v-else-if="prop.type === 'string'">
          <Input
            :id="`prop-${prop.id}`"
            type="text"
            :model-value="getValue(prop.id) ?? ''"
            @update:model-value="(v: string | number) => updateValue(prop.id, v === '' ? null : v)"
          />
        </template>

        <!-- DATE -->
        <template v-else-if="prop.type === 'date'">
          <Input
            :id="`prop-${prop.id}`"
            type="date"
            :model-value="getValue(prop.id) ?? ''"
            @update:model-value="(v: string | number) => updateValue(prop.id, v === '' ? null : v)"
          />
        </template>
      </template>

      <p
        v-if="errors?.[prop.id]"
        class="text-xs text-destructive"
      >
        {{ errors[prop.id] }}
      </p>
    </div>
  </div>
</template>
