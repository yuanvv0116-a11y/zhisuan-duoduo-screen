import { useState } from 'react'
import { Card, Input, Select, DatePicker, Button, Segmented, Breadcrumb, Table, Tag, Typography, Space, Tooltip, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, ReloadOutlined, DownloadOutlined, EyeOutlined, UnorderedListOutlined } from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography
const { RangePicker } = DatePicker

/* ---------------- 统计卡 ---------------- */
interface OverviewCard {
  label: string
  value: string
  color: string
}

const MODEL_OVERVIEW: OverviewCard[] = [
  { label: '模型数量', value: '60', color: '#2f6bff' },
  { label: '总调用次数', value: '21.53万次', color: '#52c41a' },
  { label: '输入Tokens', value: '4.96B', color: '#722ed1' },
  { label: '输出Tokens', value: '127.03M', color: '#2f6bff' },
  { label: '缓存Tokens', value: '8.33B', color: '#13c2c2' },
  { label: '总成本', value: '2.35万元', color: '#fa541c' },
  { label: '总消费金额', value: '3.99万元', color: '#fa8c16' },
]

function OverviewCards({ data }: { data: OverviewCard[] }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
      {data.map((c) => (
        <Card key={c.label} variant="borderless" styles={{ body: { padding: 20 } }} style={{ flex: 1, minWidth: 160, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 12 }}>{c.label}</div>
          <div style={{ fontSize: 26, fontWeight: 600, color: c.color }}>{c.value}</div>
        </Card>
      ))}
    </div>
  )
}

/* ---------------- 按模型统计 ---------------- */
interface ModelRow {
  key: string
  name: string
  vendor: string
  calls: number
  success: number
  successRate: string
  tokenTotal: string
  tokenIn: string
  tokenOut: string
  tokenCache: string
  cacheHitRate: string
  cost: string
  amount: string
}

const MODEL_ROWS: ModelRow[] = [
  { key: '1', name: 'deepseek-v4-flash', vendor: '深度求索', calls: 104770, success: 104367, successRate: '99.62%', tokenTotal: '6.11B', tokenIn: '3.37B', tokenOut: '24.34M', tokenCache: '3.07B', cacheHitRate: '50.25%', cost: '2,089.287203', amount: '3,482.145339' },
  { key: '2', name: 'qwen3.6-27b-nvfp4', vendor: '阿里', calls: 63821, success: 63509, successRate: '99.51%', tokenTotal: '3.06B', tokenIn: '1.13B', tokenOut: '46.93M', tokenCache: '1.99B', cacheHitRate: '65.03%', cost: '1,380.481607', amount: '2,300.802678' },
  { key: '3', name: 'dodo-ac-ultra-4-8', vendor: '智算多多', calls: 12790, success: 12611, successRate: '98.60%', tokenTotal: '1.2B', tokenIn: '139.05M', tokenOut: '6.94M', tokenCache: '1.31B', cacheHitRate: '89.98%', cost: '10,048.151313', amount: '16,746.918855' },
  { key: '4', name: 'glm-5.2', vendor: '智谱', calls: 8708, success: 8594, successRate: '98.69%', tokenTotal: '604.6M', tokenIn: '153.79M', tokenOut: '4.67M', tokenCache: '477.05M', cacheHitRate: '78.90%', cost: '1,268.008535', amount: '2,113.347558' },
  { key: '5', name: 'dodo-ac-ultra-5', vendor: '智算多多', calls: 7621, success: 7566, successRate: '99.28%', tokenTotal: '1.02B', tokenIn: '43.41M', tokenOut: '5.12M', tokenCache: '994.15M', cacheHitRate: '95.34%', cost: '6,869.382502', amount: '11,448.970836' },
  { key: '6', name: 'kimi-k2.7-code', vendor: '月之暗面', calls: 6701, success: 6443, successRate: '96.15%', tokenTotal: '245.32M', tokenIn: '33.87M', tokenOut: '2.84M', tokenCache: '217.44M', cacheHitRate: '88.63%', cost: '430.236095', amount: '717.060158' },
  { key: '7', name: 'kimi-k2.6', vendor: '月之暗面', calls: 2174, success: 2138, successRate: '98.34%', tokenTotal: '92.43M', tokenIn: '24.32M', tokenOut: '1.54M', tokenCache: '66.57M', cacheHitRate: '72.02%', cost: '184.307323', amount: '307.178871' },
]

const parseMoney = (v: string) => Number(v.replace(/,/g, ''))
const formatMoney = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })

