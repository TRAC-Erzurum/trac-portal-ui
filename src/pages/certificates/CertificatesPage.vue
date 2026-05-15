<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Award, Download, Loader2, UserRoundSearch } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { SearchInput } from '@/components/shared'
import { Button } from '@/components/ui/button'
import CertificateFilledPreview from '@/components/certificates/CertificateFilledPreview.vue'
import CertificatePreviewDialog from '@/components/certificates/CertificatePreviewDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { api, API_BASE, type ApiError } from '@/lib/api'
import { debounce } from '@/lib/utils'
import { formatCallSign, formatDateLong } from '@/lib/formatters'
import { getFilenameFromContentDisposition } from '@/lib/content-disposition'
import { translateError } from '@/i18n'
import { useAsyncStaleGuard } from '@/composables'
import { useCertificateAssets, type CertificatePreviewData } from '@/composables/useCertificateAssets'

interface OperatorSearchResult {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  city?: string
  district?: string
}

interface OperatorCertificateItem {
  attendeeId: string
  netId: string
  netName: string
  netDate: string
  branchName: string
  certificateTemplateId: string
}

interface SelectedOperator {
  id: string
  label: string
  fullName?: string
}

const { t, locale } = useI18n()
const authStore = useAuthStore()

const searchQuery = ref('')
const searchResults = ref<OperatorSearchResult[]>([])
const searchResultsQuery = ref('')
const selectedOperator = ref<SelectedOperator | null>(null)
const certificates = ref<OperatorCertificateItem[]>([])
const isSearchingOperators = ref(false)
const isLoadingCertificates = ref(false)
const isDownloadingAll = ref(false)
const certificatePreviewDialogCert = ref<OperatorCertificateItem | null>(null)

const {
  certificatePreviews,
  isLoadingCertificatePreviews,
  downloadingAttendeeId,
  loadCertificatePreviews,
  resetCertificatePreviews,
  downloadCertificate,
} = useCertificateAssets()

const operatorSearchGuard = useAsyncStaleGuard()
const certificateListGuard = useAsyncStaleGuard()
const certificatePreviewGuard = useAsyncStaleGuard()

const currentUserOperator = computed(() => authStore.user?.operator ?? null)
const selectedOperatorLabel = computed(() => selectedOperator.value?.label ?? '')
const showSearchResults = computed(
  () => searchResultsQuery.value === searchQuery.value.trim() && searchResults.value.length > 0
)

const formatOperatorLabel = (op: { prefix?: string; callSign: string; suffix?: string }) =>
  formatCallSign(op)

const getDisplayName = (op: OperatorSearchResult) => op.fullName?.trim() || ''

const loadCertificatesForOperator = async (operatorId: string) => {
  const token = certificateListGuard.beginReplace()
  isLoadingCertificates.value = true
  resetCertificatePreviews()
  try {
    const items = await api.get<OperatorCertificateItem[]>(`/operator/${operatorId}/certificates`)
    if (!certificateListGuard.isCurrent(token)) return
    certificates.value = items || []
    await loadCertificatePreviews(items || [])
  } catch (e) {
    if (!certificateListGuard.isCurrent(token)) return
    certificates.value = []
    resetCertificatePreviews()
    const error = e as ApiError
    toast.error(translateError(error.message || 'error.serverError'))
  } finally {
    if (certificateListGuard.isCurrent(token)) {
      isLoadingCertificates.value = false
    }
  }
}

const setSelectedOperator = (op: SelectedOperator) => {
  selectedOperator.value = op
  searchQuery.value = op.label
}

const syncCurrentUserOperator = async () => {
  const op = currentUserOperator.value
  if (!op?.id) {
    selectedOperator.value = null
    searchQuery.value = ''
    certificates.value = []
    resetCertificatePreviews()
    return
  }

  const current = {
    id: op.id,
    label: formatOperatorLabel(op),
    fullName: op.fullName,
  }
  const shouldReload = selectedOperator.value?.id !== current.id
  setSelectedOperator(current)
  if (shouldReload) {
    await loadCertificatesForOperator(current.id)
  }
}

const searchOperators = debounce(async (query: string) => {
  const term = query.trim()
  if (term.length < 2) {
    searchResults.value = []
    isSearchingOperators.value = false
    return
  }

  const token = operatorSearchGuard.beginReplace()
  isSearchingOperators.value = true
  try {
    const results = await api.get<OperatorSearchResult[]>(
      `/operator/search?q=${encodeURIComponent(term)}&limit=10`
    )
    if (!operatorSearchGuard.isCurrent(token)) return
    if (term !== searchQuery.value.trim()) return
    searchResults.value = results || []
    searchResultsQuery.value = term
  } catch {
    if (!operatorSearchGuard.isCurrent(token)) return
    if (term !== searchQuery.value.trim()) return
    searchResults.value = []
    searchResultsQuery.value = term
  } finally {
    if (operatorSearchGuard.isCurrent(token)) {
      isSearchingOperators.value = false
    }
  }
}, 300)

watch(currentUserOperator, () => {
  void syncCurrentUserOperator()
}, { immediate: true })

watch(searchQuery, (value) => {
  const trimmed = value.trim()
  operatorSearchGuard.beginReplace()
  searchResults.value = []
  searchResultsQuery.value = ''
  if (!trimmed) {
    void syncCurrentUserOperator()
    return
  }
  if (trimmed === selectedOperatorLabel.value) {
    return
  }
  selectedOperator.value = null
  certificates.value = []
  resetCertificatePreviews()
  searchOperators(trimmed)
})

