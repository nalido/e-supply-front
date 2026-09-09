import type { PodDesignStyle } from '../../types/pod-design'

type GenerationResult = NonNullable<PodDesignStyle['mockupImages']>[number]

export const formatDuration = (milliseconds: number) => {
  const seconds = Math.max(0, Math.round(milliseconds / 1000))
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return remainingSeconds ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours} 小时 ${remainingMinutes} 分` : `${hours} 小时`
}

export const generationResultDuration = (result: GenerationResult, now = Date.now()) => {
  if (!result.startedAt) return undefined
  const start = new Date(result.startedAt).getTime()
  const end = result.finishedAt ? new Date(result.finishedAt).getTime() : now
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : undefined
}

export const generationBatchDuration = (results: GenerationResult[], now = Date.now()) => {
  const starts = results.map(item => item.startedAt && new Date(item.startedAt).getTime()).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!starts.length) return undefined
  const hasActive = results.some(item => item.status === 'QUEUED' || item.status === 'PROCESSING')
  const finishes = results.map(item => item.finishedAt && new Date(item.finishedAt).getTime()).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const end = hasActive ? now : finishes.length ? Math.max(...finishes) : now
  return Math.max(0, end - Math.min(...starts))
}
