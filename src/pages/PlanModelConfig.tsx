import { useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { Button, Input, Modal, Popconfirm, Select, Space, Table, Tooltip, Typography, message } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import { buildModelRatePool, PROMO_ROW_KEY, useChannels, useModels, usePlanModels } from '../store'
import type { PlanModelConfig as PlanModelRow, TokenPlan } from '../types'

const { Text } = Typography

/** 档位行唯一键与 store 同源：模型名 + 档位名 */
const rowKeyOf = PROMO_ROW_KEY

/** 配置行：套餐模型配置叠加派生的渠道名 */
interface ConfigRow extends PlanModelRow {
  /** 该档位所属渠道名；模型未配置 API 或渠道已删除时为 null */
  channelName: string | null
}

/** 候选池行：全量「模型 × 档位」叠加派生的渠道名 */
interface PoolRow {
  modelName: string
  multiplierName: string
  modelMultiplier: number | undefined
  channelName: string | null
}

export default function PlanModelConfig({ plan, onBack }: { plan: TokenPlan; onBack: () => void }) {
  const { models } = useModels()
  const { channels } = useChannels()
  const { planModels, addPlanModels, removePlanModel } = usePlanModels()

  const [nameKw, setNameKw] = useState('')
  const [channelKw, setChannelKw] = useState<string | undefined>(undefined)
  const [multiplierKw, setMultiplierKw] = useState<number | undefined>(undefined)
  const [query, setQuery] = useState<{ name: string; channel?: string; multiplier?: number }>({ name: '' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const channelNameById = useMemo(() => new Map(channels.map((c) => [c.id, c.name])), [channels])

  /** 渠道反查：模型名::档位名 -> 渠道 id（来自模型 API 配置） */
  const channelIdByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const model of models) {
      for (const cfg of model.apiConfigs ?? []) {
        const key = rowKeyOf({ modelName: model.name, multiplierName: cfg.multiplierName?.trim() || '标准倍率' })
        if (!map.has(key)) map.set(key, cfg.channelId)
      }
    }
    return map
  }, [models])

  const channelNameOf = (row: { modelName: string; multiplierName: string }) =>
    channelNameById.get(channelIdByKey.get(rowKeyOf(row)) ?? '') ?? null

  /** 主列表行 = 本套餐已配置的模型档位，渠道名从模型 API 配置派生 */
  const rows: ConfigRow[] = useMemo(
    () =>
      planModels
        .filter((r) => r.planId === plan.id)
        .map((r) => ({ ...r, channelName: channelNameById.get(channelIdByKey.get(rowKeyOf(r)) ?? '') ?? null })),
    [planModels, plan.id, channelNameById, channelIdByKey],
  )

  /** 候选池：全量「模型 × 档位」（仅上架模型），与分销配置页同源 */
  const poolRows: PoolRow[] = useMemo(() => {
    const seen = new Set<string>()
    return buildModelRatePool(models)
      .filter((r) => {
        const key = rowKeyOf(r)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r) => ({
        modelName: r.modelName,
        multiplierName: r.multiplierName,
        modelMultiplier: r.modelMultiplier,
        channelName: channelNameOf(r),
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, channelNameById, channelIdByKey])

  /** 尚未配置的候选行：添加弹窗只展示这些 */
  const availableRows = useMemo(() => {
    const configured = new Set(rows.map(rowKeyOf))
    return poolRows.filter((r) => !configured.has(rowKeyOf(r)))
  }, [poolRows, rows])

  const channelOptions = useMemo(
    () => channels.map((c) => ({ value: c.name, label: c.name })),
    [channels],
  )

  /** 倍率选项：取当前配置行里实际出现的倍率值，升序排列 */
  const multiplierOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => row.multiplier))]
        .sort((a, b) => a - b)
        .map((m) => ({ value: m, label: `${m}` })),
    [rows],
  )

  const handleSearch = () => {
    setQuery({ name: nameKw.trim(), channel: channelKw, multiplier: multiplierKw })
    setPage(1)
  }
  const handleReset = () => {
    setNameKw('')
    setChannelKw(undefined)
    setMultiplierKw(undefined)
    setQuery({ name: '' })
    setPage(1)
  }

  const filtered = useMemo(() => {
    const kw = query.name.toLowerCase()
    return rows.filter((row) => {
      const matchName = !kw || row.modelName.toLowerCase().includes(kw)
      const matchChannel = !query.channel || row.channelName === query.channel
      const matchMultiplier = query.multiplier === undefined || row.multiplier === query.multiplier
      return matchName && matchChannel && matchMultiplier
    })
  }, [rows, query])

  /** 主列表勾选行（rowKey -> id 由 rows 反查），用于批量删除 */
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])

  useEffect(() => setPage(1), [plan.id])
  useEffect(() => setSelectedKeys([]), [plan.id])

  const handleBatchDelete = () => {
    const keys = new Set(selectedKeys.map((k) => String(k)))
    const ids = rows.filter((r) => keys.has(rowKeyOf(r))).map((r) => r.id)
    ids.forEach((id) => removePlanModel(id))
    setSelectedKeys([])
    message.success(`已删除 ${ids.length} 个模型`)
  }

  /** 模型名称相同的相邻行合并成一格：按当前页计算，避免跨页串行 */
  const rowSpanByKey = useMemo(() => {
    const start = (page - 1) * pageSize
    const pageRows = filtered.slice(start, start + pageSize)
    const map = new Map<string, number>()
    let i = 0
    while (i < pageRows.length) {
      let j = i
      while (j < pageRows.length && pageRows[j].modelName === pageRows[i].modelName) j += 1
      map.set(rowKeyOf(pageRows[i]), j - i)
      for (let k = i + 1; k < j; k += 1) map.set(rowKeyOf(pageRows[k]), 0)
      i = j
    }
    return map
  }, [filtered, page, pageSize])

  const columns: ColumnsType<ConfigRow> = [
    {
      title: '模型名称',
      dataIndex: 'modelName',
      fixed: 'left',
      width: 220,
      ellipsis: { showTitle: false },
      onCell: (row) => ({ rowSpan: rowSpanByKey.get(rowKeyOf(row)) ?? 1 }),
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: '渠道',
      key: 'channel',
      width: 160,
      render: (_, row) => row.channelName || <Text type="secondary">—</Text>,
    },
    {
      title: '倍率',
      dataIndex: 'multiplier',
      width: 100,
      render: (v: number) => `${v}x`,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, row) => (
        <Popconfirm
          title="确认删除吗？"
          description="删除后该模型倍率不再属于本套餐"
          okText="删除"
          cancelText="取消"
          onConfirm={() => {
            removePlanModel(row.id)
            message.success('已删除')
          }}
        >
          <Button type="link" size="small" style={{ padding: 0 }} danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  /** ================= 添加模型弹窗 ================= */
  const [addOpen, setAddOpen] = useState(false)
  const [addNameKw, setAddNameKw] = useState('')
  const [addChannelKw, setAddChannelKw] = useState<string | undefined>(undefined)
  const [addMultiplierKw, setAddMultiplierKw] = useState<number | undefined>(undefined)
  const [addQuery, setAddQuery] = useState<{ name: string; channel?: string; multiplier?: number }>({ name: '' })
  const [addSelected, setAddSelected] = useState<Key[]>([])
  const [addPage, setAddPage] = useState(1)
  const [addPageSize, setAddPageSize] = useState(10)

  const openAdd = () => {
    setAddNameKw('')
    setAddChannelKw(undefined)
    setAddMultiplierKw(undefined)
    setAddQuery({ name: '' })
    setAddSelected([])
    setAddPage(1)
    setAddOpen(true)
  }

  const addMultiplierOptions = useMemo(
    () =>
      [...new Set(availableRows.map((r) => r.modelMultiplier ?? 1))]
        .sort((a, b) => a - b)
        .map((m) => ({ value: m, label: `${m}` })),
    [availableRows],
  )

  const handleAddSearch = () => {
    setAddQuery({ name: addNameKw.trim(), channel: addChannelKw, multiplier: addMultiplierKw })
    setAddPage(1)
  }
  const handleAddReset = () => {
    setAddNameKw('')
    setAddChannelKw(undefined)
    setAddMultiplierKw(undefined)
    setAddQuery({ name: '' })
    setAddPage(1)
  }

  const filteredAvailable = useMemo(() => {
    const kw = addQuery.name.toLowerCase()
    return availableRows.filter((row) => {
      const matchName = !kw || row.modelName.toLowerCase().includes(kw)
      const matchChannel = !addQuery.channel || row.channelName === addQuery.channel
      const matchMultiplier = addQuery.multiplier === undefined || (row.modelMultiplier ?? 1) === addQuery.multiplier
      return matchName && matchChannel && matchMultiplier
    })
  }, [availableRows, addQuery])

  /** 弹窗内同模型名称相邻行合并：按当前页计算 */
  const addRowSpanByKey = useMemo(() => {
    const start = (addPage - 1) * addPageSize
    const pageRows = filteredAvailable.slice(start, start + addPageSize)
    const map = new Map<string, number>()
    let i = 0
    while (i < pageRows.length) {
      let j = i
      while (j < pageRows.length && pageRows[j].modelName === pageRows[i].modelName) j += 1
      map.set(rowKeyOf(pageRows[i]), j - i)
      for (let k = i + 1; k < j; k += 1) map.set(rowKeyOf(pageRows[k]), 0)
      i = j
    }
    return map
  }, [filteredAvailable, addPage, addPageSize])

  const confirmAdd = () => {
    if (addSelected.length === 0) {
      message.error('请选择模型倍率')
      return
    }
    const keys = new Set(addSelected.map((k) => String(k)))
    const added = availableRows
      .filter((r) => keys.has(rowKeyOf(r)))
      .map((r) => ({
        modelName: r.modelName,
        multiplierName: r.multiplierName,
        multiplier: r.modelMultiplier ?? 1,
        visible: true,
      }))
    addPlanModels(plan.id, added)
    message.success(`已添加 ${added.length} 个模型`)
    setAddOpen(false)
  }

  const addColumns: ColumnsType<PoolRow> = [
    {
      title: '模型名称',
      dataIndex: 'modelName',
      ellipsis: { showTitle: false },
      onCell: (row) => ({ rowSpan: addRowSpanByKey.get(rowKeyOf(row)) ?? 1 }),
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: '渠道',
      key: 'channel',
      width: 150,
      render: (_, row) => row.channelName || <Text type="secondary">—</Text>,
    },
    {
      title: '倍率',
      dataIndex: 'modelMultiplier',
      width: 90,
      render: (v: number | undefined) => `${v ?? 1}x`,
    },
  ]

  return (
    <>
      <PageShell
        breadcrumb={['Token Plan', '套餐管理', '配置模型']}
        breadcrumbPre={
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
        }
        searchFields={
          <>
            <SearchField label="模型名称">
              <Input
                placeholder="请输入模型名称"
                allowClear
                style={{ width: 220 }}
                value={nameKw}
                onChange={(e) => setNameKw(e.target.value)}
                onPressEnter={handleSearch}
              />
            </SearchField>
            <SearchField label="渠道">
              <Select
                placeholder="请选择渠道"
                allowClear
                style={{ width: 180 }}
                value={channelKw}
                onChange={setChannelKw}
                options={channelOptions}
              />
            </SearchField>
            <SearchField label="倍率">
              <Select
                placeholder="请选择倍率"
                allowClear
                style={{ width: 140 }}
                value={multiplierKw}
                onChange={setMultiplierKw}
                options={multiplierOptions}
              />
            </SearchField>
          </>
        }
        onSearch={handleSearch}
        onReset={handleReset}
        listTitle={`已配置模型 ${rows.length} 个`}
        total={filtered.length}
        hideTotal
        titleExtra={
          <RequirementDot
            title="配置模型 — 需求点"
            sections={[
              {
                label: '',
                items: [
                  '1. 列表：展示本套餐已配置的模型倍率，列为模型名称（同名合并单元格）、渠道、倍率、操作；每页 10 条，可切换。',
                  '2. 搜索：模型名称模糊搜索；渠道、倍率下拉筛选。',
                  '3. 操作列点击「删除」：二次确认后，该模型倍率不再属于本套餐。',
                  '4. 勾选多行后点击「批量删除」：按钮置灰直至有勾选，二次确认后移除所选模型倍率。',
                  '5. 点击「添加模型」：打开添加模型弹窗，从未配置的模型池中选择。',
                ],
              },
            ]}
          />
        }
        listActions={
          <Space size={8}>
            <Popconfirm
              title="确认批量删除吗？"
              description="删除后所选模型倍率不再属于本套餐"
              okText="删除"
              cancelText="取消"
              onConfirm={handleBatchDelete}
            >
              <Button danger disabled={selectedKeys.length === 0}>
                批量删除
              </Button>
            </Popconfirm>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              添加模型
            </Button>
          </Space>
        }
      >
        <Table<ConfigRow>
          rowKey={rowKeyOf}
          size="middle"
          columns={columns}
          dataSource={filtered}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys),
          }}
          locale={{ emptyText: '暂未配置模型，点击右上角「添加模型」开始配置' }}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </PageShell>

      <Modal
        centered
        destroyOnClose
        width={720}
        title={
          <Space size={6} align="center">
            添加模型
            <RequirementDot
              title="添加模型弹窗 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1. 展示未被本套餐配置的可选模型池：模型名称（同名合并单元格）、渠道、倍率，多选。',
                    '2. 搜索：模型名称模糊搜索；渠道、倍率下拉筛选；支持重置。',
                    '3. 点击「确认添加」：未勾选提示「请选择模型倍率」；验证通过加入套餐，提示已添加数量，弹窗关闭、列表刷新。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={addOpen}
        okText="确认添加"
        cancelText="取消"
        onOk={confirmAdd}
        onCancel={() => setAddOpen(false)}
      >
        <Space wrap size={8} style={{ marginBottom: 12 }}>
          <Input
            placeholder="请输入模型名称"
            allowClear
            style={{ width: 180 }}
            value={addNameKw}
            onChange={(e) => setAddNameKw(e.target.value)}
            onPressEnter={handleAddSearch}
          />
          <Select
            placeholder="请选择渠道"
            allowClear
            style={{ width: 150 }}
            value={addChannelKw}
            onChange={setAddChannelKw}
            options={channelOptions}
          />
          <Select
            placeholder="请选择倍率"
            allowClear
            style={{ width: 120 }}
            value={addMultiplierKw}
            onChange={setAddMultiplierKw}
            options={addMultiplierOptions}
          />
          <Button type="primary" onClick={handleAddSearch}>
            搜索
          </Button>
          <Button onClick={handleAddReset}>重置</Button>
        </Space>
        <Table<PoolRow>
          rowKey={rowKeyOf}
          size="small"
          columns={addColumns}
          dataSource={filteredAvailable}
          rowSelection={{
            selectedRowKeys: addSelected,
            onChange: (keys) => setAddSelected(keys),
          }}
          scroll={{ x: 'max-content', y: 300 }}
          pagination={{
            current: addPage,
            pageSize: addPageSize,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
            onChange: (p, ps) => {
              setAddPage(p)
              setAddPageSize(ps)
            },
          }}
        />
      </Modal>
    </>
  )
}
