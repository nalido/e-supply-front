# Workplace 组件模块化

## 概述

本次重构将原本单一的 `Workplace.tsx` 组件拆分成了多个可复用的子组件，提高了代码的可维护性和组件的复用性。

## 模块结构

```
src/components/workplace/
├── README.md                    # 本文档
├── index.ts                     # 统一导出文件
├── StatisticsSection.tsx        # 统计数据显示组件
├── QuickActionsSection.tsx      # 快速入口组件
├── DeliveryTableCard.tsx        # 交货列表表格卡片组件
├── AnnouncementCard.tsx         # 公告卡片组件
└── table-columns.tsx            # 表格列配置工具函数
```

## 组件说明

### StatisticsSection
- **功能**: 显示工作台顶部的统计数据（新单、打板、生产进行、已出货）
- **Props**: 
  - `stats`: WorkplaceStats 类型的统计数据
  - `loading`: 是否显示加载状态
- **特性**: 支持加载状态显示，数据格式化显示

### QuickActionsSection
- **功能**: 显示快速入口操作按钮区域
- **Props**:
  - `quickActions`: QuickAction[] 类型的快速操作配置
- **特性**: 响应式布局，支持图标和计数显示

### DeliveryTableCard
- **功能**: 可复用的交货列表表格卡片组件
- **Props**:
  - `title`: 表格标题
  - `dataSource`: 表格数据源
  - `loading`: 加载状态
  - `pagination`: 分页配置对象
  - `onPaginationChange`: 分页变化处理函数
  - `withType`: 是否显示加工类型列（区分客户表格和工厂表格）
- **特性**: 
  - 支持分页功能
  - 支持修改每页数量
  - 自动适应表格宽度
  - 固定列功能
  - 空数据状态显示

### AnnouncementCard
- **功能**: 公告展示卡片组件
- **Props**:
  - `announcements`: 公告数据数组
  - `loading`: 加载状态
  - `pagination`: 分页配置对象
  - `onPaginationChange`: 分页变化处理函数
  - `onPublishClick`: 发布按钮点击处理（可选）
- **特性**:
  - 支持滚动显示
  - 分页功能
  - 自定义滚动条样式
  - 空公告状态显示

### table-columns.tsx
- **功能**: 提供表格列配置的工具函数
- **导出**: `createColumns(withType: boolean)` 函数
- **特性**: 
  - 支持客户表格和工厂表格两种模式
  - 统一的列配置和渲染逻辑
  - 随机数据渲染（用于演示）

## 使用示例

```tsx
import { 
  StatisticsSection, 
  QuickActionsSection, 
  DeliveryTableCard, 
  AnnouncementCard 
} from '../components/workplace';

// 在组件中使用
<StatisticsSection stats={stats} loading={loading.stats} />

<QuickActionsSection quickActions={quickActions} />

<DeliveryTableCard
  title="7天待交货列表（客户）"
  dataSource={customerDeliveries}
  loading={loading.customerData}
  pagination={customerPagination}
  onPaginationChange={handleCustomerPaginationChange}
  withType={false}
/>

<AnnouncementCard
  announcements={announcements}
  loading={loading.announcements}
  pagination={announcementPagination}
  onPaginationChange={handleAnnouncementPaginationChange}
  onPublishClick={handlePublishClick}
/>
```

## 重构亮点

1. **模块化**: 每个组件职责单一，便于维护和测试
2. **可复用**: 表格组件通过 `withType` 参数支持不同配置
3. **类型安全**: 完整的 TypeScript 类型定义
4. **一致性**: 统一的样式和交互模式
5. **可扩展**: 易于添加新功能和修改现有功能

## 兼容性

- 保持了原有 Workplace 组件的所有功能
- API 完全向后兼容
- 样式和行为与原组件一致
- 分页修复：解决了修改每页数量时显示空白的问题

## 开发建议

1. 修改组件功能时，优先考虑在对应的子组件中进行
2. 添加新的表格类型时，扩展 `table-columns.tsx` 中的配置
3. 需要新的卡片类型时，参考现有组件创建新的模块
4. 保持组件接口的一致性，便于后续维护