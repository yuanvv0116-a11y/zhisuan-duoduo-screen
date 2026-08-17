import { useMemo, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Popconfirm,
  Popover,
  Tooltip,
  Typography,
  Select,
  Tag,
  message,
} from 'antd'
import { EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons'
import type { ChannelModelItem, ModelCostConfig } from '../types'
import { useChannels, useChannelModels } from '../store'
import { endpointLabel } from '../constants'
import ChannelModelModal from '../components/ChannelModelModal'
import ModelCostModal from '../components/ModelCostModal'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography

function EndpointSummary({ list }: { list: ChannelModelItem['endpoints'] }) {
  const fullContent = (
    <div style={{ maxWidth: 360 }}>
      {list.map((e) => (
        <div
          key={e.endpointKey}
          style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'center' }}
        >
          <Tag color="blue" style={{ margin: 0, flex: 'none' }}>
            {endpointLabel(e.endpointKey)}
          </Tag>
          <Text
            type={e.mappingUrl ? undefined : 'secondary'}
            style={{ fontSize: 12, maxWidth: 240 }}
            ellipsis={{ tooltip: e.mappingUrl || '未填写映射地址' }}
          >
            {e.mappingUrl || '未填写映射地址'}
          </Text>
        </div>
      ))}
    </div>
  )

  return (
    <Popover content={fullContent} title={`端点映射明细（${list.length}）`} trigger="hover">
      <Button type="link" size="small" style={{ padding: 0 }}>
        已配置 {list.length} 个
      </Button>
    </Popover>
  )
}

const COST_TYPE_LABELS: Record<string, string> = {
  token: '按 token 计费',
  image_quality: '按图片质量计费',
  image_token: '按图片token计费',
  video_quality: '按视频质量计费',
  video_quality_token: '按视频质量token计费',
  vidu_image_quality: 'vidu按图片质量计费',
}

function costRow(label: string, value: number | undefined) {
  return (
    <div
      key={label}
      style={{ display: 'flex', justifyContent: 'space-between', gap: 24, padding: '3px 0' }}
    >
      <Text style={{ fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 12 }}>￥{value ?? '—'}</Text>
    </div>
  )
}

function CostSummary({ config }: { config: ModelCostConfig }) {
  const rows: React.ReactNode[] = []
  if (config.priceType === 'token') {
    rows.push(costRow('输入', config.inputPrice))
    rows.push(costRow('输出', config.outputPrice))
    if (config.cachedEnabled) {
      rows.push(costRow('缓存', config.cachedPrice))
      rows.push(costRow('缓存创建', config.cacheCreatePrice))
      rows.push(costRow('缓存读取', config.cacheReadPrice))
    }
  } else if (config.tiers && config.tiers.length) {
    config.tiers.forEach((t) => rows.push(costRow(`${t.label}`, t.price)))
  } else {
    rows.push(
      <Text key="empty" type="secondary" style={{ fontSize: 12 }}>
        暂无具体价格配置
      </Text>,
    )
  }
  return (
    <Popover
      content={<div style={{ minWidth: 220 }}>{rows}</div>}
      title="模型成本明细"
      trigger="hover"
    >
      <Tag color="purple" style={{ margin: 0, cursor: 'pointer' }}>
        {COST_TYPE_LABELS[config.priceType] ?? config.priceType}
      </Tag>
    </Popover>
  )
}

