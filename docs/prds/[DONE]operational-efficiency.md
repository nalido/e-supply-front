
# PRD: 作业时效 (Operational Efficiency)

## 1. 页面概述 (Page Overview)

**页面名称 (Page Name):** 作业时效 (Operational Efficiency)
**所属模块 (Module):** 订单生产 (Order Production)

**页面目标 (Page Goal):**
该页面用于定义和管理生产流程中的作业时效模板。用户可以创建不同的模板，每个模板包含一系列生产节点（工序），并为每个节点设置标准的作业时间或时效要求。这些模板可以应用于工厂订单，以监控和分析实际生产效率与标准效率的差异。

## 2. 页面功能与布局 (Features and Layout)

### 2.1. 总体布局 (Overall Layout)

- **顶部:** 操作与筛选区。
- **主体:** 作业时效模板列表。

### 2.2. 操作与筛选区 (Actions & Filtering Area)

- **添加作业时效 (Add Operational Efficiency):**
  - **按钮:** `+ 添加作业时效`。
  - **功能:** 点击后，弹出一个模态框或跳转到新页面，用于创建新的作业时效模板。创建时需要定义模板名称和包含的节点信息。
- **搜索框 (Search Box):**
  - **占位符:** "请输入作业时效名称"。
  - **功能:** 实时或点击搜索按钮后，根据名称过滤下方的模板列表。

### 2.3. 数据表格区 (Data Table Area)

以表格形式展示所有已定义的作业时效模板。

- **列定义 (Column Definitions):**
  - `序号` (Serial Number): 模板的顺序编号。
  - `作业时效名称` (Operational Efficiency Name): 用户定义的模板名称。
  - `默认` (Default): 一个开关（Switch）或标记，用于设定该模板是否为所有新订单的默认模板。整个列表中只应有一个默认模板。
  - `节点信息` (Node Information): 简要展示该模板包含的生产节点/工序，例如 "裁剪 -> 车缝 -> 包装"。可能是一个标签列表或纯文本。
  - `操作` (Actions): 针对每一行的操作按钮。
    - `编辑` (Edit): 修改模板名称或其节点信息。
    - `删除` (Delete): 删除该模板（若模板未被任何活动订单使用）。

- **空状态 (Empty State):**
  - 当没有定义任何模板时，表格显示 "暂无内容"。

- **分页 (Pagination):** 表格底部提供标准分页控件。

## 3. 核心功能：添加/编辑作业时效模板 (Core Feature: Add/Edit Template)

点击“添加”或“编辑”后，应出现一个界面用于配置模板。

- **模板名称 (Template Name):** 文本输入框，必填。
- **节点配置 (Node Configuration):**
  - 一个动态列表，允许用户添加、删除和排序生产节点。
  - 每个节点（Node）应包含以下字段：
    - `节点名称` (Node Name): 从预设的工序列表中选择（如：裁剪、车缝、整烫）。
    - `标准工时` (Standard Hours): 完成该节点的标准时间（例如，单位可以是小时或天）。
    - `时效单位` (Time Unit): `天` 或 `小时`。

## 4. 数据接口 (API Endpoints)

### 4.1. 获取作业时效模板列表 (GET /api/operational-efficiency/templates)
- **用途:** 获取模板列表以渲染表格。
- **参数 (Query Params):**
  - `name` (string, optional): 用于搜索的名称。
  - `page`, `pageSize` (number).
- **返回 (Response Body):**
  ```json
  {
    "list": [
      {
        "id": "1",
        "name": "标准服装生产线",
        "isDefault": true,
        "nodes": [
          { "name": "裁剪", "standardHours": 2 },
          { "name": "车缝", "standardHours": 5 },
          { "name": "包装", "standardHours": 1 }
        ],
        "nodeInfo": "裁剪 -> 车缝 -> 包装"
      }
    ],
    "total": 1
  }
  ```

### 4.2. 创建作业时效模板 (POST /api/operational-efficiency/templates)
- **用途:** 创建一个新的模板。
- **请求体 (Request Body):**
  ```json
  {
    "name": "加急订单生产线",
    "isDefault": false,
    "nodes": [
      { "name": "裁剪", "standardHours": 1 },
      { "name": "车缝", "standardHours": 3 }
    ]
  }
  ```

### 4.3. 更新作业时效模板 (PUT /api/operational-efficiency/templates/{id})
- **用途:** 更新一个已存在的模板。
- **请求体 (Request Body):** 同创建接口。

### 4.4. 删除作业时效模板 (DELETE /api/operational-efficiency/templates/{id})
- **用途:** 删除一个模板。

## 5. 非功能性需求 (Non-Functional Requirements)

- **易用性:** 节点的添加、删除和排序操作应直观、流畅。
- **数据校验:** 创建和编辑时，需校验模板名称不能为空，节点信息不能为空。