const selectOperator = (op: OperatorSearchResult) => {
  const label = formatOperatorLabel(op)
  setSelectedOperator({ id: op.id, label, fullName: op.fullName })
  searchResults.value = []
  void loadCertificatesForOperator(op.id)
}

const downloadAllCertificates = async () => {
  if (!selectedOperator.value || isDownloadingAll.value || !certificates.value.length) return
  isDownloadingAll.value = true
  try {
    const res = await fetch(
      `${API_BASE}/operator/${selectedOperator.value.id}/certificates/download-all`,
      { credentials: 'include' },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'error.serverError')
    }
    const blob = await res.blob()
    const filename =
      getFilenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
      `${selectedOperator.value?.label || 'certificates'}-certificates.zip`.replace(/[/\\?%*:|"<>]/g, '-')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(t('certificates.downloadAllSuccess'))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error.serverError'
    toast.error(translateError(msg))
  } finally {
    isDownloadingAll.value = false
  }
}
</script>

<template>
  <AppLayout :title="t('nav.certificates')" :breadcrumb-label="t('nav.certificates')">
    <div class="space-y-6">
      <section class="space-y-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div class="w-full min-w-0 lg:max-w-2xl">
            <SearchInput
              v-model="searchQuery"
              :placeholder="t('certificates.searchPlaceholder')"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            class="w-full gap-2 whitespace-nowrap lg:w-auto"
            :disabled="isDownloadingAll || isLoadingCertificates || !certificates.length"
            @click="downloadAllCertificates"
          >
            <Loader2 v-if="isDownloadingAll" class="h-4 w-4 animate-spin" />
            <Download v-else class="h-4 w-4" />
            {{ t('certificates.downloadAll') }}
          </Button>
        </div>

        <div
          v-if="showSearchResults"
          class="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm"
        >
          <div class="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground">
            <UserRoundSearch class="h-4 w-4" />
            <span>{{ t('certificates.searchResults') }}</span>
            <span v-if="isSearchingOperators" class="ml-auto inline-flex items-center gap-2 text-xs">
              <Loader2 class="h-3.5 w-3.5 animate-spin" />
              {{ t('certificates.loadingOperators') }}
            </span>
          </div>
          <button
            v-for="item in searchResults"
            :key="item.id"
            type="button"
            class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
            @click="selectOperator(item)"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Award class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">
                {{ formatOperatorLabel(item) }}
              </p>
              <p v-if="getDisplayName(item)" class="truncate text-sm text-muted-foreground">
                {{ getDisplayName(item) }}
              </p>
              <p class="truncate text-xs text-muted-foreground">
                <span v-if="item.city">{{ item.city }}</span>
                <span v-if="item.city && item.district"> · </span>
                <span v-if="item.district">{{ item.district }}</span>
              </p>
            </div>
          </button>
        </div>

      </section>

      <section>
        <div v-if="isLoadingCertificates || isLoadingCertificatePreviews" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="i in 6"
            :key="i"
            class="animate-pulse overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            <div class="aspect-[4/3] bg-muted/40"></div>
            <div class="space-y-2 p-4">
              <div class="h-4 w-2/3 rounded bg-muted"></div>
              <div class="h-3 w-1/2 rounded bg-muted"></div>
              <div class="h-10 rounded-lg bg-muted/70"></div>
            </div>
          </div>
        </div>

        <div
          v-else-if="certificates.length === 0"
          class="rounded-2xl border border-dashed border-border/70 bg-card/60 px-6 py-10 text-center"
        >
          <Award class="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p class="mt-4 text-base font-medium">
            {{ t('certificates.noCertificates') }}
          </p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in certificates"
            :key="item.attendeeId"
            class="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <button
              type="button"
              @click="certificatePreviewDialogCert = item"
              class="w-full bg-muted/20 text-left transition-colors hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
              :aria-label="t('certificates.previewFull')"
            >
              <CertificateFilledPreview
                v-if="certificatePreviews[item.attendeeId]"
                :image-path="certificatePreviews[item.attendeeId]!.imagePath"
                :elements="certificatePreviews[item.attendeeId]!.elements"
                :placeholders="certificatePreviews[item.attendeeId]!.placeholders"
                :max-height="220"
                class="w-full pointer-events-none"
              />
              <div v-else class="flex aspect-[4/3] items-center justify-center px-4 py-8">
                <div class="text-center">
                  <Award class="mx-auto h-10 w-10 text-primary/70" />
                  <p class="mt-3 text-sm font-medium">
                    {{ item.netName }}
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ t('certificates.template') }}
                  </p>
                </div>
              </div>
            </button>

            <div class="flex flex-1 flex-col gap-3 p-4">
              <div class="min-w-0">
                <p class="truncate text-base font-semibold">
                  {{ item.netName }}
                </p>
                <p class="mt-1 truncate text-sm text-muted-foreground">
                  {{ item.branchName }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ formatDateLong(item.netDate, locale) }}
                </p>
              </div>

              <div class="mt-auto flex items-center justify-end text-xs text-muted-foreground">
                {{ t('certificates.previewFull') }}
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <CertificatePreviewDialog
      :open="!!certificatePreviewDialogCert"
      :certificate="certificatePreviewDialogCert"
      :preview="certificatePreviewDialogCert ? certificatePreviews[certificatePreviewDialogCert.attendeeId] ?? null : null"
      :is-downloading="downloadingAttendeeId === certificatePreviewDialogCert?.attendeeId"
      :is-loading="isLoadingCertificatePreviews"
      @update:open="(open) => !open && (certificatePreviewDialogCert = null)"
      @download="certificatePreviewDialogCert && downloadCertificate(certificatePreviewDialogCert, { successMessage: t('certificates.downloadSuccess') })"
    />
  </AppLayout>
</template>
