import { isValidElement, type ReactNode } from 'react'
import { menuTree, type MenuNode } from '../../menu.config'

export type UsageAnalyticsLabelMaps = {
  pageLabelMap: Map<string, string>
  moduleLabelMap: Map<string, string>
}

export type UsageAnalyticsRouteDefinition = {
  path: string
  label: string
  module: string
  aliases?: string[]
}

export const EXTRA_USAGE_ANALYTICS_ROUTES: UsageAnalyticsRouteDefinition[] = [
  { path: '/', label: '工作台', module: '工作台' },
  { path: '/dashboard', label: '工作台', module: '工作台' },
  { path: '/downloads', label: '下载中心', module: '工作台' },
  { path: '/pattern', label: '打板', module: '打板' },
  { path: '/sample/detail', label: '样板详情', module: '打板' },
  { path: '/foundation/product/detail', label: '款式详情', module: '基础资料' },
  { path: '/piecework/orders', label: '工厂订单', module: '订单生产' },
  {
    path: '/piecework/cutting/pending',
    label: '待裁',
    module: '车间计件',
    aliases: ['/piecework/cutting/list', '/piecework/cutting/create'],
  },
  { path: '/collab', label: '协同中心', module: '协同中心' },
  { path: '/collab/send-out', label: '委外订单', module: '协同中心' },
  { path: '/collab/receive-in', label: '来单管理', module: '协同中心' },
  { path: '/ai/agent', label: 'AI 助手', module: 'AI 助手', aliases: ['/ai'] },
  { path: '/settings/profile', label: '个人资料', module: '系统设置', aliases: ['/settings'] },
  { path: '/sale', label: '销售中心', module: '销售中心' },
  {
    path: '/sale/workbench',
    label: '销售工作台',
    module: '销售中心',
    aliases: ['/sale/dashboard'],
  },
  { path: '/sale/products/sync', label: '商品同步', module: '销售中心' },
  { path: '/sale/products/manage', label: '商品管理', module: '销售中心' },
  {
    path: '/sale/ozon/listing',
    label: 'Ozon 铺货',
    module: '销售中心',
    aliases: ['/sale/products/publish'],
  },
  { path: '/sale/ozon/listing-details', label: 'Ozon 铺货详情', module: '销售中心' },
  { path: '/sale/ozon/inventory', label: 'Ozon 库存', module: '销售中心' },
  { path: '/sale/ozon/promotions', label: 'Ozon 活动', module: '销售中心' },
  {
    path: '/sale/products/bindings',
    label: '商品绑定',
    module: '销售中心',
    aliases: ['/sale/channels/mappings'],
  },
  { path: '/sale/orders/overview', label: '订单总览', module: '销售中心' },
  {
    path: '/sale/orders/issues',
    label: '订单处理',
    module: '销售中心',
    aliases: ['/sale/orders', '/sale/fulfillments', '/sale/fulfillment-workbench/temu-full-managed'],
  },
  { path: '/sale/fulfillment-workbench/ozon-fbs', label: 'Ozon FBS 发货工作台', module: '销售中心' },
  {
    path: '/sale/sales-data',
    label: '售卖数据',
    module: '销售中心',
    aliases: ['/sale/insights/risk'],
  },
  {
    path: '/sale/shops',
    label: '店铺管理',
    module: '销售中心',
    aliases: ['/sale/channels/accounts', '/sale/channels/credentials'],
  },
  {
    path: '/sale/governance/sync',
    label: '同步治理',
    module: '销售中心',
    aliases: ['/sale/sync-logs'],
  },
  { path: '/sale/tutorials', label: '教程入口', module: '销售中心' },
]

const readNodeLabel = (label: ReactNode): string => {
  if (typeof label === 'string') {
    return label
  }
  if (isValidElement(label)) {
    const props = label.props as { children?: ReactNode }
    if (typeof props.children === 'string') {
      return props.children
    }
  }
  return '页面'
}

const collectMenuLabels = (
  nodes: MenuNode[],
  pageLabelMap: Map<string, string>,
  moduleLabelMap: Map<string, string>,
  moduleLabel?: string,
) => {
  nodes.forEach((node) => {
    const label = readNodeLabel(node.label)
    const nextModuleLabel = moduleLabel ?? label

    pageLabelMap.set(node.key, label)
    moduleLabelMap.set(node.key, nextModuleLabel)

    if (node.children) {
      collectMenuLabels(node.children, pageLabelMap, moduleLabelMap, nextModuleLabel)
    }
  })
}

export const buildUsageAnalyticsLabelMaps = (): UsageAnalyticsLabelMaps => {
  const pageLabelMap = new Map<string, string>()
  const moduleLabelMap = new Map<string, string>()

  collectMenuLabels(menuTree, pageLabelMap, moduleLabelMap)

  EXTRA_USAGE_ANALYTICS_ROUTES.forEach((route) => {
    const paths = [route.path, ...(route.aliases ?? [])]
    paths.forEach((path) => {
      pageLabelMap.set(path, route.label)
      moduleLabelMap.set(path, route.module)
    })
  })

  return { pageLabelMap, moduleLabelMap }
}