const getModelColumns = (onView: (r: ModelRow) => void, onDetail: (r: ModelRow) => void): ColumnsType<ModelRow> => [
  { title: '模型名称', dataIndex: 'name', key: 'name', align: 'center', width: 180 },
  { title: '模型生产商', dataIndex: 'vendor', key: 'vendor', align: 'center', width: 130, render: (v: string) => <Tag color="blue">{v}</Tag> },
  {
    title: '调用量',
    key: 'calls',
    align: 'center',
    width: 120,
    render: (_: unknown, r: ModelRow) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.calls.toLocaleString()}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>成功 {r.success.toLocaleString()}</Text>
      </div>
    ),
  },
  { title: '成功率', dataIndex: 'successRate', key: 'successRate', align: 'center', width: 100, render: (v: string) => <span style={{ color: '#52c41a' }}>{v}</span> },
  {
    title: 'Token消耗',
    key: 'token',
    align: 'center',
    width: 260,
    render: (_: unknown, r: ModelRow) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.tokenTotal}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>入 {r.tokenIn} / 出 {r.tokenOut} / 缓存 {r.tokenCache}</Text>
      </div>
    ),
  },
  { title: '缓存命中率', dataIndex: 'cacheHitRate', key: 'cacheHitRate', align: 'center', width: 110, render: (v: string) => <span style={{ color: '#13c2c2' }}>{v}</span> },
  { title: '模型成本', dataIndex: 'cost', key: 'cost', align: 'center', width: 150, render: (v: string) => <span style={{ color: '#fa541c' }}>¥ {v}</span> },
  { title: '利润', key: 'profit', align: 'center', width: 150, render: (_: unknown, r: ModelRow) => <span style={{ color: '#52c41a' }}>¥ {formatMoney(parseMoney(r.amount) - parseMoney(r.cost))}</span> },
  { title: '消费金额', dataIndex: 'amount', key: 'amount', align: 'center', width: 150, render: (v: string) => <span style={{ color: '#2f6bff' }}>¥ {v}</span> },
  {
    title: (
      <span>
        操作
        <RequirementDot
          title="操作"
          sections={[
            {
              label: '',
              items: '使用明细和调用明细均增加成本和利润。',
            },
          ]}
        />
      </span>
    ),
    key: 'op',
    align: 'center',
    width: 110,
    render: (_: unknown, r: ModelRow) => (
      <Space size={12}>
        <Tooltip title="查看">
          <EyeOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} onClick={() => onView(r)} />
        </Tooltip>
        <Tooltip title="明细">
          <UnorderedListOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} onClick={() => onDetail(r)} />
        </Tooltip>
      </Space>
    ),
  },
]

/* ---------------- 模型-各账户使用情况（眼睛弹窗） ---------------- */
interface ModelAccountRow {
  key: string
  account: string
  type: string
  calls: number
  tokens: string
  cost: string
  amount: string
}

const MODEL_ACCOUNT_ROWS: ModelAccountRow[] = [
  { key: '1', account: 'wjv', type: '个人账号', calls: 1864, tokens: '101043745', cost: '40.142437', amount: '66.904062' },
  { key: '2', account: 'YaoKun', type: '个人账号', calls: 237, tokens: '12530171', cost: '5.961750', amount: '9.93625' },
  { key: '3', account: '15624957255', type: '企业账号', calls: 1, tokens: '511', cost: '0.000583', amount: '0.000971' },
  { key: '4', account: '18516821209', type: '个人账号', calls: 2, tokens: '353', cost: '0.000290', amount: '0.000484' },
  { key: '5', account: '13520775123', type: '企业账号', calls: 3, tokens: '3072', cost: '0.002871', amount: '0.004785' },
  { key: '6', account: '18046524133', type: '个人账号', calls: 37, tokens: '551284', cost: '0.347470', amount: '0.579117' },
  { key: '7', account: 'vv', type: '个人账号', calls: 183, tokens: '15947682', cost: '8.887558', amount: '14.812597' },
  { key: '8', account: '17746565735', type: '个人账号', calls: 235, tokens: '16179888', cost: '5.811267', amount: '9.685445' },
  { key: '9', account: '阳光采招', type: '个人账号', calls: 402, tokens: '20179809', cost: '6.757878', amount: '11.26313' },
  { key: '10', account: '18510661017', type: '个人账号', calls: 9, tokens: '13821', cost: '0.010018', amount: '0.016697' },
]

