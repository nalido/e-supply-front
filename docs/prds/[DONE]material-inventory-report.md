
# PRD: 物料进销存报表 (Material Inventory Report)

## 1. 页面信息 (Page Information)

- **页面标题 (Page Title):** 物料进销存报表 (Material Inventory Report)
- **URL:** `/#/materialSaleStock/materialStockReportAggregation/materialStockReport`
- **所属菜单 (Menu):** 物料进销存 (Material Inventory) -> 报表中心 (Report Center) -> 物料进销存报表 (Material Inventory Report)

## 2. 页面功能概述 (Page Functional Overview)

该页面是物料管理的数据汇总与分析中心。它通过图表和数据报表的形式，直观地展示了物料在选定时间范围内的进、销、存（入库、出库、结存）情况，帮助管理者掌握整体物料流转状态和库存健康度。

## 3. 页面结构与元素 (Page Structure and Elements)

### 3.1. 数据可视化区 (Data Visualization Area)

- **物料趋势图 (半年) (Material Trend Chart - 6 Months):**
  - **类型:** 折线图 (Line Chart)。
  - **内容:** 展示过去六个月每月的“入库数”和“出库数”，形成两条趋势线，用于分析物料流转的季节性或周期性规律。
  - **交互:** 支持点击图例（入库数/出库数）来显示或隐藏对应的趋势线。

- **物料入库占比表 (Material Inbound Ratio Chart):**
  - **类型:** 饼图 (Pie Chart) 或环形图 (Donut Chart)。
  - **内容:** 展示在选定时间范围内，不同物料类型（如“面料”、“辅料”）的入库金额占比。中心区域显示总的“合计金额”。
  - **交互:** 鼠标悬停在不同扇区上时，会高亮并显示该类型的具体名称、金额和百分比。

### 3.2. 筛选与操作区 (Filter and Action Area)

- **物料名称搜索 (Material Name Search):**
  - **元素:** 文本输入框，占位符为“请输入物料名称”。
- **物料类型筛选 (Material Type Filter):**
  - **元素:** 下拉菜单或一组标签按钮（如“面料”、“辅料/包材”）。
- **日期范围选择 (Date Range Picker):**
  - **元素:** 两个日期选择框，“开始日期”和“结束日期”，用于定义报表统计的时间区间。
- **查询按钮 (Search Button):**
  - **交互:** 点击后，根据所有筛选条件刷新下方的报表数据。
- **导出Excel (Export Excel) Button:**
  - **交互:** 点击后，将下方表格中当前查询结果的数据导出为 Excel 文件。

### 3.3. 进销存报表 (Inventory Report Table)

- **功能:** 以表格形式汇总展示每个物料在选定周期内的进出存数据。
- **列表列 (Table Columns) - 已观察到 (Observed):**
  - `图片 (Image)`
  - `物料类型 (Material Type)`
  - `物料名称 (Material Name)`
  - `颜色 (Color)`
  - `幅宽|克重 (Width|Weight)`
  - `采购单位 (Unit)`
  - `入库数 (Inbound Qty)`: 周期内总入库数量。
  - `领料数 (Issued Qty)`: 周期内生产领料出库总数。
  - `退料数 (Return Qty)`: 周期内退还到仓库的总数（应为入库的一种）。
  - `其它出库数 (Other Outbound Qty)`: 周期内非生产领料的其他出库总数。
  - `当前库存 (Current Stock)`: 物料的实时库存结余。

### 3.4. 分页 (Pagination)

- **功能:** 标准分页组件，用于浏览多页的物料报表数据。

## 4. 交互与流程 (Interactions and Flows)

1.  **默认加载:** 用户进入页面，默认加载过去特定时间段（如过去30天）的所有物料进销存报表，并刷新顶部的图表。
2.  **自定义查询:**
    - 用户选择特定的物料类型（如“辅料”）。
    - 用户设定一个时间范围（如“上个月”）。
    - 用户输入物料名称关键词（如“拉链”）。
    - 点击“查询”按钮。
3.  **结果呈现:** 系统根据筛选条件，重新计算并刷新页面上的所有图表和下方的表格数据。
4.  **数据导出:** 用户点击“导出Excel”，下载报表文件，用于离线分析或存档。

## 5. 核心指标定义 (Core Metric Definitions)

- **入库数:** 统计周期内，所有采购入库、退料入库等增加库存的操作的数量总和。
- **领料数:** 统计周期内，为生产订单领料出库的数量总和。
- **当前库存:** 物料在系统中的实时结存数量，不受报表时间范围影响。
- **期初库存 (Implied):** 虽然未直接显示，但计算逻辑中应包含：`期末库存 = 期初库存 + 周期内总入库 - 周期内总出库`。

