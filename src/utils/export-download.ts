import http from '../api/http'

const EXPORT_DOWNLOAD_PREFIX = '/api/v1/exports/'

export const normalizeExportDownloadUrl = (fileUrl?: string): string | undefined => {
  if (!fileUrl) {
    return undefined
  }
  if (
    fileUrl.startsWith(EXPORT_DOWNLOAD_PREFIX) ||
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://')
  ) {
    return fileUrl
  }

  const normalized = fileUrl.replace(/\\/g, '/')
  if (!normalized.includes('/logs/exports/')) {
    return fileUrl
  }

  const fileName = normalized.split('/').pop()
  if (!fileName) {
    return fileUrl
  }
  return `${EXPORT_DOWNLOAD_PREFIX}${encodeURIComponent(fileName)}`
}

const resolveFileNameFromHeaders = (contentDisposition?: string): string | undefined => {
  if (!contentDisposition) {
    return undefined
  }
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (simpleMatch?.[1]) {
    return simpleMatch[1]
  }
  return undefined
}

export const resolveExportFileName = (
  fileUrl: string,
  contentDisposition?: string,
  fallbackFileName = 'export.csv',
): string => {
  const fromHeaders = resolveFileNameFromHeaders(contentDisposition)
  if (fromHeaders) {
    return fromHeaders
  }
  const normalized = fileUrl.replace(/\\/g, '/')
  const fileName = normalized.split('/').pop()
  return fileName || fallbackFileName
}

export const downloadExportFile = async (fileUrl: string, fallbackFileName?: string) => {
  const response = await http.get(fileUrl, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = resolveExportFileName(
    fileUrl,
    typeof response.headers['content-disposition'] === 'string'
      ? response.headers['content-disposition']
      : undefined,
    fallbackFileName,
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
}
