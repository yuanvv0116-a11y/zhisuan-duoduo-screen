import { useMemo, useState } from 'react'
import {
  Breadcrumb,
  Card,
  Input,
  DatePicker,
  Button,
  Space,
  Tabs,
  Table,
  Typography,
  message,
} from 'antd'
import { SearchOutlined, ExportOutlined } from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography
const { RangePicker } = DatePicker

interface BillRow {
  id: string
  date: string
  channel: string
  channelApi: string
  points: number
  cost: number
  amount: number
}

const dailyRows: BillRow[] = [
  { id: 'd1', date: '2026-08-12', channel: '阿里云', channelApi: '阿里云', points: 0, cost: 98.320145, amount: 129.550971 },
  { id: 'd2', date: '2026-08-12', channel: '智算多多-新疆', channelApi: '智算多多-新疆', points: 0, cost: 101.284502, amount: 133.15045 },
  { id: 'd3', date: '2026-08-12', channel: '电信-国际', channelApi: '电信-国际', points: 0, cost: 2103.665218, amount: 2816.877881 },
  { id: 'd4', date: '2026-08-12', channel: '火山', channelApi: '火山', points: 0, cost: 1.42, amount: 1.98 },
  { id: 'd5', date: '2026-08-12', channel: '生数科技-国内', channelApi: '生数科技-国内', points: 640, cost: 11.85, amount: 16.36 },
  { id: 'd6', date: '2026-08-11', channel: '智算多多-新疆', channelApi: '智算多多-新疆', points: 0, cost: 214.328917, amount: 286.655384 },
  { id: 'd7', date: '2026-08-11', channel: '智算多多-北京', channelApi: '智算多多-北京', points: 0, cost: 8.964213, amount: 12.005691 },
  { id: 'd8', date: '2026-08-11', channel: '电信-国际', channelApi: '电信-国际', points: 0, cost: 1312.774556, amount: 1757.103005 },
  { id: 'd9', date: '2026-08-10', channel: '智算多多-新疆', channelApi: '智算多多-新疆', points: 0, cost: 74.518362, amount: 99.725826 },
  { id: 'd10', date: '2026-08-10', channel: '智算多多-北京', channelApi: '智算多多-北京', points: 0, cost: 19.782441, amount: 26.476155 },
  { id: 'd11', date: '2026-08-10', channel: '电信-国际', channelApi: '电信-国际', points: 0, cost: 1374.812375, amount: 1840.4245 },
  { id: 'd12', date: '2026-08-09', channel: '智算多多-新疆', channelApi: '智算多多-新疆', points: 0, cost: 88.641209, amount: 118.65976 },
  { id: 'd13', date: '2026-08-09', channel: '智算多多-北京', channelApi: '智算多多-北京', points: 0, cost: 18.104538, amount: 24.227584 },
]

const monthlyRows: BillRow[] = [
  { id: 'm1', date: '2026-08', channel: '阿里云', channelApi: '阿里云', points: 0, cost: 98.320145, amount: 129.550971 },
  { id: 'm2', date: '2026-08', channel: '智算多多-新疆', channelApi: '智算多多-新疆', points: 0, cost: 478.771990, amount: 638.191420 },
  { id: 'm3', date: '2026-08', channel: '智算多多-北京', channelApi: '智算多多-北京', points: 0, cost: 46.851192, amount: 62.70943 },
  { id: 'm4', date: '2026-08', channel: '电信-国际', channelApi: '电信-国际', points: 0, cost: 4791.252149, amount: 6414.405386 },
  { id: 'm5', date: '2026-08', channel: '火山', channelApi: '火山', points: 0, cost: 1.42, amount: 1.98 },
  { id: 'm6', date: '2026-08', channel: '生数科技-国内', channelApi: '生数科技-国内', points: 640, cost: 11.85, amount: 16.36 },
]

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: '#f5f6f8',
        borderRadius: 8,
        padding: '12px 20px',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
      }}
    >
      <Text type="secondary">{label}：</Text>
      <span style={{ color: '#2f6bff', fontWeight: 600, fontSize: 18 }}>{value}</span>
    </div>
  )
}

function BillTable({ rows }: { rows: BillRow[] }) {
  const stats = useMemo(() => {
    const channels = new Set(rows.map((r) => r.channel)).size
    const cost = rows.reduce((s, r) => s + r.cost, 0)
    const amount = rows.reduce((s, r) => s + r.amount, 0)
    const points = rows.reduce((s, r) => s + r.points, 0)
    return { channels, cost, amount, points }
  }, [rows])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space size={16}>
          <StatChip label="渠道数量" value={String(stats.channels)} />
          <StatChip label="成本总额" value={`${stats.cost.toFixed(2)} 元`} />
          <StatChip label="利润总额" value={`${(stats.amount - stats.cost).toFixed(2)} 元`} />
          <StatChip label="消费总金额" value={`${stats.amount.toFixed(2)} 元`} />
          <StatChip label="消费总积分" value={String(stats.points)} />
        </Space>
        <Button
          type="primary"
          icon={<ExportOutlined />}
          onClick={() => message.success('已导出')}
        >
          导出
        </Button>
      </div>

      <Table<BillRow>
        rowKey="id"
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
        columns={[
          { title: '日期', dataIndex: 'date', width: 200, align: 'center' },
          { title: '渠道', dataIndex: 'channel', width: 220, align: 'center' },
          { title: '渠道API', dataIndex: 'channelApi', width: 220, align: 'center' },
          { title: '消费积分', dataIndex: 'points', width: 180, align: 'center' },
          {
            title: '成本金额',
            dataIndex: 'cost',
            width: 180,
            align: 'center',
            render: (v: number) => v,
          },
          {
            title: '利润',
            width: 180,
            align: 'center',
            render: (_: unknown, r: BillRow) => (
              <span style={{ color: '#52c41a' }}>{+(r.amount - r.cost).toFixed(6)}</span>
            ),
          },
          {
            title: '消费金额',
            dataIndex: 'amount',
            width: 180,
            align: 'center',
            render: (v: number) => v,
          },
          {
            title: '操作',
            width: 160,
            align: 'center',
            fixed: 'right',
            render: () => (
              <Button type="link" size="small" style={{ padding: 0 }}>
                费用明细
              </Button>
            ),
          },
        ]}
      />
    </div>
  )
}

export default function ChannelBill() {
  const [tab, setTab] = useState('daily')

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: '渠道管理' }, { title: '渠道对账单' }]}
      />

      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Input placeholder="请输入渠道名称" allowClear style={{ width: 200 }} />
          <Input placeholder="请输入渠道API名称" allowClear style={{ width: 200 }} />
          <RangePicker style={{ width: 260 }} />
          <Space>
            <Button type="primary" icon={<SearchOutlined />}>
              搜索
            </Button>
            <Button>重置</Button>
          </Space>
        </div>
      </Card>

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'daily', label: '日账单', children: <BillTable rows={dailyRows} /> },
            {
              key: 'monthly',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  月账单
                  <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
                    <RequirementDot
                      title="渠道对账单"
                      sections={[
                        {
                          label: '',
                          items: [
                            '1.日账单、月账单列表增加成本金额列。支持导出；',
                            '2.列表上方统计，消费总金额前，增加成本总额。',
                            '3.日账单、月账单列表成本金额后增加利润列，利润 = 消费金额 - 成本。',
                            '4.列表上方统计增加利润总额，利润总额 = 消费总金额 - 成本总额。',
                          ],
                        },
                      ]}
                    />
                  </span>
                </span>
              ),
              children: <BillTable rows={monthlyRows} />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