const modelAccountColumns: ColumnsType<ModelAccountRow> = [
  { title: '账户', dataIndex: 'account', key: 'account' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '调用量', dataIndex: 'calls', key: 'calls', render: (v: number) => v.toLocaleString() },
  { title: 'Token消耗', dataIndex: 'tokens', key: 'tokens' },
  { title: '成本', dataIndex: 'cost', key: 'cost', render: (v: string) => <span style={{ color: '#fa541c' }}>¥ {v}</span> },
  { title: '利润', key: 'profit', render: (_: unknown, r: ModelAccountRow) => <span style={{ color: '#52c41a' }}>¥ {formatMoney(parseMoney(r.amount) - parseMoney(r.cost))}</span> },
  { title: '消费金额', dataIndex: 'amount', key: 'amount', render: (v: string) => <span style={{ color: '#2f6bff' }}>¥ {v}</span> },
]

/* ---------------- 模型-调用明细（明细弹窗） ---------------- */
interface ModelCallRow {
  key: string
  time: string
  tokenIn: number
  tokenOut: number
  tokenCache: number | null
  cost: string
  fee: string
  status: string
}

const MODEL_CALL_ROWS: ModelCallRow[] = [
  { key: '1', time: '2026-08-14 15:21:56', tokenIn: 48283, tokenOut: 1035, tokenCache: 9728, cost: '0.030329', fee: '0.050548', status: '成功' },
  { key: '2', time: '2026-08-14 15:21:43', tokenIn: 40879, tokenOut: 474, tokenCache: 768, cost: '0.025106', fee: '0.041843', status: '成功' },
  { key: '3', time: '2026-08-14 14:51:54', tokenIn: 171498, tokenOut: 1601, tokenCache: 12800, cost: '0.104974', fee: '0.174956', status: '成功' },
  { key: '4', time: '2026-08-14 14:51:52', tokenIn: 638, tokenOut: 150, tokenCache: null, cost: '0.000563', fee: '0.000938', status: '成功' },
  { key: '5', time: '2026-08-14 14:40:43', tokenIn: 91727, tokenOut: 1327, tokenCache: 90880, cost: '0.057719', fee: '0.096199', status: '成功' },
  { key: '6', time: '2026-08-14 14:40:35', tokenIn: 91096, tokenOut: 579, tokenCache: 90368, cost: '0.056437', fee: '0.094062', status: '成功' },
  { key: '7', time: '2026-08-14 14:40:33', tokenIn: 90532, tokenOut: 96, tokenCache: 89600, cost: '0.055510', fee: '0.092516', status: '成功' },
  { key: '8', time: '2026-08-14 14:40:23', tokenIn: 89855, tokenOut: 613, tokenCache: 39936, cost: '0.055128', fee: '0.09188', status: '成功' },
  { key: '9', time: '2026-08-14 14:40:23', tokenIn: 38861, tokenOut: 276, tokenCache: null, cost: '0.023648', fee: '0.039413', status: '成功' },
  { key: '10', time: '2026-08-14 14:40:22', tokenIn: 558, tokenOut: 234, tokenCache: 512, cost: '0.000622', fee: '0.001037', status: '成功' },
]

const modelCallColumns: ColumnsType<ModelCallRow> = [
  { title: '调用时间', dataIndex: 'time', key: 'time', align: 'center' },
  { title: '输入Token', dataIndex: 'tokenIn', key: 'tokenIn', align: 'center', render: (v: number) => v.toLocaleString() },
  { title: '输出Token', dataIndex: 'tokenOut', key: 'tokenOut', align: 'center', render: (v: number) => v.toLocaleString() },
  { title: '缓存Token', dataIndex: 'tokenCache', key: 'tokenCache', align: 'center', render: (v: number | null) => (v == null ? <Text type="secondary">——</Text> : v.toLocaleString()) },
  { title: '成本', dataIndex: 'cost', key: 'cost', align: 'center', render: (v: string) => <span style={{ color: '#fa541c' }}>¥ {v}</span> },
  { title: '利润', key: 'profit', align: 'center', render: (_: unknown, r: ModelCallRow) => <span style={{ color: '#52c41a' }}>¥ {formatMoney(parseMoney(r.fee) - parseMoney(r.cost))}</span> },
  { title: '费用', dataIndex: 'fee', key: 'fee', align: 'center', render: (v: string) => `¥ ${v}` },
  { title: '状态', dataIndex: 'status', key: 'status', align: 'center', render: (v: string) => <Tag color="success">{v}</Tag> },
]

/* ---------------- 按账户统计 ---------------- */
interface AccountRow {
  key: string
  account: string
  type: string
  calls: number
  success: number
  successRate: string
  tokenTotal: string
  tokenIn: string
  tokenOut: string
  tokenCache: string
  cacheHitRate: string
  cost: string
  amount: string
  models: string[]
  lastCall: string
}

