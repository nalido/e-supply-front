import { CopyOutlined } from '@ant-design/icons'
import { Button, InputNumber, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { PodPrintSizeHistory, PodPrintSizeMeasurement, PodTemplateSize } from '../../types/pod-design'

type Props = {
  sizes: PodTemplateSize[]
  value?: PodPrintSizeMeasurement[]
  sizeHistory: PodPrintSizeHistory[]
  onChange: (value: PodPrintSizeMeasurement[]) => void
}

const formatMm = (value: number) => Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const complete = (value?: PodPrintSizeMeasurement) => Boolean(value?.widthMm && value.widthMm > 0 && value?.heightMm && value.heightMm > 0)

const PrintSizeMatrix = ({ sizes, value = [], sizeHistory, onChange }: Props) => {
  const measurements = useMemo(() => new Map(value.map(item => [item.sizeId, item])), [value])
  const [activeSizeId, setActiveSizeId] = useState<string>()

  useEffect(() => {
    if (sizes.some(size => size.id === activeSizeId)) return
    setActiveSizeId(sizes.find(size => !complete(measurements.get(size.id)))?.id ?? sizes[0]?.id)
  }, [activeSizeId, measurements, sizes])

  const update = (sizeId: string, patch: Partial<PodPrintSizeMeasurement>) => {
    const next = sizes.map(size => ({
      sizeId: size.id,
      ...measurements.get(size.id),
      ...(size.id === sizeId ? patch : {}),
    }))
    onChange(next)
  }

  const applyPair = (sizeId: string, widthMm: number, heightMm: number) => {
    update(sizeId, { widthMm, heightMm })
  }

  const fillAll = () => {
    const source = activeSizeId ? measurements.get(activeSizeId) : undefined
    if (!complete(source)) return
    onChange(sizes.map(size => ({ sizeId: size.id, widthMm: source!.widthMm, heightMm: source!.heightMm })))
  }

  const completedCount = sizes.filter(size => complete(measurements.get(size.id))).length
  const activeMeasurement = activeSizeId ? measurements.get(activeSizeId) : undefined

  return <section className="pod-size-matrix">
    <div className="pod-size-matrix__heading">
      <div>
        <Typography.Text strong>各尺码实际印花尺寸</Typography.Text>
        <Typography.Text type="secondary">{sizes.length ? `已完成 ${completedCount}/${sizes.length}` : '先添加模板尺码'}</Typography.Text>
      </div>
      {sizes.length > 1 && <Button size="small" type="text" icon={<CopyOutlined />} disabled={!complete(activeMeasurement)} onClick={fillAll}>当前行填入全部尺码</Button>}
    </div>
    {!sizes.length ? <div className="pod-size-matrix__empty">在上方“模板尺码”输入尺码并按回车，这里会立即生成填写行。</div> : <>
      <div className="pod-size-matrix__table" role="table" aria-label="各尺码实际印花尺寸">
        <div className="pod-size-matrix__header" role="row"><span>尺码</span><span>实际宽度</span><span>实际高度</span></div>
        {sizes.map(size => {
          const measurement = measurements.get(size.id)
          const active = activeSizeId === size.id
          return <div key={size.id} className={`pod-size-matrix__row ${active ? 'is-active' : ''} ${complete(measurement) ? 'is-complete' : 'is-missing'}`} role="row" onClick={() => setActiveSizeId(size.id)}>
            <strong>{size.name}</strong>
            <InputNumber min={1} precision={2} controls={false} value={measurement?.widthMm} suffix="mm" placeholder="宽度" aria-label={`${size.name}实际宽度`} onFocus={() => setActiveSizeId(size.id)} onChange={widthMm => update(size.id, { widthMm: widthMm ?? undefined })} />
            <InputNumber min={1} precision={2} controls={false} value={measurement?.heightMm} suffix="mm" placeholder="高度" aria-label={`${size.name}实际高度`} onFocus={() => setActiveSizeId(size.id)} onChange={heightMm => update(size.id, { heightMm: heightMm ?? undefined })} />
          </div>
        })}
      </div>
      {sizeHistory.length > 0 && <div className="pod-print-size-history">
        <Typography.Text type="secondary">最近使用{activeSizeId ? ` · ${sizes.find(size => size.id === activeSizeId)?.name}` : ''}</Typography.Text>
        <div className="pod-print-size-history__options">
          {sizeHistory.map(history => <button key={history.id} type="button" title={`${formatMm(history.widthMm)} × ${formatMm(history.heightMm)} mm`} onClick={() => activeSizeId && applyPair(activeSizeId, history.widthMm, history.heightMm)}>{formatMm(history.widthMm)}×{formatMm(history.heightMm)}</button>)}
        </div>
      </div>}
    </>}
  </section>
}

export default PrintSizeMatrix
