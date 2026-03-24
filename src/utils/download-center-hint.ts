const DOWNLOAD_CENTER_HINT_EVENT = 'esupply:download-center-hint'

export const triggerDownloadCenterHint = () => {
  window.dispatchEvent(new CustomEvent(DOWNLOAD_CENTER_HINT_EVENT))
}

export const subscribeDownloadCenterHint = (listener: () => void) => {
  window.addEventListener(DOWNLOAD_CENTER_HINT_EVENT, listener)
  return () => {
    window.removeEventListener(DOWNLOAD_CENTER_HINT_EVENT, listener)
  }
}