const ACCOUNT_ROWS: AccountRow[] = [
  { key: '1', account: 'lyfyyds', type: '个人账号', calls: 4, success: 3, successRate: '75.00%', tokenTotal: '2.53K', tokenIn: '2.39K', tokenOut: '109.04K', tokenCache: '1.37K', cacheHitRate: '36.44%', cost: '3.057586', amount: '5.095977', models: ['dodo-ac-ultra-5', 'doubao-seedance-2.0'], lastCall: '2026-08-14 14:35:56' },
  { key: '2', account: '13683399424', type: '个人账号', calls: 2, success: 2, successRate: '100.00%', tokenTotal: '0', tokenIn: '0', tokenOut: '5.85M', tokenCache: '0', cacheHitRate: '0.00%', cost: '91.23192', amount: '152.0532', models: ['doubao-seedance-2.0'], lastCall: '2026-08-13 18:04:00' },
  { key: '3', account: '17600610625', type: '个人账号', calls: 12, success: 10, successRate: '83.33%', tokenTotal: '0', tokenIn: '0', tokenOut: '11.07M', tokenCache: '0', cacheHitRate: '0.00%', cost: '177.02544', amount: '295.0424', models: ['doubao-seedance-2.0', 'doubao-seedream-5.0-pro'], lastCall: '2026-08-13 16:57:33' },
  { key: '4', account: '18841647046', type: '个人账号', calls: 21, success: 21, successRate: '100.00%', tokenTotal: '900.13K', tokenIn: '225.76K', tokenOut: '8.41K', tokenCache: '665.97K', cacheHitRate: '74.68%', cost: '4.012603', amount: '6.687672', models: ['kimi-k3'], lastCall: '2026-08-14 14:49:01' },
  { key: '5', account: 'yangjihang', type: '个人账号', calls: 165, success: 164, successRate: '99.39%', tokenTotal: '4.8M', tokenIn: '1.39M', tokenOut: '53.43K', tokenCache: '3.36M', cacheHitRate: '70.74%', cost: '24.020947', amount: '40.034912', models: ['doubao-seedream-5.0-lite', 'glm-5.2', 'kimi-k3'], lastCall: '2026-08-14 14:51:25' },
]

const accountColumns: ColumnsType<AccountRow> = [
  { title: '账户信息', dataIndex: 'account', key: 'account', align: 'center', width: 150 },
  { title: '类型', dataIndex: 'type', key: 'type', align: 'center', width: 110, render: (v: string) => <Tag color="#2f6bff">{v}</Tag> },
  {
    title: '调用量',
    key: 'calls',
    align: 'center',
    width: 110,
    render: (_: unknown, r: AccountRow) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.calls}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>成功 {r.success}</Text>
      </div>
    ),
  },
  { title: '成功率', dataIndex: 'successRate', key: 'successRate', align: 'center', width: 100, render: (v: string) => <span style={{ color: '#52c41a' }}>{v}</span> },
  {
    title: 'Token消耗',
    key: 'token',
    align: 'center',
    width: 240,
    render: (_: unknown, r: AccountRow) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.tokenTotal}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>入 {r.tokenIn} / 出 {r.tokenOut} / 缓存 {r.tokenCache}</Text>
      </div>
    ),
  },
  { title: '缓存命中', dataIndex: 'cacheHitRate', key: 'cacheHitRate', align: 'center', width: 100, render: (v: string) => <span style={{ color: '#13c2c2' }}>{v}</span> },
  { title: '成本', dataIndex: 'cost', key: 'cost', align: 'center', width: 120, render: (v: string) => <span style={{ color: '#fa541c' }}>¥ {v}</span> },
  { title: '利润', key: 'profit', align: 'center', width: 120, render: (_: unknown, r: AccountRow) => <span style={{ color: '#52c41a' }}>¥ {formatMoney(parseMoney(r.amount) - parseMoney(r.cost))}</span> },
  { title: '消费金额', dataIndex: 'amount', key: 'amount', align: 'center', width: 130, render: (v: string) => <span style={{ color: '#2f6bff' }}>¥ {v}</span> },
  {
    title: '使用模型',
    key: 'models',
    align: 'center',
    width: 220,
    render: (_: unknown, r: AccountRow) => (
      <Space size={[4, 4]} wrap style={{ justifyContent: 'center' }}>
        {r.models.map((m) => (
          <Tag key={m} color="blue">{m}</Tag>
        ))}
      </Space>
    ),
  },
  {
    title: '最后调用',
    dataIndex: 'lastCall',
    key: 'lastCall',
    align: 'center',
    width: 130,
    render: (v: string) => {
      const [d, t] = v.split(' ')
      return (
        <div>
          <div>{d}</div>
          <div>{t}</div>
        </div>
      )
    },
  },
  {
    title: '操作',
    key: 'op',
    align: 'center',
    width: 80,
    render: () => (
      <Tooltip title="明细">
        <UnorderedListOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} />
      </Tooltip>
    ),
  },
]

