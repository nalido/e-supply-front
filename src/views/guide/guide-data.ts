const screenshotBase = '/operation-guide';

export type GuideImage = {
  src: string;
  alt: string;
  caption: string;
};

export type GuideSection = {
  slug: string;
  title: string;
  description: string;
  audience: string;
  prerequisites: string[];
  steps: string[];
  checkpoints: string[];
  troubleshooting: string[];
  images: GuideImage[];
};

export const guideSections: Record<string, GuideSection> = {
  'quick-start': {
    slug: 'quick-start',
    title: '快速开始：MVP全链路',
    description:
      '用一条样板单贯通生产、采购、入库、出库与成本报表，并形成结算记录。',
    audience: '业务负责人 / 主管 / 全链路演示',
    prerequisites: [
      '已完成基础资料：款式、物料、往来单位、仓库。',
      '账号具备样板、生产、采购、仓储与结算权限。',
      '已有可用工序模板或跟进模板。',
    ],
    steps: [
      '进入【打板 → 样板单】点击“新建样板单”，补全客户、款式、数量、工序、物料与费用后保存。',
      '回到样板单列表，对该样板点击“下大货”，确认后状态变为“生产中”。',
      '进入【订单生产 → 工厂订单】确认已生成对应的大货订单。',
      '进入【物料进销存 → 备料采购入库】创建采购单，选择物料与仓库并保存；在列表中完成收料。',
      '进入【成品进销存 → 已收货】登记成品入库，随后在【成品进销存 → 出库明细】创建出库并填写物流信息。',
      '进入【订单生产 → 报表中心】查看大货成本与出货利润；进入【打板 → 报表中心】查看样板成本。',
      '进入【对账结算 → 客户收款/供应商付款/加工厂付款】录入对应单据，再在【对账明细表】核对记录。',
    ],
    checkpoints: [
      '工厂订单列表存在对应订单号，状态为生产中或已完成。',
      '采购收料后物料库存增加，收料明细可检索。',
      '成品出库后，出货利润报表可按订单检索。',
      '对账明细表出现对应单据记录。',
    ],
    troubleshooting: [
      '未生成工厂订单：确认样板状态是否为“生产中”。',
      '报表无数据：确认采购/入库/出库单据已完成。',
      '对账明细为空：确认对应业务单据已完成并触发对账。',
    ],
    images: [
      {
        src: `${screenshotBase}/01-dashboard-workplace.png`,
        alt: '工作台',
        caption: '工作台（从左侧菜单进入各模块）。',
      },
      {
        src: `${screenshotBase}/02-sample-list.png`,
        alt: '样板单列表',
        caption: '样板单列表（新建样板/下大货入口）。',
      },
      {
        src: `${screenshotBase}/09-orders-factory.png`,
        alt: '工厂订单',
        caption: '工厂订单（样板转大货后自动生成）。',
      },
      {
        src: `${screenshotBase}/18-material-purchase-prep.png`,
        alt: '备料采购入库',
        caption: '备料采购入库（创建采购单并收料）。',
      },
      {
        src: `${screenshotBase}/25-product-inbound-received.png`,
        alt: '成品已收货',
        caption: '成品入库记录。',
      },
      {
        src: `${screenshotBase}/27-product-outbound.png`,
        alt: '成品出库明细',
        caption: '成品出库明细（填写物流信息）。',
      },
      {
        src: `${screenshotBase}/14-orders-report-cost.png`,
        alt: '大货成本报表',
        caption: '大货成本报表（估算 vs 实际）。',
      },
      {
        src: `${screenshotBase}/47-settlement-report-statement.png`,
        alt: '对账明细表',
        caption: '对账明细表（核对收付款记录）。',
      },
    ],
  },
  settings: {
    slug: 'settings',
    title: '系统设置',
    description: '配置组织、岗位与系统偏好，为业务模块提供人员与权限基础。',
    audience: '管理员 / 人事 / 权限管理员',
    prerequisites: ['已登录管理员账号。'],
    steps: [
      '进入【系统设置 → 我的企业】核对企业名称、联系方式与默认配置。',
      '进入【系统设置 → 组织架构】新增部门并添加成员。',
      '进入【系统设置 → 岗位管理】新增岗位并配置权限范围。',
      '进入【系统设置 → 偏好设置】设置默认筛选、时间范围或下载选项。',
      '进入【系统设置 → 操作日志】核对关键操作记录是否完整。',
    ],
    checkpoints: ['成员能在样板/生产/采购页面下拉中被选中。'],
    troubleshooting: ['无法保存：检查必填字段与权限。'],
    images: [
      { src: `${screenshotBase}/54-settings-profile.png`, alt: '个人资料', caption: '个人资料' },
      { src: `${screenshotBase}/56-settings-org.png`, alt: '组织架构', caption: '组织架构' },
      { src: `${screenshotBase}/57-settings-roles.png`, alt: '岗位管理', caption: '岗位管理' },
      { src: `${screenshotBase}/59-settings-audit.png`, alt: '操作日志', caption: '操作日志' },
    ],
  },
  basic: {
    slug: 'basic',
    title: '基础资料',
    description: '款式、物料、往来单位与工艺模板是后续业务单据的核心数据源。',
    audience: '业务管理员 / 计划 / 供应链',
    prerequisites: ['系统设置已完成基础组织与权限配置。'],
    steps: [
      '进入【基础资料 → 款式资料】新增款式与SKU，上传图片。',
      '进入【基础资料 → 物料档案】新增物料，填写规格、单位与单价。',
      '进入【基础资料 → 往来单位】新增客户、供应商、加工厂。',
      '进入【基础资料 → 加工类型/工序模板】维护工序模板与加工费用信息。',
      '进入【基础资料 → 仓库】新增物料仓与成品仓。',
    ],
    checkpoints: ['样板单创建时能选择款式、客户与物料。'],
    troubleshooting: ['下拉为空：检查基础资料是否创建。'],
    images: [
      { src: `${screenshotBase}/48-basic-styles.png`, alt: '款式资料', caption: '款式资料' },
      { src: `${screenshotBase}/49-basic-material.png`, alt: '物料档案', caption: '物料档案' },
      { src: `${screenshotBase}/50-basic-partners.png`, alt: '往来单位', caption: '往来单位' },
      { src: `${screenshotBase}/52-basic-operation-template.png`, alt: '工序模板', caption: '工序模板' },
      { src: `${screenshotBase}/53-basic-warehouse.png`, alt: '仓库', caption: '仓库' },
    ],
  },
  sample: {
    slug: 'sample',
    title: '打板（样板链路）',
    description: '样板单用于打样、报价与转大货；跟进模板用于过程追踪。',
    audience: '打板主管 / 设计 / 跟单',
    prerequisites: ['已维护款式、客户、物料与工序模板。'],
    steps: [
      '进入【打板 → 样板单】点击“新建样板单”。',
      '填写样板信息：客户、款式、数量、交期、负责人。',
      '在BOM与费用区域补充物料与开发费用，保存样板单。',
      '在列表中点击“下大货”，将样板状态推进至生产中。',
      '进入【打板 → 报表中心】查看打板下单对照与成本核价。',
    ],
    checkpoints: ['样板转大货后，工厂订单自动生成。'],
    troubleshooting: ['下大货失败：确认样板状态与权限。'],
    images: [
      { src: `${screenshotBase}/02-sample-list.png`, alt: '样板单', caption: '样板单列表' },
      { src: `${screenshotBase}/03-sample-create-modal.png`, alt: '样板创建', caption: '样板单新建弹窗' },
      { src: `${screenshotBase}/05-sample-follow-template.png`, alt: '跟进模板', caption: '跟进模板' },
      { src: `${screenshotBase}/08-sample-costing-report.png`, alt: '样板成本', caption: '成本核价表' },
    ],
  },
  orders: {
    slug: 'orders',
    title: '订单生产',
    description: '工厂订单与委外生产构成生产主链路，报表中心支持成本与利润分析。',
    audience: '生产主管 / 计划 / 采购',
    prerequisites: ['样板已转大货或已创建工厂订单。'],
    steps: [
      '进入【订单生产 → 工厂订单】查看大货订单状态与交期。',
      '进入【订单生产 → 委外生产表】核对外发订单与加工厂信息。',
      '进入【订单生产 → 订单生产对照表】查看生产进度对比。',
      '进入【订单生产 → 作业时效】观察工序耗时与效率。',
      '进入【订单生产 → 报表中心】查看出货利润、大货成本与物料需求。',
    ],
    checkpoints: ['订单物料需求报表可按订单检索。'],
    troubleshooting: ['利润报表为空：确认已出库发货。'],
    images: [
      { src: `${screenshotBase}/09-orders-factory.png`, alt: '工厂订单', caption: '工厂订单' },
      { src: `${screenshotBase}/10-orders-outsource.png`, alt: '委外生产表', caption: '委外生产表' },
      { src: `${screenshotBase}/14-orders-report-cost.png`, alt: '大货成本报表', caption: '大货成本报表' },
      { src: `${screenshotBase}/13-orders-report-profit.png`, alt: '出货利润', caption: '订单出货利润' },
    ],
  },
  material: {
    slug: 'material',
    title: '物料进销存',
    description: '采购、库存与领料数据形成物料成本来源与库存流转记录。',
    audience: '采购 / 仓储 / 计划',
    prerequisites: ['物料档案、仓库、供应商已建。'],
    steps: [
      '进入【物料进销存 → 物料库存】查看库存、批次与单位信息。',
      '进入【物料进销存 → 备料采购入库】点击“备料采购”创建采购单。',
      '在采购列表中点击“收料”，录入收料数量与单价。',
      '进入【物料进销存 → 领料出库明细】查看领料记录。',
      '进入【物料进销存 → 报表中心】查看进销存与采购入库明细报表。',
    ],
    checkpoints: ['采购收料后库存增加并产生成本流水。'],
    troubleshooting: ['无法收料：确认采购单状态与数量。'],
    images: [
      { src: `${screenshotBase}/17-material-stock.png`, alt: '物料库存', caption: '物料库存' },
      { src: `${screenshotBase}/19-material-purchase-create.png`, alt: '备料采购', caption: '备料采购新建' },
      { src: `${screenshotBase}/21-material-report-overview.png`, alt: '物料报表', caption: '物料进销存报表' },
    ],
  },
  product: {
    slug: 'product',
    title: '成品进销存',
    description: '成品入库/出库形成实际发货与利润核算依据。',
    audience: '仓储 / 物流 / 生产',
    prerequisites: ['生产订单已生成可入库的成品。'],
    steps: [
      '进入【成品进销存 → 成品库存】查看SKU库存。',
      '进入【成品进销存 → 待收货/已收货】进行成品入库。',
      '如需非生产入库，使用【成品进销存 → 其它入库】创建记录。',
      '进入【成品进销存 → 出库明细】创建出库单并填写物流信息。',
      '进入【成品进销存 → 报表中心】查看库存与出入库汇总。',
    ],
    checkpoints: ['出库后库存减少，发货利润报表可检索。'],
    troubleshooting: ['无法出库：确认库存充足。'],
    images: [
      { src: `${screenshotBase}/23-product-stock.png`, alt: '成品库存', caption: '成品库存' },
      { src: `${screenshotBase}/25-product-inbound-received.png`, alt: '成品已收货', caption: '成品已收货' },
      { src: `${screenshotBase}/27-product-outbound.png`, alt: '成品出库', caption: '成品出库明细' },
    ],
  },
  piecework: {
    slug: 'piecework',
    title: '车间计件',
    description: '裁床、进度、质检与薪资结算形成生产执行成本。',
    audience: '车间主管 / 质检 / 人事',
    prerequisites: ['工厂订单与工序模板已准备。'],
    steps: [
      '进入【车间计件 → 工厂订单】查看生产任务。',
      '进入【车间计件 → 裁床单】处理待裁与已裁任务。',
      '进入【车间计件 → 车间进度】查看工序完成情况。',
      '进入【车间计件 → 质检管理】录入质检结果。',
      '进入【车间计件 → 薪资管理】结算计件薪资。',
      '进入【车间计件 → 报表中心】查看下载记录与生产报表。',
    ],
    checkpoints: ['薪资结算后写入加工成本。'],
    troubleshooting: ['报表无数据：确认已产生计件记录。'],
    images: [
      { src: `${screenshotBase}/29-piecework-orders.png`, alt: '计件工厂订单', caption: '计件工厂订单' },
      { src: `${screenshotBase}/30-piecework-cutting-pending.png`, alt: '待裁', caption: '裁床待裁' },
      { src: `${screenshotBase}/34-piecework-payroll.png`, alt: '薪资管理', caption: '薪资管理' },
      { src: `${screenshotBase}/37-piecework-report.png`, alt: '计件报表', caption: '计件报表中心' },
    ],
  },
  collab: {
    slug: 'collab',
    title: '协同中心',
    description: '协同模块用于外发订单与外接订单的收发管理。',
    audience: '外发管理 / 协同人员',
    prerequisites: ['往来单位已配置加工厂/协作方。'],
    steps: [
      '进入【协同中心 → 外发订单】新建外发订单并填写加工厂信息。',
      '在外发订单中记录发货、收货与返工信息。',
      '进入【协同中心 → 外接订单】查看外接订单与处理状态。',
    ],
    checkpoints: ['外发收货后对账记录可生成。'],
    troubleshooting: ['无法收货：确认外发单状态。'],
    images: [
      { src: `${screenshotBase}/38-collab-send-out.png`, alt: '外发订单', caption: '外发订单' },
      { src: `${screenshotBase}/39-collab-receive-in.png`, alt: '外接订单', caption: '外接订单' },
    ],
  },
  settlement: {
    slug: 'settlement',
    title: '对账结算',
    description: '收款、付款与对账报表用于资金闭环，导出可追溯。',
    audience: '财务 / 出纳',
    prerequisites: ['往来单位与业务单据已存在。'],
    steps: [
      '进入【对账结算 → 客户收款】点击新增，录入收款金额与收款方式。',
      '进入【对账结算 → 供应商付款/加工厂付款】登记付款单。',
      '进入【对账结算 → 出纳账户】维护收付款账户与余额。',
      '进入【对账结算 → 报表中心】导出客户/供应商/加工厂明细与对账明细。',
    ],
    checkpoints: ['导出报表后下载中心有记录。'],
    troubleshooting: ['对账明细为空：确认已生成对账记录。'],
    images: [
      { src: `${screenshotBase}/40-settlement-receivable.png`, alt: '客户收款', caption: '客户收款' },
      { src: `${screenshotBase}/41-settlement-payable-factory.png`, alt: '加工厂付款', caption: '加工厂付款' },
      { src: `${screenshotBase}/43-settlement-cashier.png`, alt: '出纳账户', caption: '出纳账户' },
      { src: `${screenshotBase}/47-settlement-report-statement.png`, alt: '对账明细', caption: '对账明细表' },
    ],
  },
};

export const guideSectionList = [
  { slug: 'quick-start', title: '快速开始', description: '一步走通样板→生产→采购→入库→报表→结算。' },
  { slug: 'settings', title: '系统设置', description: '组织、岗位、偏好、操作日志。' },
  { slug: 'basic', title: '基础资料', description: '款式、物料、往来单位、工艺与仓库。' },
  { slug: 'sample', title: '打板', description: '样板单、跟进模板、样板类型与报表。' },
  { slug: 'orders', title: '订单生产', description: '工厂订单、委外生产与报表中心。' },
  { slug: 'material', title: '物料进销存', description: '采购入库、库存、领料与报表。' },
  { slug: 'product', title: '成品进销存', description: '入库、出库、库存与报表。' },
  { slug: 'piecework', title: '车间计件', description: '裁床、进度、薪资、质检与报表。' },
  { slug: 'collab', title: '协同中心', description: '外发订单与外接订单。' },
  { slug: 'settlement', title: '对账结算', description: '收付款、出纳账户与对账报表。' },
];
