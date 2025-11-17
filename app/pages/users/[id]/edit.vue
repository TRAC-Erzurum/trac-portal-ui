<template>
  <v-container class="my-8">
    <v-card class="dashboard-card dashboard-card--primary">
      <div class="card-title">
        <v-icon size="32" :color="getIconColor(1)" class="mr-4">mdi-account-edit</v-icon>
        <div class="title-content">
          <div class="text-h6">{{ $t('pages.users.edit.title') }}</div>
        </div>
      </div>

      <v-card-text>
        <div class="session-stats">
          <div class="stats-row justify-center">
            <div class="avatar-section">
              <v-avatar size="150" class="profile-avatar mb-4">
                <v-img :src="getImageUrl(form.picture)" />
              </v-avatar>

              <div
                class="upload-area"
                :class="{ dragover: isDragging }"
                @dragenter.prevent="isDragging = true"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="hidden-input"
                  @change="handlePictureChange"
                />
                <div class="upload-content" @click="$refs.fileInput.click()">
                  <v-icon size="32" color="primary" class="mb-2">mdi-cloud-upload</v-icon>
                  <div class="text-body-1 mb-1">{{ $t('pages.users.edit.dragOrClick') }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('pages.users.edit.allowedTypes') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-card form-card">
              <v-form v-model="form.valid" @submit.prevent="handleSubmit" class="w-100">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.fullName"
                      :label="$t('pages.users.edit.fullName')"
                      density="comfortable"
                      variant="outlined"
                      prepend-inner-icon="mdi-account"
                      class="input-field"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.email"
                      :label="$t('pages.users.edit.email')"
                      density="comfortable"
                      disabled
                      variant="outlined"
                      prepend-inner-icon="mdi-email"
                      class="input-field"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </div>
          </div>

          <div class="management-actions">
            <v-btn
              color="primary"
              :disabled="!form.valid"
              size="large"
              @click="handleSubmit"
              class="management-button"
              elevation="2"
            >
              <v-icon start size="24">mdi-content-save</v-icon>
              {{ $t('common.save') }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style lang="scss" scoped>
.max-width-300 {
  max-width: 300px;
}

.user-avatar {
  border: 3px solid rgb(var(--v-theme-primary));
}

:deep(.v-field.v-field--disabled) {
  opacity: 0.8;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 300px;
  width: 100%;
}

.profile-avatar {
  border: 3px solid rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.upload-area {
  width: 100%;
  border: 2px dashed rgba(var(--v-theme-primary), 0.5);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(var(--v-theme-surface), 0.8);

  &:hover {
    background: rgba(var(--v-theme-primary), 0.05);
    transform: translateY(-4px);
  }

  &.dragover {
    background: rgba(var(--v-theme-primary), 0.1);
    border-style: solid;
  }
}

.form-card {
  width: 100%;
}

.input-field {
  transition: all 0.3s ease;

  &:hover,
  &:focus-within {
    transform: translateY(-2px);
  }
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hidden-input {
  display: none;
}
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { Role } from '~/constants/enums/role'
import { useCardStyles } from '~/composables/useCardStyles'
import { useImageUrl } from '~/composables/useImageUrl'

const { $auth } = useNuxtApp()
const { t } = useI18n()
const route = useRoute()
const api = useApi()
const { getImageUrl } = useImageUrl()
const { successToast, errorToast } = useToast()
const { getIconColor } = useCardStyles()

const form = ref({
  valid: true,
  fullName: '',
  picture: '',
  email: '',
})

const pictureFile = ref(null)
const isDragging = ref(false)
const fileInput = ref(null)

onMounted(() => {
  if (!allowEdit()) {
    errorToast(t('error.forbidden'))
    return
  }
  fetchUser()
})

const handleDrop = (event) => {
  console.debug('handleDrop called', {
    files: event.dataTransfer?.files,
    fileCount: event.dataTransfer?.files?.length,
  })
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    pictureFile.value = file
    handlePictureChange(null)
  } else {
    errorToast(t('pages.users.edit.invalidFileType'))
  }
}

const handlePictureChange = async (event) => {
  console.debug('handlePictureChange called', { event, hasFiles: !!event?.target?.files })
  if (event?.target?.files) {
    pictureFile.value = event.target.files[0]
  }
  const file = pictureFile.value
  console.debug('File to upload:', {
    file,
    type: file?.type,
    size: file?.size,
    name: file?.name,
  })
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorToast(t('pages.users.edit.invalidFileType'))
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    errorToast(t('pages.users.edit.fileTooLarge'))
    return
  }

  try {
    const compressedImage = await compressImage(file)
    console.debug('Compressed image:', {
      type: compressedImage.type,
      size: compressedImage.size,
      name: compressedImage.name,
    })

    const formData = new FormData()
    console.debug('FormData before append:', formData)
    formData.append('file', compressedImage)
    formData.append('type', 'profile')
    console.debug('FormData entries:', Array.from(formData.entries()))

    console.debug('Sending request to upload file...')
    const response = await api.upload('/user/upload', formData)
    console.debug('Upload response:', response)

    form.value.picture = response.url
  } catch (err) {
    console.error('Upload error details:', {
      error: err,
      response: err.response?.data,
      status: err.response?.status,
    })
    errorToast(t('pages.users.edit.uploadError'))
  }
}

const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      console.debug('FileReader loaded:', { result: !!event.target?.result })
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        console.debug('Image loaded:', { width: img.width, height: img.height })
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            console.debug('Blob created:', { size: blob.size, type: blob.type })
            resolve(
              new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
            )
          },
          'image/jpeg',
          0.7
        )
      }
    }
    reader.onerror = (error) => reject(error)
  })
}

const handleSubmit = async () => {
  try {
    const userData = {
      fullName: form.value.fullName,
      picture: form.value.picture,
    }

    await api.patch(getSubmitUrl(), userData)
    successToast(t('pages.users.edit.updateSuccess'))
    return navigateTo(`/users/${route.params.id}/profile`)
  } catch (err) {
    errorToast(t('pages.users.edit.updateError'))
    console.error(err)
  }
}

const fetchUser = async () => {
  try {
    const data = await api.get(getFetchUrl())
    form.value = {
      ...form.value,
      ...data,
    }
  } catch (err) {
    console.error(err)
    errorToast(t('pages.users.edit.fetchError'))
  }
}

const allowEdit = () => {
  return ($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) || $auth.user.value?.id === route.params.id
}

const getSubmitUrl = () => {
  if (($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) && $auth.user.value?.id !== route.params.id) {
    return `/user/${route.params.id}`
  }
  return `/user`
}

const getFetchUrl = () => {
  if ($auth.user.value?.role === Role.GUEST) {
    return `/user/profile`
  }
  return `/user/${route.params.id}`
}

definePageMeta({
  requiresAuth: true,
  roles: [Role.GUEST],
  key: (route) => route.fullPath,
})
</script>