export default function ModelUsageDetail() {
  const [tab, setTab] = useState('按模型统计')
  const [viewModel, setViewModel] = useState<ModelRow | null>(null)
  const [detailModel, setDetailModel] = useState<ModelRow | null>(null)

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb items={[{ title: '统计与分析' }, { title: '模型使用明细' }]} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segmented options={['按模型统计', '按账户统计']} value={tab} onChange={(v) => setTab(v as string)} />
      </div>

      {tab === '按模型统计' ? (
        <Card variant="borderless" styles={{ body: { padding: 20 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>
                模型使用统计
                <RequirementDot
                  title="模型使用统计"
                  sections={[
                    {
                      label: '',
                      items: [
                        '1.增加“总成本”，统计搜索条件下的模型使用成本总和。',
                        '2.列表增加缓存命中率，缓存命中率 = 缓存数 /（缓存 + 输入 token）。',
                        '3.列表增加模型成本和利润，模型利润 = 消费金额 - 成本。',
                      ],
                    },
                  ]}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>各模型的调用量、Token消耗和消费金额</Text>
            </div>
            <Button type="primary" icon={<DownloadOutlined />}>导出数据</Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <Input allowClear prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} placeholder="搜索模型名称..." style={{ width: 300 }} />
            <Select style={{ width: 160 }} defaultValue="all" options={[{ value: 'all', label: '全部供应商' }]} />
            <RangePicker placeholder={['开始日期', '结束日期']} style={{ width: 260 }} />
            <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
            <Button icon={<ReloadOutlined />}>重置</Button>
          </div>

          <OverviewCards data={MODEL_OVERVIEW} />

          <Table<ModelRow>
            rowKey="key"
            columns={getModelColumns(setViewModel, setDetailModel)}
            dataSource={MODEL_ROWS}
            scroll={{ x: 'max-content' }}
            pagination={{ showTotal: (t) => `共 ${t} 条记录` }}
          />
        </Card>
      ) : (
        <Card variant="borderless" styles={{ body: { padding: 20 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>
                账户调用明细
                <RequirementDot
                  title="账户调用明细"
                  sections={[
                    {
                      label: '',
                      items: '列表增加缓存命中、成本和利润列。缓存命中 = 缓存 /（输入 + 缓存）。',
                    },
                  ]}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>每个账户的模型调用明细</Text>
            </div>
            <Button type="primary" icon={<DownloadOutlined />}>导出数据</Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <Input allowClear prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} placeholder="搜索账户名称、所有者或账户ID..." style={{ width: 300 }} />
            <Select style={{ width: 140 }} defaultValue="all" options={[{ value: 'all', label: '全部类型' }]} />
            <Select style={{ width: 160 }} defaultValue="all" options={[{ value: 'all', label: '全部模型' }]} />
            <RangePicker placeholder={['开始日期', '结束日期']} style={{ width: 260 }} />
            <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
            <Button icon={<ReloadOutlined />}>重置</Button>
          </div>

          <Table<AccountRow>
            rowKey="key"
            columns={accountColumns}
            dataSource={ACCOUNT_ROWS}
            scroll={{ x: 'max-content' }}
            pagination={{ showTotal: (t) => `共 ${t} 条记录` }}
          />
        </Card>
      )}

      <Modal
        open={!!viewModel}
        title={
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>模型使用明细</div>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              {viewModel?.name} - 各账户使用情况
            </Text>
          </div>
        }
        onCancel={() => setViewModel(null)}
        footer={null}
        width={900}
        centered
        destroyOnHidden
      >
        <Table<ModelAccountRow>
          rowKey="key"
          columns={modelAccountColumns}
          dataSource={MODEL_ACCOUNT_ROWS}
          pagination={{
            total: 25,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Modal>

      <Modal
        open={!!detailModel}
        title={
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>调用明细</div>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              {detailModel?.name} - 最近调用记录
            </Text>
          </div>
        }
        onCancel={() => setDetailModel(null)}
        footer={null}
        width={900}
        centered
        destroyOnHidden
      >
        <Table<ModelCallRow>
          rowKey="key"
          columns={modelCallColumns}
          dataSource={MODEL_CALL_ROWS}
          pagination={{
            total: 104772,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Modal>
    </div>
  )
}
