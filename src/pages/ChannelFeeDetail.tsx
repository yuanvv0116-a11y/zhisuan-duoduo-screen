import {
  Breadcrumb,
  Card,
  Input,
  DatePicker,
  Button,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { SearchOutlined, ExportOutlined, UserOutlined } from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography
const { RangePicker } = DatePicker

interface FeeRow {
  id: string
  startTime: string
  endTime: string
  userPhone: string
  userAccount: string
  userKey: string
  payPhone: string
  payAccount: string
  vendor: string
  channel: string
  channelApi: string
  channelModelCode: string
  saleModelName: string
  billingType: string
  mediaQuality: string
  usageCount: string
  unitPrice: { input: string; output: string; cache: string; cacheCreate: string; cacheRead: string }
  costPrice: { input: string; output: string; cache: string; cacheCreate: string; cacheRead: string }
  costTotal: string
  otherParams: string
  viduPoints: string
  tokenInAmount: number
  tokenInFee: string
  tokenOutAmount: number
  tokenOutFee: string
  openaiCacheReadAmount: number
  openaiCacheReadFee: string
  anthropicCacheCreate: number
  anthropicCacheRead: number
  totalFee: string
}

const unit = { input: '1', output: '2', cache: '0.02', cacheCreate: '0', cacheRead: '0.02' }
const cost = { input: '0.8', output: '1.5', cache: '0.015', cacheCreate: '0', cacheRead: '0.015' }

const rows: FeeRow[] = [
  {
    id: '203895',
    startTime: '2026-08-12 18:30:15',
    endTime: '2026-08-12 18:30:22',
    userPhone: '155****3215',
    userAccount: 'ACC202606230005',
    userKey: 'sk-qhk*****dk3fxl',
    payPhone: '155****3215',
    payAccount: 'ACC202606230005',
    vendor: '深度求索',
    channel: '阿里云',
    channelApi: '阿里云',
    channelModelCode: 'deepseek-v4-flash-0731',
    saleModelName: 'deepseek-v4-flash',
    billingType: '按 token 计费',
    mediaQuality: '——',
    usageCount: '——',
    unitPrice: unit,
    costPrice: cost,
    costTotal: '0.362609',
    otherParams: '无视频输入',
    viduPoints: '—',
    tokenInAmount: 444003,
    tokenInFee: '0.444003',
    tokenOutAmount: 195,
    tokenOutFee: '0.00039',
    openaiCacheReadAmount: 443392,
    openaiCacheReadFee: '0.008868',
    anthropicCacheCreate: 0,
    anthropicCacheRead: 0,
    totalFee: '0.453261',
  },
  {
    id: '203894',
    startTime: '2026-08-12 18:29:58',
    endTime: '2026-08-12 18:30:10',
    userPhone: '155****3215',
    userAccount: 'ACC202606230005',
    userKey: 'sk-qhk*****dk3fxl',
    payPhone: '155****3215',
    payAccount: 'ACC202606230005',
    vendor: '深度求索',
    channel: '阿里云',
    channelApi: '阿里云',
    channelModelCode: 'deepseek-v4-flash-0731',
    saleModelName: 'deepseek-v4-flash',
    billingType: '按 token 计费',
    mediaQuality: '——',
    usageCount: '——',
    unitPrice: unit,
    costPrice: cost,
    costTotal: '0.362621',
    otherParams: '无视频输入',
    viduPoints: '—',
    tokenInAmount: 443452,
    tokenInFee: '0.443452',
    tokenOutAmount: 488,
    tokenOutFee: '0.000976',
    openaiCacheReadAmount: 442368,
    openaiCacheReadFee: '0.008848',
    anthropicCacheCreate: 0,
    anthropicCacheRead: 0,
    totalFee: '0.453276',
  },
  {
    id: '203893',
    startTime: '2026-08-12 18:27:43',
    endTime: '2026-08-12 18:27:53',
    userPhone: '155****3215',
    userAccount: 'ACC202606230005',
    userKey: 'sk-qhk*****dk3fxl',
    payPhone: '155****3215',
    payAccount: 'ACC202606230005',
    vendor: '深度求索',
    channel: '阿里云',
    channelApi: '阿里云',
    channelModelCode: 'deepseek-v4-flash-0731',
    saleModelName: 'deepseek-v4-flash',
    billingType: '按 token 计费',
    mediaQuality: '——',
    usageCount: '——',
    unitPrice: unit,
    costPrice: cost,
    costTotal: '0.362344',
    otherParams: '无视频输入',
    viduPoints: '—',
    tokenInAmount: 442757,
    tokenInFee: '0.442757',
    tokenOutAmount: 665,
    tokenOutFee: '0.00133',
    openaiCacheReadAmount: 442112,
    openaiCacheReadFee: '0.008843',
    anthropicCacheCreate: 0,
    anthropicCacheRead: 0,
    totalFee: '0.45293',
  },
  {
    id: '203891',
    startTime: '2026-08-12 18:27:30',
    endTime: '2026-08-12 18:27:42',
    userPhone: '155****3215',
    userAccount: 'ACC202606230005',
    userKey: 'sk-qhk*****dk3fxl',
    payPhone: '155****3215',
    payAccount: 'ACC202606230005',
    vendor: '深度求索',
    channel: '阿里云',
    channelApi: '阿里云',
    channelModelCode: 'deepseek-v4-flash-0731',
    saleModelName: 'deepseek-v4-flash',
    billingType: '按 token 计费',
    mediaQuality: '——',
    usageCount: '——',
    unitPrice: unit,
    costPrice: cost,
    costTotal: '0.354819',
    otherParams: '无视频输入',
    viduPoints: '—',
    tokenInAmount: 442134,
    tokenInFee: '0.442134',
    tokenOutAmount: 531,
    tokenOutFee: '0.001062',
    openaiCacheReadAmount: 16384,
    openaiCacheReadFee: '0.000328',
    anthropicCacheCreate: 0,
    anthropicCacheRead: 0,
    totalFee: '0.443524',
  },
]

const blueFee = (v: string) => <Text style={{ color: '#2f6bff' }}>￥{v}</Text>

export default function ChannelFeeDetail() {
  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: '渠道管理' }, { title: '渠道费用明细' }]}
      />

      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <Space size={8}>
            <Text>渠道：</Text>
            <Input defaultValue="阿里云" allowClear style={{ width: 180 }} />
          </Space>
          <Space size={8}>
            <Text>渠道API：</Text>
            <Input defaultValue="阿里云" allowClear style={{ width: 180 }} />
          </Space>
          <Space size={8}>
            <Text>日期：</Text>
            <RangePicker style={{ width: 300 }} />
          </Space>
          <Space>
            <Button type="primary" icon={<SearchOutlined />}>
              搜索
            </Button>
            <Button>重置</Button>
          </Space>
        </div>
      </Card>

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
          <Button type="primary" icon={<ExportOutlined />} onClick={() => message.success('已导出')}>
            导出
          </Button>
          <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8 }}>
            <RequirementDot
              title="渠道费用明细"
              sections={[
                {
                  label: '',
                  items: [
                    '1.单价改为销售单价。将销售单价移到，单次费用总计前。',
                    '2.在销售单价前增加“成本价”列，在成本价后增加“单次成本总计”。成本价：调用的实际的渠道模型的成本价；单次成本总计：单次调用所消耗的 用量x成本价的总和。',
                    '3.支持导出新增字段。',
                  ],
                },
              ]}
            />
          </span>
        </div>

        <Table<FeeRow>
          rowKey="id"
          dataSource={rows}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 90, fixed: 'left' },
            {
              title: '调用时间',
              width: 200,
              render: (_, r) => (
                <Space direction="vertical" size={6}>
                  <Tag color="blue" style={{ margin: 0 }}>{r.startTime}</Tag>
                  <Tag color="red" style={{ margin: 0 }}>{r.endTime}</Tag>
                </Space>
              ),
            },
            {
              title: '用户信息',
              width: 200,
              render: (_, r) => (
                <div style={{ lineHeight: 1.8 }}>
                  <div>
                    <UserOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
                    {r.userPhone}
                  </div>
                  <div>{r.userAccount}</div>
                  <div>{r.userKey}</div>
                </div>
              ),
            },
            {
              title: '扣费账户',
              width: 180,
              render: (_, r) => (
                <div style={{ lineHeight: 1.8 }}>
                  <div>{r.payPhone}</div>
                  <div>{r.payAccount}</div>
                </div>
              ),
            },
            { title: '模型生产商', dataIndex: 'vendor', width: 120 },
            { title: '渠道', dataIndex: 'channel', width: 120 },
            { title: '渠道API', dataIndex: 'channelApi', width: 140 },
            { title: '渠道模型code', dataIndex: 'channelModelCode', width: 200 },
            { title: '在售模型名称', dataIndex: 'saleModelName', width: 180 },
            { title: '计费方式', dataIndex: 'billingType', width: 130 },
            {
              title: '图片/视频质量',
              dataIndex: 'mediaQuality',
              width: 130,
              render: (v: string) => <Text type="secondary">{v}</Text>,
            },
            {
              title: '张数/秒数/用量',
              dataIndex: 'usageCount',
              width: 130,
              render: (v: string) => <Text type="secondary">{v}</Text>,
            },
            {
              title: '其他参数',
              dataIndex: 'otherParams',
              width: 130,
              render: (v: string) => <Tag color="green">{v}</Tag>,
            },
            {
              title: '使用积分(vidu)',
              dataIndex: 'viduPoints',
              width: 130,
              render: (v: string) => <Text type="secondary">{v}</Text>,
            },
            {
              title: 'Token输入量/费用',
              width: 160,
              render: (_, r) => (
                <div style={{ lineHeight: 1.8 }}>
                  <div>{r.tokenInAmount}</div>
                  <div>{blueFee(r.tokenInFee)}</div>
                </div>
              ),
            },
            {
              title: 'Token输出量/费用',
              width: 160,
              render: (_, r) => (
                <div style={{ lineHeight: 1.8 }}>
                  <div>{r.tokenOutAmount}</div>
                  <div>{blueFee(r.tokenOutFee)}</div>
                </div>
              ),
            },
            {
              title: 'OpenAI缓存读取/费用',
              width: 170,
              render: (_, r) => (
                <div style={{ lineHeight: 1.8 }}>
                  <div>{r.openaiCacheReadAmount}</div>
                  <div>{blueFee(r.openaiCacheReadFee)}</div>
                </div>
              ),
            },
            { title: 'Anthropic缓存创建Token/费用', dataIndex: 'anthropicCacheCreate', width: 190 },
            { title: 'Anthropic缓存读取Token/费用', dataIndex: 'anthropicCacheRead', width: 190 },
            {
              title: '成本价',
              width: 180,
              render: (_, r) => (
                <div style={{ lineHeight: 1.9 }}>
                  <div>输入：￥{r.costPrice.input}</div>
                  <div>输出：￥{r.costPrice.output}</div>
                  <div>缓存：￥{r.costPrice.cache}</div>
                  <div>缓存创建：￥{r.costPrice.cacheCreate}</div>
                  <div>缓存读取：￥{r.costPrice.cacheRead}</div>
                </div>
              ),
            },
            {
              title: '单次成本总计',
              dataIndex: 'costTotal',
              width: 140,
              render: (v: string) => <Text strong>￥{v}</Text>,
            },
            {
              title: '销售单价',
              width: 180,
              render: (_, r) => (
                <div style={{ lineHeight: 1.9 }}>
                  <div>输入：￥{r.unitPrice.input}</div>
                  <div>输出：￥{r.unitPrice.output}</div>
                  <div>缓存：￥{r.unitPrice.cache}</div>
                  <div>缓存创建：￥{r.unitPrice.cacheCreate}</div>
                  <div>缓存读取：￥{r.unitPrice.cacheRead}</div>
                </div>
              ),
            },
            {
              title: '单次费用总计',
              dataIndex: 'totalFee',
              width: 140,
              fixed: 'right',
              render: (v: string) => <Text strong>￥{v}</Text>,
            },
          ]}
        />
      </Card>
    </div>
  )
}
