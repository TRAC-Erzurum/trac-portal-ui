import { ref, computed, watch, type Ref } from 'vue'

export type ValidationRule<T = any> = (value: T) => string | true

export interface FieldValidator {
  [fieldName: string]: ValidationRule[]
}

export interface FieldErrors {
  [fieldName: string]: string | undefined
}

export function useFormValidation(
  validators: FieldValidator,
  fieldsMap?: Record<string, Ref<any>>
) {
  const fieldErrors = ref<FieldErrors>({})
  const touched = ref<Set<string>>(new Set())

  /**
   * Validate a single field with provided value
   */
  const validateField = (fieldName: string, value?: any): string | undefined => {
    const fieldValue = value !== undefined ? value : (fieldsMap?.[fieldName]?.value)
    const rules = validators[fieldName] || []
    
    for (const rule of rules) {
      const result = rule(fieldValue)
      if (result !== true) {
        return result
      }
    }
    
    return undefined
  }

  /**
   * Validate all fields
   */
  const validateForm = (): boolean => {
    const errors: FieldErrors = {}
    let hasErrors = false

    for (const fieldName of Object.keys(validators)) {
      const error = validateField(fieldName)
      if (error) {
        errors[fieldName] = error
        hasErrors = true
      }
    }

    fieldErrors.value = errors
    return !hasErrors
  }

  /**
   * Get error for a specific field
   */
  const getFieldError = (fieldName: string): string | undefined => {
    return fieldErrors.value[fieldName]
  }

  /**
   * Check if a field has error
   */
  const hasError = (fieldName: string): boolean => {
    return Boolean(fieldErrors.value[fieldName])
  }

  /**
   * Mark a field as touched
   */
  const touchField = (fieldName: string) => {
    touched.value.add(fieldName)
  }

  /**
   * Check if a field is touched
   */
  const isTouched = (fieldName: string): boolean => {
    return touched.value.has(fieldName)
  }

  /**
   * Clear error for a specific field
   */
  const clearFieldError = (fieldName: string) => {
    fieldErrors.value[fieldName] = undefined
  }

  /**
   * Clear all errors
   */
  const clearErrors = () => {
    fieldErrors.value = {}
  }

  /**
   * Reset touched fields
   */
  const resetTouched = () => {
    touched.value.clear()
  }

  /**
   * Check if form has any errors
   */
  const hasErrors = computed(() => {
    return Object.values(fieldErrors.value).some(error => error !== undefined)
  })

  /**
   * Check if a field should show error (touched or submitted)
   */
  const shouldShowError = (fieldName: string, isSubmitted: boolean = false): boolean => {
    return (isTouched(fieldName) || isSubmitted) && hasError(fieldName)
  }

  /**
   * Setup watchers for all fields to auto-clear errors when they change
   */
  const setupFieldWatchers = () => {
    if (!fieldsMap) return
    
    for (const [fieldName, fieldRef] of Object.entries(fieldsMap)) {
      watch(
        () => fieldRef.value,
        () => {
          if (fieldErrors.value[fieldName]) {
            clearFieldError(fieldName)
          }
        }
      )
    }
  }

  // Setup field watchers immediately
  setupFieldWatchers()

  return {
    fieldErrors,
    touched,
    validateField,
    validateForm,
    getFieldError,
    hasError,
    hasErrors,
    touchField,
    isTouched,
    clearFieldError,
    clearErrors,
    resetTouched,
    shouldShowError,
  }
}
