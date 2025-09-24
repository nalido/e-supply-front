import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Table, Typography, Segmented } from 'antd';
import { Line, Pie } from '@ant-design/plots';
import { CalendarOutlined } from '@ant-design/icons';
import { sampleService } from '../api/mock';
import type { ColumnsType } from 'antd/es/table';
import type { LineConfig, PieConfig } from '@ant-design/plots';
import type {
  SampleDashboardStats,
  SampleChartPoint,
  SamplePieDatum,
  SampleOverdueItem,
} from '../types/sample';
import type { ReactNode } from 'react';

const { Text } = Typography;

export default function SampleDashboard() {
  const [stats, setStats] = useState<SampleDashboardStats>({
    thisWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
  });
  const [chartData, setChartData] = useState<SampleChartPoint[]>([]);
  const [pieData, setPieData] = useState<SamplePieDatum[]>([]);
  const [overdueSamples, setOverdueSamples] = useState<SampleOverdueItem[]>([]);
  const [pieType, setPieType] = useState<string>('纸样师');
  const [loading, setLoading] = useState(false);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [statsData, chartDataset, pieDataset, overdueData] = await Promise.all([
        sampleService.getSampleStats(),
        sampleService.getSampleChartData(),
        sampleService.getSamplePieData(),
        sampleService.getOverdueSamples({ page: 1, pageSize: 10 })
      ]);
      
      setStats(statsData);
      setChartData(chartDataset);
      setPieData(pieDataset);
      setOverdueSamples(overdueData.list);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const overdueColumns: ColumnsType<SampleOverdueItem> = [
    {
      title: '图片',
      dataIndex: 'image',
      key: 'image',
      width: 80,
      render: () => (
        <div style={{ width: 40, height: 40, backgroundColor: '#f5f5f5', borderRadius: 4 }} />
      ),
    },
    {
      title: '样板单号',
      dataIndex: 'sampleNo',
      key: 'sampleNo',
      render: (text: string) => <Text style={{ color: '#1890ff' }}>{text}</Text>,
    },
    {
      title: '款号款名',
      dataIndex: 'styleName',
      key: 'styleName',
    },
    {
      title: '板类',
      dataIndex: 'sampleType',
      key: 'sampleType',
    },
    {
      title: '预计交板',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
    },
    {
      title: '超期',
      dataIndex: 'overdueDays',
      key: 'overdueDays',
      render: (days: number) => (
        <Text type={days > 0 ? 'danger' : 'secondary'}>
          {days > 0 ? `${days}天` : '-'}
        </Text>
      ),
    },
  ];

  const lineConfig: LineConfig = {
    data: chartData,
    xField: 'date',
    yField: 'count',
    seriesField: 'type',
    smooth: true,
    color: ['#1890ff', '#52c41a'],
    legend: {
      position: 'top-left' as const,
    },
    xAxis: {
      type: 'time' as const,
    },
    yAxis: {
      title: {
        text: '',
      },
    },
  };

  const pieConfig: PieConfig = {
    data: pieData.filter(item => item.category === pieType),
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: 'spider' as const,
      labelHeight: 28,
      content: '{name}\n{percentage}',
    },
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        content: `合计样板\n2398`,
      },
    },
    color: pieType === '纸样师' ? ['#52c41a', '#f5f5f5'] : ['#1890ff', '#f5f5f5'],
  };

  const StatCard = ({ title, value, unit, color, icon }: {
    title: string;
    value: number;
    unit: string;
    color: string;
    icon: ReactNode;
  }) => (
    <Card style={{ height: '100%', background: color }}>
      <div style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>{icon} {title}</div>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>
            {value}<span style={{ fontSize: 16, marginLeft: 4 }}>{unit}</span>
          </div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.3 }}>{icon}</div>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <StatCard
            title="本周"
            value={stats.thisWeek || 0}
            unit="款"
            color="linear-gradient(135deg, #52c41a, #73d13d)"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="本月"
            value={stats.thisMonth || 0}
            unit="款"
            color="linear-gradient(135deg, #1890ff, #40a9ff)"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="上月"
            value={stats.lastMonth || 0}
            unit="款"
            color="linear-gradient(135deg, #fa8c16, #ffa940)"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="本年"
            value={stats.thisYear || 0}
            unit="款"
            color="linear-gradient(135deg, #f5222d, #ff4d4f)"
            icon={<CalendarOutlined />}
          />
        </Col>
      </Row>

      {/* 图表和表格 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card 
            title="打板对照表（半年）"
            extra={
              <Segmented
                options={['板类对比表（年）']}
                value="板类对比表（年）"
                size="small"
              />
            }
            loading={loading}
          >
            <Line {...lineConfig} height={200} />
          </Card>
        </Col>
        
        <Col span={12}>
          <Card 
            title="板类对比表（年）"
            loading={loading}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Text type="secondary">板类 (个)</Text>
            </div>
            <Pie {...pieConfig} height={200} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="样板超期" loading={loading}>
            <Table
              columns={overdueColumns}
              dataSource={overdueSamples}
              rowKey="id"
              size="small"
              pagination={{
                size: 'small',
                showSizeChanger: true,
                showQuickJumper: true,
                total: 0,
                current: 1,
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </Card>
        </Col>
        
        <Col span={12}>
          <Card 
            title="打板数量占比（年）"
            extra={
              <Segmented
                options={['纸样师', '车板师']}
                value={pieType}
                onChange={setPieType}
                size="small"
              />
            }
            loading={loading}
          >
            <Pie {...pieConfig} height={200} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