export default function ChannelModelManage() {
  const { channels } = useChannels()
  const { channelModels, addChannelModel, updateChannelModel, removeChannelModel } =
    useChannelModels()

  const [nameKw, setNameKw] = useState('')
  const [codeKw, setCodeKw] = useState('')
  const [channelKw, setChannelKw] = useState<string>('all')
  const [query, setQuery] = useState<{ name: string; code: string; channelId: string }>({
    name: '',
    code: '',
    channelId: 'all',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChannelModelItem | null>(null)
  const [costOpen, setCostOpen] = useState(false)
  const [costModel, setCostModel] = useState<ChannelModelItem | null>(null)

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? '—'

  const handleSearch = () => setQuery({ name: nameKw, code: codeKw, channelId: channelKw })
  const handleReset = () => {
    setNameKw('')
    setCodeKw('')
    setChannelKw('all')
    setQuery({ name: '', code: '', channelId: 'all' })
  }

  const filtered = useMemo(() => {
    const n = query.name.trim().toLowerCase()
    const c = query.code.trim().toLowerCase()
    return channelModels.filter((m) => {
      const matchName = !n || m.modelName.toLowerCase().includes(n)
      const matchCode = !c || m.modelCode.toLowerCase().includes(c)
      const matchChannel = query.channelId === 'all' || m.channelId === query.channelId
      return matchName && matchCode && matchChannel
    })
  }, [channelModels, query])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (m: ChannelModelItem) => {
    setEditing(m)
    setModalOpen(true)
  }

  const openCost = (m: ChannelModelItem) => {
    setCostModel(m)
    setCostOpen(true)
  }

  const handleCostSubmit = (id: string, config: ModelCostConfig) => {
    updateChannelModel(id, { costConfig: config })
    setCostOpen(false)
  }

  const handleSubmit = (data: ChannelModelItem) => {
    if (data.id) {
      updateChannelModel(data.id, data)
      message.success('渠道模型已更新')
    } else {
      const { id, createdAt, operator, ...rest } = data
      addChannelModel(rest)
      message.success('渠道模型已创建')
    }
    setModalOpen(false)
  }

  return (
    <PageShell
      breadcrumb={['渠道管理', '渠道模型管理']}
      onSearch={handleSearch}
      onReset={handleReset}
      listTitle="渠道模型 列表"
      total={filtered.length}
      hideTotal
      addText="新增渠道模型"
      onAdd={openCreate}
      titleExtra={
        <RequirementDot
          title="渠道模型管理 · 页面总览"
          sections={[
            {
              label: '',
              items: [
                '1.列表字段包含：渠道模型名称、渠道名称、Model Code、端点映射、操作人、创建时间。按照创建时间倒序展示。',
                '2.渠道名称展示该模型所属的渠道；Model Code、端点映射无信息时展示“——”。',
                '3.端点映射鼠标悬浮，展示该模型已配置的端点与映射地址明细。',
                '4.如设置模型成本，展示模型成本类型，鼠标悬浮，展示成本明细。',
                '5.点击删除，检查当前渠道模型是否有关联的对外销售模型，如有，提示“当前模型已关联对外销售模型，请在模型管理中取消关联” ，如没有关联的对外的模型，则二次确认后删除',
              ],
            },
          ]}
        />
      }
      searchExtra={
        <RequirementDot
          title="搜索与筛选"
          sections={[
            {
              label: '搜索条件',
              items: [
                '「模型名称」：按照模型名称模糊搜索，匹配忽略大小写。',
                '「Model Code」：按照 Model Code 精确搜索，匹配忽略大小写。',
                '「渠道名称」：下拉单选，可选值为 全部渠道 / 各渠道名称，按照下拉选项精确搜索。',
              ],
            },
            {
              label: '默认与重置',
              items: ['默认搜索全部。', '点击重置恢复默认搜索条件。'],
            },
          ]}
        />
      }
      searchFields={
        <>
          <SearchField label="模型名称">
            <Input
              allowClear
              placeholder="请输入模型名称"
              style={{ width: 200 }}
              value={nameKw}
              onChange={(e) => setNameKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="Model Code">
            <Input
              allowClear
              placeholder="请输入 Model Code"
              style={{ width: 200 }}
              value={codeKw}
              onChange={(e) => setCodeKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="渠道名称">
            <Select
              style={{ width: 200 }}
              value={channelKw}
              onChange={setChannelKw}
              showSearch
              optionFilterProp="label"
              options={[
                { value: 'all', label: '全部渠道' },
                ...channels.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </SearchField>
        </>
      }
    >
      <Table<ChannelModelItem>
        rowKey="id"
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 8, showTotal: (t) => `共 ${t} 条记录` }}
        columns={[
          {
            title: '渠道模型名称',
            dataIndex: 'modelName',
            width: 180,
            fixed: 'left',
            render: (v: string) => <Text>{v}</Text>,
          },
          {
            title: '渠道名称',
            dataIndex: 'channelId',
            width: 160,
            render: (v: string) => {
              const name = channelName(v)
              return name === '—' ? <Text type="secondary">—</Text> : <Text>{name}</Text>
            },
          },
          {
            title: 'Model Code',
            dataIndex: 'modelCode',
            width: 180,
            ellipsis: true,
            render: (v: string) =>
              v ? (
                <Tooltip title={v}>
                  <Text>{v}</Text>
                </Tooltip>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: '端点映射',
            dataIndex: 'endpoints',
            width: 140,
            render: (list: ChannelModelItem['endpoints']) =>
              list && list.length ? (
                <EndpointSummary list={list} />
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: '模型成本',
            dataIndex: 'costConfig',
            width: 150,
            render: (cfg?: ModelCostConfig) =>
              cfg ? <CostSummary config={cfg} /> : <Text type="secondary">—</Text>,
          },
          {
            title: '操作人',
            dataIndex: 'operator',
            width: 110,
            render: (v: string) => <Text>{v}</Text>,
          },
          { title: '创建时间', dataIndex: 'createdAt', width: 120 },
          {
            title: '操作',
            width: 220,
            fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(r)}
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => openCost(r)}
                >
                  模型成本
                </Button>
                <Popconfirm
                  title="确认删除该渠道模型？"
                  onConfirm={() => {
                    removeChannelModel(r.id)
                    message.success('已删除')
                  }}
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <ChannelModelModal
        open={modalOpen}
        model={editing}
        channels={channels}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ModelCostModal
        open={costOpen}
        model={costModel}
        onClose={() => setCostOpen(false)}
        onSubmit={handleCostSubmit}
      />
    </PageShell>
  )
}
