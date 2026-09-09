import { Button, InputNumber, Slider, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { PodPrintArea, PodTemplateImage } from '../../types/pod-design'

type ContextArea = { id: string; area: PodPrintArea; color: string; label: string }
type Props = { image: PodTemplateImage; value?: PodPrintArea; drawing: boolean; readOnly?: boolean; contextAreasSolid?: boolean; accentColor?: string; label?: string; contextAreas?: ContextArea[]; onDrawingChange: (drawing: boolean) => void; onChange: (area: PodPrintArea) => void }
type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
type Interaction = {
  type: 'drag' | 'resize' | 'rotate'
  direction?: ResizeDirection
  pointerX: number
  pointerY: number
  area: PodPrintArea
  rotationOffset?: number
}

const MIN_AREA_SIZE = .03
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const normalizeAngle = (value: number) => Math.round(((value + 180) % 360 + 360) % 360 - 180)

const PrintAreaMarker = ({ image, value, drawing, readOnly = false, contextAreasSolid = false, accentColor = '#4f46e5', label = '设计区域', contextAreas = [], onDrawingChange, onChange }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<PodPrintArea | null>(value ?? null)
  const draftRef = useRef<PodPrintArea | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const interaction = useRef<Interaction | null>(null)
  const areaBeforeRedraw = useRef<PodPrintArea | null>(null)
  const savedArea: PodPrintArea | null = image.printX != null ? {
    x: image.printX,
    y: image.printY!,
    width: image.printWidth!,
    height: image.printHeight!,
    physicalWidthMm: image.physicalPrintWidthMm,
    physicalHeightMm: image.physicalPrintHeightMm,
    rotationDegrees: image.rotationDegrees ?? 0,
    mirrorArtwork: image.mirrorArtwork,
  } : null
  const area = draft ?? savedArea
  const rotationDegrees = area?.rotationDegrees ?? 0
  useEffect(() => {
    draftRef.current = value ?? null
    areaBeforeRedraw.current = null
    setDraft(value ?? null)
  }, [image.id, value])

  const updateDraft = (value: PodPrintArea | null) => {
    draftRef.current = value
    setDraft(value)
    if (value) onChange(value)
  }

  const point = (event: PointerEvent) => {
    const box = ref.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    }
  }

  const down = (event: PointerEvent) => {
    if (!drawing) return
    areaBeforeRedraw.current = area ? { ...area } : null
    event.currentTarget.setPointerCapture(event.pointerId)
    start.current = point(event)
    updateDraft({
      ...start.current,
      width: .01,
      height: .01,
      physicalWidthMm: area?.physicalWidthMm ?? savedArea?.physicalWidthMm,
      physicalHeightMm: area?.physicalHeightMm ?? savedArea?.physicalHeightMm,
      rotationDegrees: area?.rotationDegrees ?? savedArea?.rotationDegrees ?? 0,
      mirrorArtwork: area?.mirrorArtwork ?? image.mirrorArtwork,
    })
  }

  const move = (event: PointerEvent) => {
    if (!start.current) return
    const current = point(event)
    updateDraft({
      x: Math.min(start.current.x, current.x),
      y: Math.min(start.current.y, current.y),
      width: Math.max(.01, Math.abs(current.x - start.current.x)),
      height: Math.max(.01, Math.abs(current.y - start.current.y)),
      physicalWidthMm: draftRef.current?.physicalWidthMm ?? savedArea?.physicalWidthMm,
      physicalHeightMm: draftRef.current?.physicalHeightMm ?? savedArea?.physicalHeightMm,
      rotationDegrees: area?.rotationDegrees ?? savedArea?.rotationDegrees ?? 0,
      mirrorArtwork: area?.mirrorArtwork ?? image.mirrorArtwork,
    })
  }

  const up = () => {
    start.current = null
    const pending = draftRef.current
    if (pending && pending.width > .03 && pending.height > .03) {
      updateDraft(pending)
      onDrawingChange(false)
    } else {
      updateDraft(areaBeforeRedraw.current ?? savedArea)
      onDrawingChange(false)
    }
  }

  const beginInteraction = (event: PointerEvent, type: Interaction['type'], direction?: ResizeDirection) => {
    if (!area || readOnly) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const box = ref.current!.getBoundingClientRect()
    const centerX = box.left + (area.x + area.width / 2) * box.width
    const centerY = box.top + (area.y + area.height / 2) * box.height
    const pointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI
    interaction.current = {
      type,
      direction,
      pointerX: event.clientX,
      pointerY: event.clientY,
      area: { ...area },
      rotationOffset: type === 'rotate' ? rotationDegrees - pointerAngle : undefined,
    }
  }

  const interact = (event: PointerEvent) => {
    const active = interaction.current
    const canvas = ref.current
    if (!active || !canvas) return
    event.preventDefault()
    event.stopPropagation()
    const box = canvas.getBoundingClientRect()
    const dx = (event.clientX - active.pointerX) / box.width
    const dy = (event.clientY - active.pointerY) / box.height
    const initial = active.area

    if (active.type === 'drag') {
      updateDraft({
        ...initial,
        x: clamp(initial.x + dx, 0, 1 - initial.width),
        y: clamp(initial.y + dy, 0, 1 - initial.height),
      })
      return
    }

    if (active.type === 'rotate') {
      const centerX = box.left + (initial.x + initial.width / 2) * box.width
      const centerY = box.top + (initial.y + initial.height / 2) * box.height
      const pointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI
      updateDraft({ ...initial, rotationDegrees: normalizeAngle(pointerAngle + (active.rotationOffset ?? 0)) })
      return
    }

    const direction = active.direction!
    const radians = (initial.rotationDegrees ?? 0) * Math.PI / 180
    const localDx = Math.cos(radians) * dx + Math.sin(radians) * dy
    const localDy = -Math.sin(radians) * dx + Math.cos(radians) * dy
    let left = -initial.width / 2
    let right = initial.width / 2
    let top = -initial.height / 2
    let bottom = initial.height / 2
    if (direction.includes('w')) left = Math.min(left + localDx, right - MIN_AREA_SIZE)
    if (direction.includes('e')) right = Math.max(right + localDx, left + MIN_AREA_SIZE)
    if (direction.includes('n')) top = Math.min(top + localDy, bottom - MIN_AREA_SIZE)
    if (direction.includes('s')) bottom = Math.max(bottom + localDy, top + MIN_AREA_SIZE)
    const width = right - left
    const height = bottom - top
    const localCenterX = (left + right) / 2
    const localCenterY = (top + bottom) / 2
    const centerX = initial.x + initial.width / 2
      + Math.cos(radians) * localCenterX - Math.sin(radians) * localCenterY
    const centerY = initial.y + initial.height / 2
      + Math.sin(radians) * localCenterX + Math.cos(radians) * localCenterY
    updateDraft({
      ...initial,
      width,
      height,
      x: clamp(centerX - width / 2, 0, 1 - width),
      y: clamp(centerY - height / 2, 0, 1 - height),
    })
  }

  const endInteraction = (event: PointerEvent) => {
    if (!interaction.current) return
    event.preventDefault()
    event.stopPropagation()
    interaction.current = null
  }

  const previewRotation = (value: number | null) => {
    if (!area) return
    updateDraft({ ...area, rotationDegrees: value ?? 0 })
  }

  const resetRotation = () => {
    if (!area) return
    updateDraft({ ...area, rotationDegrees: 0 })
  }

  const angleLabel = `${rotationDegrees > 0 ? '+' : ''}${rotationDegrees}°`

  return <div className="pod-print-marker-shell" style={{ '--print-accent': accentColor } as CSSProperties}>
    <div ref={ref} className={`pod-print-marker ${drawing ? 'is-drawing' : ''}`} style={{ '--image-ratio': image.width / image.height } as CSSProperties} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <img src={image.deliveryUrl} alt={image.imageName} draggable={false} />
      {contextAreas.map(context => <div
        key={context.id}
        className={`pod-print-marker__context-area ${contextAreasSolid ? 'is-solid' : ''}`}
        style={{
          '--context-accent': context.color,
          left: `${context.area.x * 100}%`,
          top: `${context.area.y * 100}%`,
          width: `${context.area.width * 100}%`,
          height: `${context.area.height * 100}%`,
          transform: `rotate(${context.area.rotationDegrees ?? 0}deg)`,
        } as CSSProperties}
      ><span className={context.area.x + context.area.width < .55 ? 'is-right' : 'is-left'}>{context.label}<em>角度 {(context.area.rotationDegrees ?? 0) > 0 ? '+' : ''}{context.area.rotationDegrees ?? 0}°</em></span></div>)}
      {area && <><div
        className={`pod-print-marker__area ${readOnly ? 'is-readonly' : ''}`}
        role="application"
        aria-label="设计区域，可拖动、缩放和旋转"
        onPointerDown={event => beginInteraction(event, 'drag')}
        onPointerMove={interact}
        onPointerUp={endInteraction}
        style={{
        left: `${area.x * 100}%`,
        top: `${area.y * 100}%`,
        width: `${area.width * 100}%`,
        height: `${area.height * 100}%`,
        transform: `rotate(${rotationDegrees}deg)`,
      }}>
        {!readOnly && <button type="button" className="pod-print-marker__rotate" aria-label="旋转设计区域" onPointerDown={event => beginInteraction(event, 'rotate')} onPointerMove={interact} onPointerUp={endInteraction} />}
        {!readOnly && (['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as ResizeDirection[]).map(direction => <button
          key={direction}
          type="button"
          className={`pod-print-marker__resize pod-print-marker__resize--${direction}`}
          aria-label={`调整设计区域${direction}边缘`}
          onPointerDown={event => beginInteraction(event, 'resize', direction)}
          onPointerMove={interact}
          onPointerUp={endInteraction}
        />)}
      </div><div className={`pod-print-marker__label ${area.x + area.width < .55 ? 'is-right' : 'is-left'}`} style={{
        left: `${(area.x + area.width < .55 ? area.x + area.width : area.x) * 100}%`,
        top: `${area.y * 100}%`,
      }}><strong>{label}</strong><span>角度 {angleLabel}</span></div></>}
    </div>
    {area && !readOnly && <div className="pod-print-area-controls">
      <div className="pod-print-rotation-controls">
      <div className="pod-print-rotation-copy">
        <Typography.Text strong>印花基础角度</Typography.Text>
        <Typography.Text type="secondary">正数顺时针、负数逆时针；AI 会在此基础上继续贴合衣片曲面和褶皱。</Typography.Text>
      </div>
      <Slider min={-180} max={180} step={1} value={rotationDegrees} onChange={previewRotation} />
      <InputNumber min={-180} max={180} step={1} controls={false} value={rotationDegrees} suffix="°" style={{ width: '100%' }} aria-label="印花基础角度" onChange={previewRotation} />
      <Button disabled={rotationDegrees === 0} onClick={resetRotation}>恢复水平</Button>
      </div>
    </div>}
  </div>
}

export default PrintAreaMarker
