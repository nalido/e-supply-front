import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Affix,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Image,
  List,
  message,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DownloadOutlined,
  EditOutlined,
  FileOutlined,
  PrinterOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type {
  SampleAttachment,
  SampleMaterialItem,
  SampleOrderDetail,
  SampleOtherCostItem,
  SampleProcessItem,
} from '../types/sample-detail';
import { sampleService } from '../api/mock';
import DonutChart from '../components/charts/DonutChart';

const { Title, Paragraph, Text } = Typography;

const SECTION_IDS = {
  base: 'sample-detail-base',
  quantity: 'sample-detail-quantity',
  bom: 'sample-detail-bom',
  process: 'sample-detail-process',
  size: 'sample-detail-size',
  other: 'sample-detail-other',
  attachments: 'sample-detail-attachments',
  cost: 'sample-detail-cost',
} as const;

type SectionKey = keyof typeof SECTION_IDS;

const formatCurrency = (value: number): string => `¥${value.toFixed(2)}`;

const SampleDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [detail, setDetail] = useState<SampleOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [costRefreshing, setCostRefreshing] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('bom');

  const sampleId = searchParams.get('id') ?? '';

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const payload = await sampleService.getSampleDetail(sampleId);
        setDetail(payload);
      } catch (error) {
        console.error('Failed to load sample detail', error);
        message.error('加载样板单详情失败，请稍后重试');
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [sampleId]);

  const handleScrollTo = useCallback((section: SectionKey) => {
    const tabSections = new Set<SectionKey>(['bom', 'process', 'size', 'other', 'attachments']);
    if (tabSections.has(section)) {
      setActiveDetailTab(section);
    }
    const targetId = section === 'base'
      ? SECTION_IDS.base
      : section === 'bom' || section === 'process' || section === 'size' || section === 'other' || section === 'attachments'
        ? SECTION_IDS.bom
        : SECTION_IDS.cost;
    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, tabSections.has(section) ? 120 : 0);
  }, []);

  const handleEdit = useCallback(() => {
    message.info('编辑功能即将开放');
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/sample/list');
    }
  }, [navigate]);

  const handleRefreshCost = useCallback(() => {
    setCostRefreshing(true);
    window.setTimeout(() => {
      setCostRefreshing(false);
      message.success('成本信息已刷新');
    }, 600);
  }, []);

  const handleUploadAttachment = useCallback(() => {
    message.info('上传附件功能即将开放');
  }, []);

  const quantityColumns = useMemo<ColumnsType<{ key: string; color: string; subtotal: number }>>(() => {
    if (!detail) {
      return [];
    }

    const sizeColumns = detail.sizes.map((size) => ({
      dataIndex: size,
      title: size,
      align: 'center' as const,
      render: (value: number) => value || '-',
    }));

    return [
      { dataIndex: 'color', title: '颜色', fixed: 'left', width: 120 },
      ...sizeColumns,
      {
        dataIndex: 'subtotal',
        title: '小计',
        align: 'center',
        render: (value: number) => value || '-',
      },
    ];
  }, [detail]);

  const quantityData = useMemo(() => {
    if (!detail) {
      return [];
    }
    return detail.colors.map((color) => {
      const sizeMap = detail.quantityMatrix[color] ?? {};
      const subtotal = detail.sizes.reduce((acc, size) => acc + (sizeMap[size] ?? 0), 0);
      return {
        key: color,
        color,
        subtotal,
        ...detail.sizes.reduce<Record<string, number | string>>((row, size) => {
          row[size] = sizeMap[size] ?? 0;
          return row;
        }, {}),
      };
    });
  }, [detail]);

  const quantitySummary = useMemo(() => {
    if (!detail) {
      return null;
    }
    const sizeTotals = detail.sizes.reduce<Record<string, number>>((acc, size) => {
      acc[size] = detail.colors.reduce((sum, color) => sum + (detail.quantityMatrix[color]?.[size] ?? 0), 0);
      return acc;
    }, {});
    const grandTotal = Object.values(sizeTotals).reduce((sum, value) => sum + value, 0);
    return { sizeTotals, grandTotal };
  }, [detail]);

  const materialColumns = useMemo<ColumnsType<SampleMaterialItem>>(() => [
    {
      dataIndex: 'image',
      title: '物料图片',
      width: 100,
      render: (src: string | undefined) => (
        src ? <Image src={src} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 64, height: 64, background: '#f5f5f5', borderRadius: 8 }} />
      ),
    },
    { dataIndex: 'name', title: '物料名称', width: 160 },
    { dataIndex: 'code', title: '物料编号', width: 140 },
    { dataIndex: 'unit', title: '单位', width: 80 },
    {
      dataIndex: 'consumption',
      title: '单耗',
      width: 100,
      align: 'right',
      render: (value: number) => value.toFixed(2),
    },
    {
      dataIndex: 'unitPrice',
      title: '单价',
      width: 100,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      dataIndex: 'cost',
      title: '成本',
      width: 120,
      align: 'right',
      render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
    },
    {
      dataIndex: 'remark',
      title: '备注',
    },
  ], []);

  const processColumns = useMemo<ColumnsType<SampleProcessItem>>(() => [
    { dataIndex: 'sequence', title: '工序号', width: 90, align: 'center' },
    { dataIndex: 'name', title: '工序名称', width: 180 },
    {
      dataIndex: 'laborPrice',
      title: '工价',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      dataIndex: 'standardTime',
      title: '标准工时',
      width: 120,
      align: 'center',
      render: (value: number | undefined) => (value ? `${value.toFixed(1)} h` : '-'),
    },
    { dataIndex: 'remark', title: '备注' },
  ], []);

  const otherCostColumns = useMemo<ColumnsType<SampleOtherCostItem>>(() => [
    { dataIndex: 'costType', title: '费用类型', width: 180 },
    {
      dataIndex: 'developmentCost',
      title: '开发费用',
      width: 140,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    {
      dataIndex: 'quotedUnitCost',
      title: '报价成本单价',
      width: 160,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    { dataIndex: 'remark', title: '备注' },
  ], []);

  const developmentColumns = useMemo(() => [
    { dataIndex: 'name', title: '费用项目', width: 180 },
    {
      dataIndex: 'amount',
      title: '金额',
      width: 120,
      align: 'right',
      render: (value: number) => formatCurrency(value),
    },
    { dataIndex: 'remark', title: '备注' },
  ], []);

  const costChartData = useMemo(() => {
    if (!detail) {
      return [];
    }
    const { fabric, trims, packaging, processing } = detail.cost.breakdown;
    return [
      { name: '面料', value: fabric, colorStops: ['#4F6FF7', '#6A8DFF'] as [string, string] },
      { name: '辅料', value: trims, colorStops: ['#6AD2FF', '#4EA9F7'] as [string, string] },
      { name: '包材', value: packaging, colorStops: ['#7B61FF', '#9D8CFF'] as [string, string] },
      { name: '加工', value: processing, colorStops: ['#FF9F7A', '#FFBB96'] as [string, string] },
    ].filter((item) => item.value > 0);
  }, [detail]);

  const costChartTotal = useMemo(() => costChartData.reduce((sum, item) => sum + item.value, 0), [costChartData]);

  const detailTabExtra = useMemo(() => (
    activeDetailTab === 'attachments'
      ? <Button type="link" icon={<UploadOutlined />} onClick={handleUploadAttachment}>上传附件</Button>
      : <Button type="link" icon={<EditOutlined />} onClick={handleEdit}>编辑</Button>
  ), [activeDetailTab, handleEdit, handleUploadAttachment]);

  const renderAttachmentItem = useCallback((item: SampleAttachment) => (
    <List.Item key={item.id} actions={[<Button key="download" type="link" icon={<DownloadOutlined />} onClick={() => message.success(`开始下载 ${item.name}`)}>下载</Button>]}> 
      <List.Item.Meta
        avatar={<FileOutlined style={{ fontSize: 20, color: '#1677ff' }} />}
        title={<Text strong>{item.name}</Text>}
        description={(<Space size={12}><span>{item.type.toUpperCase()}</span><span>{item.size}</span><span>{item.updatedAt}</span></Space>)}
      />
    </List.Item>
  ), []);

  const sectionButtons: Array<{ key: SectionKey; label: string }> = [
    { key: 'base', label: '基础信息' },
    { key: 'bom', label: '物料清单' },
    { key: 'process', label: '加工类型' },
    { key: 'size', label: '尺寸表' },
    { key: 'other', label: '其他费用' },
    { key: 'attachments', label: '附件' },
  ];

  return (
    <div style={{ padding: '0 24px 120px' }}>
      <Spin spinning={loading} delay={200}>
        {detail ? (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>

            <Card
              id={SECTION_IDS.base}
              title="基础信息"
              extra={<Button type="link" icon={<EditOutlined />} onClick={handleEdit}>编辑</Button>}
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} labelStyle={{ width: 110 }}>
                    <Descriptions.Item label="款号">{detail.styleNo}</Descriptions.Item>
                    <Descriptions.Item label="样板单">{detail.sampleNo}</Descriptions.Item>
                    <Descriptions.Item label="跟单员">{detail.merchandiser ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="纸样师">{detail.patternMaker ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="打板价">{formatCurrency(detail.patternPrice)}</Descriptions.Item>
                    <Descriptions.Item label="款名">{detail.styleName}</Descriptions.Item>
                    <Descriptions.Item label="板类">{detail.patternType ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="下板日期">{detail.patternDate}</Descriptions.Item>
                    <Descriptions.Item label="纸样号">{detail.paperPatternNo ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="备注" span={3}>{detail.remarks ?? '暂无备注'}</Descriptions.Item>
                    <Descriptions.Item label="单位">{detail.unit}</Descriptions.Item>
                    <Descriptions.Item label="客户">{detail.customer ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="预计交板">{detail.estimatedDeliveryDate ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="车板师">{detail.sampleSewer ?? '-'}</Descriptions.Item>
                    <Descriptions.Item label="加工类型" span={2}>
                      <Space size={[8, 8]} wrap>
                        {detail.processingTypes.map((type) => (
                          <Tag key={type} color="blue">{type}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="颜色" span={2}>
                      <Space size={[8, 8]} wrap>
                        {detail.colors.map((color) => (
                          <Tag key={color} color="geekblue">{color}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="尺码" span={2}>
                      <Space size={[8, 8]} wrap>
                        {detail.sizes.map((size) => (
                          <Tag key={size} color="purple">{size}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col xs={24} lg={8}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {detail.lineArtImage ? (
                      <Image
                        src={detail.lineArtImage}
                        width={260}
                        height={300}
                        style={{ objectFit: 'cover', borderRadius: 12, boxShadow: '0 6px 18px rgba(31, 59, 115, 0.12)' }}
                      />
                    ) : (
                      <Empty description="暂无线稿图" />
                    )}
                  </div>
                </Col>
              </Row>
            </Card>

            <Card id={SECTION_IDS.quantity} title="颜色尺码数量表">
              <Table
                rowKey="key"
                bordered
                pagination={false}
                columns={quantityColumns}
                dataSource={quantityData}
                summary={() => (
                  quantitySummary ? (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <Text strong>合计</Text>
                      </Table.Summary.Cell>
                      {detail?.sizes.map((size, idx) => (
                        <Table.Summary.Cell key={size} index={idx + 1} align="center">
                          {quantitySummary.sizeTotals[size]}
                        </Table.Summary.Cell>
                      ))}
                      <Table.Summary.Cell index={(detail?.sizes.length ?? 0) + 1} align="center">
                        <Text strong>{quantitySummary.grandTotal}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  ) : null
                )}
              />
            </Card>

            <Card
              id={SECTION_IDS.bom}
              title="详细信息"
              bodyStyle={{ paddingTop: 12 }}
            >
              <Tabs
                activeKey={activeDetailTab}
                onChange={setActiveDetailTab}
                tabBarExtraContent={detailTabExtra}
                items={[
                  {
                    key: 'bom',
                    label: '物料清单',
                    children: (
                      <Tabs
                        type="card"
                        items={[
                          {
                            key: 'fabrics',
                            label: '面料',
                            children: detail.bom.fabrics.length ? (
                              <Table
                                rowKey="id"
                                pagination={false}
                                columns={materialColumns}
                                dataSource={detail.bom.fabrics}
                                summary={() => (
                                  <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={6}>
                                      <Text strong>面料成本合计</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={6} align="right">
                                      <Text strong>{formatCurrency(detail.cost.breakdown.fabric)}</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={7}>
                                      &nbsp;
                                    </Table.Summary.Cell>
                                  </Table.Summary.Row>
                                )}
                              />
                            ) : <Empty description="暂无面料信息" style={{ padding: '48px 0' }} />,
                          },
                          {
                            key: 'trims',
                            label: '辅料/包材',
                            children: detail.bom.trims.length ? (
                              <Table
                                rowKey="id"
                                pagination={false}
                                columns={materialColumns}
                                dataSource={detail.bom.trims}
                                summary={() => (
                                  <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={6}>
                                      <Text strong>辅料/包材成本合计</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={6} align="right">
                                      <Text strong>
                                        {formatCurrency(detail.cost.breakdown.trims + detail.cost.breakdown.packaging)}
                                      </Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={7}>
                                      &nbsp;
                                    </Table.Summary.Cell>
                                  </Table.Summary.Row>
                                )}
                              />
                            ) : <Empty description="暂无辅料/包材" style={{ padding: '48px 0' }} />,
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    key: 'process',
                    label: '加工类型',
                    children: detail.processes.length ? (
                      <Table
                        rowKey="id"
                        pagination={false}
                        columns={processColumns}
                        dataSource={detail.processes}
                      />
                    ) : <Empty description="暂无工序信息" style={{ padding: '48px 0' }} />,
                  },
                  {
                    key: 'size',
                    label: '尺寸表',
                    children: detail.sizeChartImage ? (
                      <div style={{ textAlign: 'center' }}>
                        <Image
                          src={detail.sizeChartImage}
                          width={640}
                          style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 8px 18px rgba(0,0,0,0.08)' }}
                        />
                      </div>
                    ) : <Empty description="暂无尺寸表" style={{ padding: '48px 0' }} />,
                  },
                  {
                    key: 'other',
                    label: '其他费用',
                    children: detail.otherCosts.length ? (
                      <Table
                        rowKey="id"
                        pagination={false}
                        columns={otherCostColumns}
                        dataSource={detail.otherCosts}
                        summary={() => (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2}>
                              <Text strong>开发费用合计</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <Text strong>{formatCurrency(detail.otherCosts.reduce((sum, item) => sum + item.quotedUnitCost, 0))}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3}>
                              &nbsp;
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        )}
                      />
                    ) : <Empty description="暂无其他费用" style={{ padding: '48px 0' }} />,
                  },
                  {
                    key: 'attachments',
                    label: '附件',
                    children: detail.attachments.length ? (
                      <List
                        itemLayout="horizontal"
                        dataSource={detail.attachments}
                        renderItem={renderAttachmentItem}
                      />
                    ) : <Empty description="暂无附件" style={{ padding: '48px 0' }} />,
                  },
                ]}
              />
            </Card>

            <Card
              id={SECTION_IDS.cost}
              title="样板成本信息"
              extra={(
                <Button type="link" icon={<ReloadOutlined spin={costRefreshing} />} onClick={handleRefreshCost} disabled={costRefreshing}>
                  刷新成本
                </Button>
              )}
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <DonutChart data={costChartData} total={costChartTotal} />
                </Col>
                <Col xs={24} md={12}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card bordered={false} style={{ background: '#f5f9ff' }}>
                        <Statistic
                          title="报价单件成本"
                          value={detail.cost.totalQuotedPrice}
                          precision={2}
                          prefix="¥"
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card bordered={false} style={{ background: '#f8f5ff' }}>
                        <Statistic
                          title="开发费用"
                          value={detail.cost.developmentFee}
                          precision={2}
                          prefix="¥"
                        />
                      </Card>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '16px 0' }} />
                  <Title level={5}>开发费用明细</Title>
                  <Table
                    rowKey="id"
                    columns={developmentColumns}
                    dataSource={detail.cost.developmentFeeDetails}
                    pagination={false}
                    size="small"
                    summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}>
                          <Text strong>合计</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text strong>{formatCurrency(detail.cost.developmentFee)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          &nbsp;
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                </Col>
              </Row>
            </Card>
          </Space>
        ) : (
          !loading && <Empty description="未找到样板单信息" style={{ padding: '120px 0' }} />
        )}
      </Spin>

      {detail && !loading && (
        <Affix offsetBottom={16}>
          <Card
            size="small"
            style={{
              borderRadius: 999,
              boxShadow: '0 12px 32px rgba(15, 37, 87, 0.12)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              width: 'max-content',
              margin: '16px auto 0',
            }}
          >
            <Space size={8}>
              {sectionButtons.map(({ key, label }) => (
                <Button key={key} type="link" onClick={() => handleScrollTo(key)}>
                  {label}
                </Button>
              ))}
            </Space>
            <Divider type="vertical" style={{ height: 24, margin: 0 }} />
            <Button type="primary" icon={<PrinterOutlined />} onClick={() => message.info('即将打开打印预览')}>
              打印
            </Button>
          </Card>
        </Affix>
      )}
    </div>
  );
};

export default SampleDetail;
