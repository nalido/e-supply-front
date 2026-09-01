import { CheckCircleFilled, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Modal, Select, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PodPrintSizeHistory, PodProductTemplate, PodTemplateWorkflow, PodTemplateWorkflowNode } from '../../types/pod-design'
import PrintAreaMarker from './PrintAreaMarker'

const COLORS = ['#2563eb', '#f97316', '#16a34a', '#9333ea', '#e11d48']
const nodeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

type Props = {
  template: PodProductTemplate
  value: PodTemplateWorkflow
  sizeHistory: PodPrintSizeHistory[]
  onChange: (value: PodTemplateWorkflow) => void
  onDeleteImage: (imageId: number) => void
}

const TemplateWorkflowEditor = ({ template, value, sizeHistory, onChange, onDeleteImage }: Props) => {
  const [selectedImageId, setSelectedImageId] = useState<number>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [drawingNodeId, setDrawingNodeId] = useState<string>()

  useEffect(() => {
    const imageIds = new Set(template.images.map(image => image.id))
    const retained = value.nodes.filter(node => imageIds.has(node.imageId))
    const normalized = template.images.flatMap(image => {
      const imageNodes = retained.filter(node => node.imageId === image.id)
      const input = imageNodes.find(node => node.type === 'INPUT') ?? {
        id: `input-${image.id}`, type: 'INPUT' as const, imageId: image.id, name: image.imageName, finalOutput: false,
      }
      const prints = imageNodes.filter(node => node.type === 'PRINT').map(node => ({ ...node, finalOutput: false }))
      const legacyOutput = imageNodes.find(node => node.finalOutput && node.type !== 'OUTPUT')
      const endpoint = legacyOutput ?? prints.at(-1) ?? input
      const output = imageNodes.find(node => node.type === 'OUTPUT') ?? {
        id: `output-${image.id}`, type: 'OUTPUT' as const, imageId: image.id, name: '最终输出', finalOutput: true,
      }
      return [{ ...input, finalOutput: false }, ...prints, { ...output, inputNodeId: endpoint.id, finalOutput: true, outputRole: image.imageRole }]
    })
    if (JSON.stringify(normalized) !== JSON.stringify(value.nodes)) onChange({ ...value, nodes: normalized })
  }, [template.images, value, onChange])

  useEffect(() => {
    if (!template.images.some(image => image.id === selectedImageId)) setSelectedImageId(template.images[0]?.id)
  }, [selectedImageId, template.images])

  useEffect(() => {
    if (!selectedImageId) return
    const imageNodes = value.nodes.filter(node => node.imageId === selectedImageId)
    const currentBelongsToImage = imageNodes.some(node => node.id === selectedNodeId)
    if (currentBelongsToImage) return
    const defaultNode = imageNodes.find(node => node.type === 'OUTPUT')
    setSelectedNodeId(defaultNode?.id)
  }, [selectedImageId, selectedNodeId, value.nodes])

  const selectedImage = template.images.find(image => image.id === selectedImageId)
  const chain = value.nodes.filter(node => node.imageId === selectedImageId)
  const selectedNode = chain.find(node => node.id === selectedNodeId)
  const selectedNodeIndex = selectedNode ? chain.findIndex(node => node.id === selectedNode.id) : -1
  const printById = useMemo(() => new Map(value.prints.map(print => [print.id, print])), [value.prints])

  const updateNode = (id: string, patch: Partial<PodTemplateWorkflowNode>) => onChange({
    ...value, nodes: value.nodes.map(node => node.id === id ? { ...node, ...patch } : node),
  })

  const addPrint = () => {
    const index = value.prints.length
    onChange({ ...value, prints: [...value.prints, { id: nodeId('print'), name: `印花${['一', '二', '三', '四', '五'][index] ?? index + 1}`, color: COLORS[index % COLORS.length] }] })
  }

  const addStep = () => {
    if (!selectedImage) return
    const output = chain.find(node => node.type === 'OUTPUT')
    const previous = chain.filter(node => node.type !== 'OUTPUT').at(-1)
    const print = value.prints[0]
    if (!previous || !print || !output) return
    const step: PodTemplateWorkflowNode = {
      id: nodeId('step'), type: 'PRINT', imageId: selectedImage.id, inputNodeId: previous.id, printId: print.id,
      name: `${print.name}融合`, finalOutput: false,
      area: { x: .32, y: .28, width: .36, height: .42, rotationDegrees: 0, mirrorArtwork: false },
    }
    onChange({ ...value, nodes: value.nodes.flatMap(node => node.id === output.id ? [step, { ...node, inputNodeId: step.id }] : node) })
    setSelectedNodeId(step.id)
    setDrawingNodeId(step.id)
  }

  const removeStep = (id: string) => {
    const target = value.nodes.find(node => node.id === id)
    if (!target) return
    const removeIds = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      value.nodes.forEach(node => { if (node.type === 'PRINT' && node.inputNodeId && removeIds.has(node.inputNodeId) && !removeIds.has(node.id)) { removeIds.add(node.id); changed = true } })
    }
    const output = value.nodes.find(node => node.imageId === target.imageId && node.type === 'OUTPUT')
    onChange({ ...value, nodes: value.nodes.filter(node => !removeIds.has(node.id)).map(node => node.id === output?.id ? { ...node, inputNodeId: target.inputNodeId } : node) })
    setSelectedNodeId(output?.id)
  }

  if (!template.images.length) return <div className="pod-flow-empty"><Empty description="先上传一张商品底图，再开始编排生成流程" /></div>

  return <div className="pod-flow-workspace">
    <aside className="pod-flow-assets">
      <div className="pod-flow-pane-title"><div><strong>商品底图</strong><span>{template.images.length} 张</span></div></div>
      <div className="pod-flow-assets__list">
        {template.images.map(image => {
          const imageNodes = value.nodes.filter(node => node.imageId === image.id)
          const output = imageNodes.some(node => node.type === 'OUTPUT')
          return <button key={image.id} className={selectedImageId === image.id ? 'is-active' : ''} onClick={() => {
            const defaultNode = imageNodes.find(node => node.type === 'OUTPUT')
            setSelectedImageId(image.id)
            setSelectedNodeId(defaultNode?.id)
            setDrawingNodeId(undefined)
          }}>
            <img src={image.deliveryUrl} alt="" />
            <span><strong>{image.imageName}</strong><small>{imageNodes.filter(node => node.type === 'PRINT').length} 个印花步骤</small></span>
            {output && <CheckCircleFilled className="pod-flow-assets__output" />}
          </button>
        })}
      </div>
      {selectedImage && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => onDeleteImage(selectedImage.id)}>删除当前底图</Button>}
    </aside>

    <main className="pod-flow-main">
      <div className="pod-flow-toolbar">
        <div><Typography.Title level={4}>{selectedImage?.imageName}</Typography.Title><Typography.Text type="secondary">按顺序从左向右生成</Typography.Text></div>
        <div className="pod-flow-toolbar__actions"><Button icon={<PlusOutlined />} onClick={addPrint}>新建印花</Button><Button type="primary" icon={<PlusOutlined />} onClick={addStep}>添加步骤</Button></div>
      </div>
      <div className="pod-print-library">
        {value.prints.map(print => <Tag key={print.id} color={print.color}><span className="pod-print-dot" style={{ background: print.color }} />{print.name}</Tag>)}
        {!value.prints.length && <Typography.Text type="secondary">先新建一个印花</Typography.Text>}
      </div>
      <div className="pod-flow-canvas">
        <div className="pod-flow-chain">
          {chain.map((node, index) => {
            const print = node.printId ? printById.get(node.printId) : undefined
            return <div className="pod-flow-segment" key={node.id}>
              {node.type === 'OUTPUT' && <><span className="pod-flow-arrow">→</span><button className="pod-flow-add-node" onClick={addStep}><PlusOutlined /><span>添加印花</span></button></>}
              {index > 0 && <span className="pod-flow-arrow">→</span>}<button className={`pod-flow-node ${selectedNodeId === node.id ? 'is-selected' : ''} ${node.type === 'OUTPUT' ? 'is-output' : ''}`} style={{ '--node-color': print?.color } as CSSProperties} onClick={() => setSelectedNodeId(node.id)}>
              <span className="pod-flow-node__index">{index + 1}</span>
              <span className="pod-flow-node__kind">{node.type === 'INPUT' ? '商品底图' : node.type === 'OUTPUT' ? '商品效果图' : 'AI 融合'}</span>
              <strong>{node.type === 'INPUT' ? selectedImage?.imageName : node.type === 'OUTPUT' ? '最终输出' : print?.name ?? node.name}</strong>
              {node.type === 'OUTPUT' && <span className="pod-flow-node__output"><CheckCircleFilled /> 固定节点</span>}
            </button></div>
          })}
        </div>
      </div>
      <Typography.Text className="pod-flow-help" type="secondary">选择节点后在右侧调整；同一张图可以依次使用多个印花。</Typography.Text>
    </main>

    <aside className="pod-flow-inspector">
      {!selectedNode || !selectedImage ? <div className="pod-flow-inspector__empty"><strong>选择一个流程节点</strong><span>在这里设置印花、设计区域或最终输出。</span></div> : <>
        <div className="pod-flow-inspector__heading">
          <div><Typography.Title level={4}>{selectedNode.type === 'INPUT' ? '商品底图' : selectedNode.type === 'OUTPUT' ? '最终输出' : '印花步骤'}</Typography.Title><Typography.Text type="secondary">{selectedNode.type === 'OUTPUT' ? '汇总展示全部印花区域，仅供查看' : selectedNode.type === 'PRINT' && selectedNodeIndex > 1 ? '虚线区域是前序印花，可作为位置参考' : '当前结果继续传给下一步'}</Typography.Text></div>
          {selectedNode.type === 'PRINT' && <Button size="small" danger type="text" onClick={() => Modal.confirm({ title: '删除这个印花步骤？', content: '这个步骤之后的步骤也会一起移除。', okText: '删除', okButtonProps: { danger: true }, onOk: () => removeStep(selectedNode.id) })}>删除</Button>}
        </div>
        <div className="pod-flow-inspector__actions">
          {selectedNode.type === 'PRINT' && <Select aria-label="选择印花" value={selectedNode.printId} options={value.prints.map(print => ({ value: print.id, label: print.name }))} onChange={printId => updateNode(selectedNode.id, { printId, name: `${printById.get(printId)?.name ?? '印花'}融合` })} />}
        </div>
        {selectedNode.type === 'INPUT' ? <img className="pod-flow-input-preview" src={selectedImage.deliveryUrl} alt={selectedImage.imageName} /> : selectedNode.type === 'OUTPUT' ? (() => {
          const printNodes = chain.filter(node => node.type === 'PRINT' && node.area)
          const lastPrint = printNodes.at(-1)
          return lastPrint ? <PrintAreaMarker image={selectedImage} value={lastPrint.area} drawing={false} readOnly contextAreasSolid accentColor={printById.get(lastPrint.printId ?? '')?.color} label={printById.get(lastPrint.printId ?? '')?.name} contextAreas={printNodes.slice(0, -1).map(node => ({ id: node.id, area: node.area!, color: printById.get(node.printId ?? '')?.color ?? '#64748b', label: printById.get(node.printId ?? '')?.name ?? node.name }))} onDrawingChange={() => undefined} onChange={() => undefined} /> : <img className="pod-flow-input-preview" src={selectedImage.deliveryUrl} alt={selectedImage.imageName} />
        })() : <PrintAreaMarker image={selectedImage} value={selectedNode.area} drawing={drawingNodeId === selectedNode.id} sizeHistory={sizeHistory} accentColor={printById.get(selectedNode.printId ?? '')?.color} label={printById.get(selectedNode.printId ?? '')?.name} contextAreas={chain.slice(0, selectedNodeIndex).filter(node => node.type === 'PRINT' && node.area).map(node => ({ id: node.id, area: node.area!, color: printById.get(node.printId ?? '')?.color ?? '#64748b', label: printById.get(node.printId ?? '')?.name ?? node.name }))} onDrawingChange={drawing => setDrawingNodeId(drawing ? selectedNode.id : undefined)} onChange={area => updateNode(selectedNode.id, { area })} />}
      </>}
    </aside>
  </div>
}

export default TemplateWorkflowEditor
