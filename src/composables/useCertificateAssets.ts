import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { api, API_BASE } from '@/lib/api'
import { getFilenameFromContentDisposition } from '@/lib/content-disposition'
import { translateError } from '@/i18n'
import { useAsyncStaleGuard } from '@/composables'
import type { CertificateTemplateElement } from '@/components/certificates/certificate-template-defaults'

export interface CertificateAssetItem {
  attendeeId: string
  netId: string
  netName: string
  netDate: string
  branchName: string
  certificateTemplateId: string
}

export interface CertificatePreviewData {
  imagePath: string
  elements: CertificateTemplateElement[]
  placeholders: Record<string, string>
}

export interface DownloadCertificateOptions {
  successMessage?: string
  fallbackFilename?: (item: CertificateAssetItem) => string
}

export function useCertificateAssets() {
  const certificatePreviews = ref<Record<string, CertificatePreviewData | null>>({})
  const isLoadingCertificatePreviews = ref(false)
  const downloadingAttendeeId = ref<string | null>(null)
  const previewGuard = useAsyncStaleGuard()

  const loadCertificatePreviews = async (items: CertificateAssetItem[]) => {
    const token = previewGuard.beginReplace()
    isLoadingCertificatePreviews.value = true

    try {
      const results = await Promise.allSettled(
        items.map((item) =>
          api.get<CertificatePreviewData | null>(
            `/net/${item.netId}/certificate/${item.attendeeId}/preview-data`
          )
        )
      )

      if (!previewGuard.isCurrent(token)) return

      const next: Record<string, CertificatePreviewData | null> = {}
      items.forEach((item, index) => {
        const result = results[index]
        next[item.attendeeId] = result?.status === 'fulfilled' ? result.value : null
      })
      certificatePreviews.value = next
    } finally {
      if (previewGuard.isCurrent(token)) {
        isLoadingCertificatePreviews.value = false
      }
    }
  }

  const resetCertificatePreviews = () => {
    certificatePreviews.value = {}
  }

  const downloadCertificate = async (item: CertificateAssetItem, options: DownloadCertificateOptions = {}) => {
    if (downloadingAttendeeId.value) return
    downloadingAttendeeId.value = item.attendeeId

    try {
      const res = await fetch(`${API_BASE}/net/${item.netId}/certificate/${item.attendeeId}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { message?: string }).message || 'error.serverError')
      }

      const blob = await res.blob()
      const fallbackFilename =
        options.fallbackFilename?.(item) ?? `${(item.netName || 'certificate').replace(/[/\\?%*:|"<>]/g, '-')}.pdf`
      const filename =
        getFilenameFromContentDisposition(res.headers.get('Content-Disposition')) ?? fallbackFilename
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'error.serverError'
      toast.error(translateError(msg))
    } finally {
      downloadingAttendeeId.value = null
    }
  }

  return {
    certificatePreviews,
    isLoadingCertificatePreviews,
    downloadingAttendeeId,
    loadCertificatePreviews,
    resetCertificatePreviews,
    downloadCertificate,
  }
}