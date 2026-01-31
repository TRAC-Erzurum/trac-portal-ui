<template>
  <div class="signal-selector" :class="{ compact }">
    <div class="selector-field">
      <label class="selector-label">{{ label }}</label>
      <div class="selector-content">
        <div class="boxes">
          <div
            v-for="n in Math.min(boxCount, 10)"
            :key="n"
            class="box"
            :class="{
              active: value >= n,
              [`level-${getBoxLevel(n)}`]: true,
            }"
            @click="toggleValue(n)"
          >
            {{ n }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  boxCount: {
    type: Number,
    required: true,
    validator: (value) => value > 0 && value <= 10,
  },
  modelValue: {
    type: Number,
    default: null,
  },
  colSize: {
    type: Number,
    default: 6,
  },
  levels: {
    type: Array,
    default: () => [
      { max: 2, level: 1 },
      { max: 4, level: 2 },
      { max: 6, level: 3 },
      { max: 8, level: 4 },
      { max: Infinity, level: 5 },
    ],
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const value = ref(props.modelValue)

const toggleValue = (newValue) => {
  value.value = value.value === newValue ? null : newValue
  emit('update:modelValue', value.value)
}

const getBoxLevel = (n) => {
  const level = props.levels.find((l) => n <= l.max)
  return level ? level.level : 1
}

watch(
  () => props.modelValue,
  (newValue) => {
    value.value = newValue
  }
)
</script>

<style lang="scss" scoped>
.signal-selector {
  position: relative;
  width: 100%;
}

.selector-field {
  position: relative;
  border-radius: 4px;
  border: thin solid rgba(var(--v-theme-on-surface), 0.38);
  padding: 16px;
  min-height: 56px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(var(--v-theme-on-surface), 0.86);
  }

  &:focus-within {
    border-color: rgb(var(--v-theme-primary));
    border-width: 2px;
    padding: 15px;
  }
}

.selector-label {
  position: absolute;
  left: 8px;
  top: -10px;
  padding: 0 4px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  background: rgb(var(--v-theme-surface));
  transition: color 0.2s ease;

  .selector-field:hover & {
    color: rgba(var(--v-theme-on-surface), 0.86);
  }

  .selector-field:focus-within & {
    color: rgb(var(--v-theme-primary));
  }
}

.selector-content {
  display: flex;
  align-items: center;
}

.boxes {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  min-width: 0;
}

.box {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover:not(.active) {
    background-color: rgba(var(--v-theme-on-surface), 0.12);
  }

  &.active {
    color: white;

    &.level-1 {
      background-color: #d32f2f;
    }
    &.level-2 {
      background-color: #f57c00;
    }
    &.level-3 {
      background-color: #ffa000;
    }
    &.level-4 {
      background-color: #c0ca33;
    }
    &.level-5 {
      background-color: #388e3c;
    }
  }
}

@media (max-width: 600px) {
  .selector-field {
    padding: 12px;

    &:focus-within {
      padding: 11px;
    }
  }

  .box {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
  }

  .boxes {
    gap: 3px;
  }
}

.signal-selector.compact {
  .selector-field {
    padding: 8px 12px;
    min-height: 40px;

    &:focus-within {
      padding: 7px 11px;
    }
  }

  .selector-label {
    top: -8px;
    font-size: 0.75rem;
  }

  .box {
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    font-size: 0.75rem;
  }

  .boxes {
    gap: 2px;
  }
}
</style>
