interface ToastOptions {
  message: string
  color?: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

export const useToast = () => {
  const toast = useState('toast', () => ({
    show: false,
    message: '',
    color: 'success',
    timeout: 3000,
  }))

  const showToast = (options: ToastOptions) => {
    toast.value = {
      show: true,
      message: options.message,
      color: options.color || 'success',
      timeout: options.timeout || 3000,
    }
  }

  const successToast = (message: string) => {
    showToast({ message, color: 'success' })
  }

  const errorToast = (message: string) => {
    showToast({ message, color: 'error' })
  }

  const warningToast = (message: string) => {
    showToast({ message, color: 'warning' })
  }

  const hideToast = () => {
    toast.value.show = false
  }

  return {
    toast,
    showToast,
    hideToast,
    successToast,
    errorToast,
    warningToast,
  }
}
