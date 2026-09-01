import type { PodTemplateWorkflow } from '../../types/pod-design'

export const emptyWorkflow = (): PodTemplateWorkflow => ({
  version: 1,
  prints: [{ id: 'print-1', name: '印花一', color: '#2563eb' }],
  nodes: [],
})

export const parseWorkflow = (raw?: string): PodTemplateWorkflow => {
  if (!raw) return emptyWorkflow()
  try {
    const value = JSON.parse(raw) as PodTemplateWorkflow
    return value.version === 1 && Array.isArray(value.prints) && Array.isArray(value.nodes) ? value : emptyWorkflow()
  } catch { return emptyWorkflow() }
}
