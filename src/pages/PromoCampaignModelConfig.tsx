import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import SearchField from '../components/SearchField'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import { buildModelRatePool, PROMO_ROW_KEY, setPromoCampaignModels, useChannels, useModels } from '../store'
import { PROMO_CAMPAIGN_SCOPE_LABEL } from '../types'
import type { ModelItem, PromoCampaign, PromoCampaignModel } from '../types'
import { deterministicPrice } from './ModelList'

const { Text } = Typography

const round4 = (v: number) => Math.round(v * 10000) / 10000

/** 价格展示：按计价方式单位拼接，如 ¥ 20 /Mt、¥ 0.4 /张、¥ 0.024 /积分 */
const fmtPrice = (v: number, unit: string) =>
  unit === 'Mt'
    ? `¥ ${Number((v * 1000).toFixed(4))} /Mt`
    : `¥ ${Number(v.toFixed(4))} /${unit}`

/** 加倍后比例：开启加倍时默认 = 原有比例 +10%，支持手动改小/改大（最小为原有比例 +1） */
const boostRateOf = (row: PromoCampaignModel) => row.boostRate ?? row.rate + 10

/** 生效返佣比例：加倍开启时取加倍后比例（默认原有比例 +10%，可手改） */
const effectiveRate = (row: PromoCampaignModel) => (row.boost ? boostRateOf(row) : row.rate)

/** 价格对比明细行：价格类型 + 成本价 + 返佣后价格（= 对外售价 ×（1 − 生效比例）） */
interface PriceCompareLine {
  key: string
  label: string
  cost: number
  after: number
  /** 计价单位：Mt（元/千Token）/ 张 / 积分 */
  unit: string
}

/** 价格对比单位：随计价方式变化 */
const priceUnitOf = (model: ModelItem): string =>
  model.pricingMode === 'image_quality' ? '张' : model.pricingMode === 'video_quality_token' ? '积分' : 'Mt'

const round4Of = (v: number) => Math.round(v * 10000) / 10000

/** 各价格类型的成本单价：按计价方式派生；对外售价统一 = 成本 ×1.4 */
const priceCompareLinesOf = (model: ModelItem, rate: number): PriceCompareLine[] => {
  const unit = priceUnitOf(model)
  const line = (key: string, label: string, cost: number): PriceCompareLine => ({
    key,
    label,
    cost,
    after: round4(round4Of(cost * 1.4) * (1 - rate / 100)),
    unit,
  })
  if (model.pricingMode === 'image_quality') {
    const low = deterministicPrice(model.id + '_img_low', 0.4)
    const high = round4Of(low * 2)
    return [
      line('img720', '图片生成（720P）', low),
      line('img1080', '图片生成（1080P）', low),
      line('img2k', '图片生成（2K）', high),
      line('img3k', '图片生成（3K）', high),
      line('img4k', '图片生成（4K）', high),
    ]
  }
  if (model.pricingMode === 'video_quality_token') {
    const low = deterministicPrice(model.id + '_vid_low', 0.024)
    const high = round4Of(low * 1.042)
    return [
      line('vid360', '视频生成（360P）', low),
      line('vid540', '视频生成（540P）', low),
      line('vid720', '视频生成（720P）', high),
      line('vid1080', '视频生成（1080P）', high),
    ]
  }
  const input = deterministicPrice(model.id + '_cin', 0.0008)
  const output = deterministicPrice(model.id + '_cout', 0.0024)
  const cache = deterministicPrice(model.id + '_cpool', 0.0005)
  return [
    line('input', '输入价格', input),
    line('output', '输出价格', output),
    line('cache', '缓存价格', cache),
    line('cacheCreate5m', '显式缓存创建/5m', 0),
    line('cacheCreate1h', '显式缓存创建/1h', 0),
    line('cacheRead', '显式缓存读取', cache),
  ]
}

/** 档位行唯一键与 store 同源，保证后台配置、官网推广页、控制台列表口径一致 */
const rowKeyOf = PROMO_ROW_KEY

/** 配置行：返佣配置（草稿/已保存）叠加派生的渠道名 */
interface ConfigRow extends PromoCampaignModel {
  /** 该档位所属渠道名；模型未配置 API 或渠道已删除时为 null */
  channelName: string | null
}

export default function PromoCampaignModelConfig({
  campaign,
  onBack,
}: {
  campaign: PromoCampaign
  onBack: () => void
}) {
  const { models } = useModels()
  const { channels } = useChannels()
  const { token } = theme.useToken()

  const [nameKw, setNameKw] = useState('')
  const [channelKw, setChannelKw] = useState<string | undefined>(undefined)
  const [multiplierKw, setMultiplierKw] = useState<number | undefined>(undefined)
  const [query, setQuery] = useState<{ name: string; channel?: string; multiplier?: number }>({ name: '' })

  const [editMode, setEditMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchRate, setBatchRate] = useState<number | null>(null)
  const [rateEdit, setRateEdit] = useState<{ key: string; field: 'rate' | 'boostRate'; enableBoost: boolean } | null>(
    null,
  )
  const [rateEditInput, setRateEditInput] = useState<number | null>(null)
  const [compareRow, setCompareRow] = useState<ConfigRow | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  /** 返佣模型草稿列表：只装「已配置返佣」的模型倍率；增删改都作用在草稿上，点「保存」才写入活动（定义在模型池之后） */

  const channelNameById = useMemo(() => new Map(channels.map((c) => [c.id, c.name])), [channels])

  const modelByName = useMemo(() => new Map(models.map((m) => [m.name, m])), [models])

  /** 模型池全量「模型 × 档位」候选行：与官网推广页、控制台活动列表同源（buildModelRatePool），此处仅叠加渠道名 */
  const poolRows: ConfigRow[] = useMemo(() => {
    const channelIdByKey = new Map<string, string>()
    for (const model of models) {
      const cfgs = model.apiConfigs ?? []
      if (cfgs.length === 0) continue
      for (const cfg of cfgs) {
        const key = rowKeyOf({ modelName: model.name, multiplierName: cfg.multiplierName?.trim() || '标准倍率' })
        if (!channelIdByKey.has(key)) channelIdByKey.set(key, cfg.channelId)
      }
    }
    return buildModelRatePool(models).map((r) => ({
      ...r,
      channelName: channelNameById.get(channelIdByKey.get(rowKeyOf(r)) ?? '') ?? null,
    }))
  }, [models, channelNameById])

  /** 适用范围为全平台模型：列表 = 全量「模型 × 档位」，不支持添加/移除，仅可调整返佣比例 */
  const isAll = campaign.scope === 'all'

  /** 草稿基准行：全平台 = 全量模型池（已保存的回显保存值，未保存的按默认返佣比例初始化）；部分模型 = 活动已配置行 */
  const baseRows = useCallback((): PromoCampaignModel[] => {
    const saved = campaign.models.filter((m) => m.enabled !== false)
    if (!isAll) return saved
    const savedByKey = new Map(saved.map((m) => [rowKeyOf(m), m]))
    return poolRows.map(
      (r) =>
        savedByKey.get(rowKeyOf(r)) ?? {
          modelName: r.modelName,
          category: r.category,
          multiplierName: r.multiplierName,
          modelMultiplier: r.modelMultiplier,
          enabled: true,
          rate: campaign.defaultRate ?? 10,
          boost: false,
        },
    )
  }, [campaign.models, campaign.defaultRate, isAll, poolRows])

  const [draft, setDraft] = useState<PromoCampaignModel[]>(baseRows)
  useEffect(() => {
    setDraft(baseRows())
  }, [campaign.id, baseRows])

  const channelNameByKey = useMemo(
    () => new Map(poolRows.map((r) => [rowKeyOf(r), r.channelName])),
    [poolRows],
  )

  /** 主列表行 = 已配置返佣的模型倍率（草稿），渠道名从模型池派生；已下架的历史配置渠道显示 — */
  const rows: ConfigRow[] = useMemo(
    () =>
      draft.map((m) => ({
        ...m,
        enabled: m.enabled !== false,
        channelName: channelNameByKey.get(rowKeyOf(m)) ?? null,
      })),
    [draft, channelNameByKey],
  )

  /** 尚未配置返佣的候选行：添加弹窗只展示这些，天然区分「已配置 / 未配置」 */
  const availableRows = useMemo(() => {
    const configured = new Set(draft.map(rowKeyOf))
    return poolRows.filter((r) => !configured.has(rowKeyOf(r)))
  }, [poolRows, draft])

  const channelOptions = useMemo(
    () => channels.map((c) => ({ value: c.name, label: c.name })),
    [channels],
  )

  /** 倍率选项：取当前配置行里实际出现的倍率值（1、1.5、2 这种），升序排列 */
  const multiplierOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => row.modelMultiplier ?? 1))]
        .sort((a, b) => a - b)
        .map((m) => ({ value: m, label: `${m}` })),
    [rows],
  )

  const handleSearch = () => setQuery({ name: nameKw.trim(), channel: channelKw, multiplier: multiplierKw })
  const handleReset = () => {
    setNameKw('')
    setChannelKw(undefined)
    setMultiplierKw(undefined)
    setQuery({ name: '' })
  }
  useEffect(() => setPage(1), [campaign.id, query])

  useEffect(() => {
    setEditMode(false)
    setSelectedKeys([])
  }, [campaign.id, query])

  const enterEditMode = () => setEditMode(true)

  const exitEditMode = () => {
    setEditMode(false)
    setSelectedKeys([])
  }

  const handleCancelEdit = () => {
    setDraft(baseRows())
    exitEditMode()
  }

  const filtered = useMemo(() => {
    const kw = query.name.toLowerCase()
    return rows.filter((row) => {
      const matchName = !kw || row.modelName.toLowerCase().includes(kw)
      const matchChannel = !query.channel || row.channelName === query.channel
      const matchMultiplier =
        query.multiplier === undefined || (row.modelMultiplier ?? 1) === query.multiplier
      return matchName && matchChannel && matchMultiplier
    })
  }, [rows, query])

  const patchRow = (key: string, patch: Partial<PromoCampaignModel>) => {
    const next = draft.map((m) => (rowKeyOf(m) === key ? { ...m, ...patch } : m))
    setDraft(next)
    persistDraft(next)
  }

  const removeRow = (key: string) => {
    const next = draft.filter((m) => rowKeyOf(m) !== key)
    setDraft(next)
    setSelectedKeys((prev) => prev.filter((k) => String(k) !== key))
    persistDraft(next)
    message.success('已移除')
  }

  /** 只读态开启加倍：弹窗输入加倍后比例；编辑态则直接内联编辑，不弹窗 */
  const handleBoostChange = (row: ConfigRow, checked: boolean) => {
    const key = rowKeyOf(row)
    if (editMode) {
      patchRow(key, { boost: checked, boostRate: undefined })
      return
    }
    if (!checked) {
      const next = draft.map((m) => (rowKeyOf(m) === key ? { ...m, boost: false, boostRate: undefined } : m))
      setDraft(next)
      persistDraft(next)
      message.success('已取消佣金加倍')
      return
    }
    setRateEdit({ key, field: 'boostRate', enableBoost: true })
    setRateEditInput(boostRateOf(row))
  }

  /** 只读态点击比例旁的编辑图标：弹窗修改返佣比例 / 加倍后比例 */
  const openRateEdit = (row: ConfigRow, field: 'rate' | 'boostRate') => {
    setRateEdit({ key: rowKeyOf(row), field, enableBoost: false })
    setRateEditInput(field === 'rate' ? row.rate : boostRateOf(row))
  }

  const rateEditTarget = useMemo(
    () => (rateEdit ? draft.find((m) => rowKeyOf(m) === rateEdit.key) ?? null : null),
    [rateEdit, draft],
  )

  const closeRateEdit = () => {
    setRateEdit(null)
    setRateEditInput(null)
  }

  const confirmRateEdit = () => {
    if (!rateEdit || !rateEditTarget) return
    const min = rateEdit.field === 'boostRate' ? rateEditTarget.rate + 1 : 0
    const max = rateEdit.field === 'boostRate' ? 100 : 50
    if (rateEditInput === null || rateEditInput < min || rateEditInput > max) {
      message.error(`比例需在 ${min} ~ ${max}% 之间`)
      return
    }
    const patch: Partial<PromoCampaignModel> =
      rateEdit.field === 'rate'
        ? {
            rate: rateEditInput,
            ...(rateEditTarget.boost && boostRateOf(rateEditTarget) <= rateEditInput
              ? { boostRate: rateEditInput + 10 }
              : {}),
          }
        : { boost: true, boostRate: rateEditInput }
    const next = draft.map((m) => (rowKeyOf(m) === rateEdit.key ? { ...m, ...patch } : m))
    setDraft(next)
    persistDraft(next)
    message.success('已保存到页面')
    closeRateEdit()
  }

  const applyBatch = () => {
    if (batchRate === null || batchRate <= 0 || batchRate > 50) {
      message.error('返佣比例需在 0 ~ 50% 之间')
      return
    }
    const keys = new Set(selectedKeys.map((k) => String(k)))
    const next = draft.map((m) => {
      if (!keys.has(rowKeyOf(m))) return m
      const patched: PromoCampaignModel = { ...m, rate: batchRate }
      if (m.boost && boostRateOf(m) <= batchRate) patched.boostRate = batchRate + 10
      return patched
    })
    setDraft(next)
    persistDraft(next)
    message.success(`已批量设置 ${selectedKeys.length} 条模型的返佣比例为 ${batchRate}%`)
    setBatchOpen(false)
    setBatchRate(null)
    setSelectedKeys([])
  }

  const handleBatchRemove = () => {
    const count = selectedKeys.length
    Modal.confirm({
      title: '确认移除吗？',
      content: '将移除所选返佣模型，该模型倍率不再参与本活动返佣',
      okText: '移除',
      cancelText: '取消',
      centered: true,
      onOk: () => {
        const keys = new Set(selectedKeys.map((k) => String(k)))
        const next = draft.filter((m) => !keys.has(rowKeyOf(m)))
        setDraft(next)
        persistDraft(next)
        message.success(`已移除 ${count} 条返佣模型`)
        setSelectedKeys([])
      },
    })
  }

  /** 将指定返佣配置写入 store，返回是否保存成功，供各编辑操作即时落盘复用 */
  const saveRows = (rows: PromoCampaignModel[]): boolean => {
    const payload: PromoCampaignModel[] = rows.map((m) => ({
      ...m,
      enabled: true,
      boostRate: m.boost ? boostRateOf(m) : undefined,
    }))
    const res = setPromoCampaignModels(campaign.id, payload)
    if (!res.ok) {
      message.error(res.msg)
      return false
    }
    return true
  }

  /** 即时保存：加倍、添加、批量等操作直接落盘，不打断当前浏览 */
  const persistDraft = (next: PromoCampaignModel[]) => {
    saveRows(next)
  }

  const handleBack = () => {
    onBack()
  }

  /** ================= 添加返佣模型弹窗 ================= */
  const [addOpen, setAddOpen] = useState(false)
  const [addNameKw, setAddNameKw] = useState('')
  const [addChannelKw, setAddChannelKw] = useState<string | undefined>(undefined)
  const [addMultiplierKw, setAddMultiplierKw] = useState<number | undefined>(undefined)
  const [addQuery, setAddQuery] = useState<{ name: string; channel?: string; multiplier?: number }>({ name: '' })
  const [addSelected, setAddSelected] = useState<Key[]>([])
  const [addRate, setAddRate] = useState<number | null>(10)
  const [addPage, setAddPage] = useState(1)
  const [addPageSize, setAddPageSize] = useState(10)

  const openAdd = () => {
    setAddNameKw('')
    setAddChannelKw(undefined)
    setAddMultiplierKw(undefined)
    setAddQuery({ name: '' })
    setAddSelected([])
    setAddRate(10)
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
      const matchMultiplier =
        addQuery.multiplier === undefined || (row.modelMultiplier ?? 1) === addQuery.multiplier
      return matchName && matchChannel && matchMultiplier
    })
  }, [availableRows, addQuery])

  /** 弹窗内同模型名称相邻行合并：按当前页计算，避免跨页串行 */
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
    if (addRate === null || addRate <= 0 || addRate > 50) {
      message.error('返佣比例需在 0 ~ 50% 之间')
      return
    }
    if (addSelected.length === 0) {
      message.error('请选择模型倍率')
      return
    }
    const keys = new Set(addSelected.map((k) => String(k)))
    const added: PromoCampaignModel[] = availableRows
      .filter((r) => keys.has(rowKeyOf(r)))
      .map((r) => ({
        modelName: r.modelName,
        category: r.category,
        multiplierName: r.multiplierName,
        modelMultiplier: r.modelMultiplier,
        enabled: true,
        rate: addRate,
        boost: false,
        boostRate: undefined,
      }))
    const next = [...draft, ...added]
    setDraft(next)
    persistDraft(next)
    message.success(`已添加 ${added.length} 条返佣模型`)
    setAddOpen(false)
  }

  /** 模型名称相同的相邻行合并成一格：同组首行 rowSpan = 组内行数，其余行为 0（按当前页计算，避免跨页串行） */
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
      width: 200,
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
      width: 150,
      render: (_, row) => row.channelName || <Text type="secondary">—</Text>,
    },
    {
      title: '倍率名称',
      dataIndex: 'multiplierName',
      width: 130,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '倍率',
      dataIndex: 'modelMultiplier',
      width: 90,
      render: (v: number) => `${v ?? 1}x`,
    },
    {
      title: '返佣比例',
      key: 'rate',
      width: 150,
      render: (_, row) =>
        editMode ? (
          <InputNumber
            size="small"
            min={0}
            max={50}
            precision={0}
            value={row.rate}
            addonAfter="%"
            style={{ width: 100 }}
            onChange={(v) => {
              const rate = v ?? 0
              const patch: Partial<PromoCampaignModel> = { rate }
              if (row.boost && boostRateOf(row) <= rate) patch.boostRate = rate + 10
              patchRow(rowKeyOf(row), patch)
            }}
          />
        ) : (
          <Space size={4}>
            {`${row.rate}%`}
            <Tooltip title="修改返佣比例">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                style={{ color: token.colorPrimary }}
                onClick={() => openRateEdit(row, 'rate')}
              />
            </Tooltip>
          </Space>
        ),
    },
    {
      title: '设为佣金加倍',
      key: 'boost',
      width: 120,
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.boost}
          checkedChildren="加倍"
          unCheckedChildren="加倍"
          onChange={(checked) => handleBoostChange(row, checked)}
        />
      ),
    },
    {
      title: '加倍后比例',
      key: 'boostRate',
      width: 130,
      render: (_, row) => {
        if (!row.boost) return <Text type="secondary">—</Text>
        return editMode ? (
          <InputNumber
            size="small"
            min={row.rate + 1}
            max={100}
            precision={0}
            value={boostRateOf(row)}
            addonAfter="%"
            style={{ width: 100 }}
            onChange={(v) => patchRow(rowKeyOf(row), { boostRate: v ?? undefined })}
          />
        ) : (
          <Space size={4}>
            {`${boostRateOf(row)}%`}
            <Tooltip title="修改加倍后比例">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                style={{ color: token.colorPrimary }}
                onClick={() => openRateEdit(row, 'boostRate')}
              />
            </Tooltip>
          </Space>
        )
      },
    },
    {
      title: '价格对比',
      key: 'compare',
      width: 130,
      render: (_, row) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setCompareRow(row)}>
          查看对比
        </Button>
      ),
    },
    ...(editMode && !isAll
      ? [
          {
            title: '操作',
            key: 'action',
            fixed: 'right' as const,
            width: 80,
            render: (_: unknown, row: ConfigRow) => (
              <Popconfirm
                title="确认移除吗？"
                description="移除后该模型倍率不再参与本活动返佣"
                okText="移除"
                cancelText="取消"
                onConfirm={() => removeRow(rowKeyOf(row))}
              >
                <Button type="link" size="small" style={{ padding: 0 }}>
                  移除
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ]

  const addColumns: ColumnsType<ConfigRow> = [
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
      title: '倍率名称',
      dataIndex: 'multiplierName',
      width: 130,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '倍率',
      dataIndex: 'modelMultiplier',
      width: 90,
      render: (v: number) => `${v ?? 1}x`,
    },
  ]

  return (
    <>
      <PageShell
        breadcrumb={['分销管理', '分销活动', '配置返佣模型']}
        breadcrumbPre={
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回
          </Button>
        }
        breadcrumbExtra={
          <RequirementDot
            title="配置返佣模型 · 需求说明"
            sections={[
              {
                label: '如配置全平台模型',
                items: [
                  '1.则页面展示为动态信息；展示当前上架的所有模型及倍率信息；按照上架时间倒序展示；',
                  '2.展示默认的返佣比例。',
                  '3.不支持添加模型；',
                  '4.不支持移除模型；',
                ],
              },
              {
                label: '如配置为部分模型',
                items: [
                  '1.未配置时展示缺省“请在右上角添加返佣模型”；',
                  '2.支持移除已添加的模型；',
                  '3.点击添加返佣模型，展示平台目前上架的模型及倍率，支持按照名称模糊搜索，支持按照渠道和倍率搜索；已被添加的应该不展示或者标记为已选择也可以。\n下方为已选择的模型设置统一的返佣比例，默认10%。\n点击确认添加时，必须选择至少1个模型倍率和填写比例。比例仅支持整数。确认后将选择的模型倍率添加到配置返佣模型列表中。',
                ],
              },
              {
                label: '统一逻辑',
                items: [
                  '1.列表支持搜索；',
                  '2.支持修改佣金，佣金比例应为整数，0～100；',
                  '3.如设置佣金加倍，则加倍佣金应大于原始佣金；（如4.设置佣金加倍，则实际返佣比例应为加倍后的比例）',
                  '5.点击价格对比，展示渠道模型成本价格和返佣后价格（售价x （1-返佣比例）），如返佣后价格低于成本，需要标红。',
                  '6.支持批量设置，批量设置比例后，将所有佣金设置为新比例，此时可能会产生加倍<正常比例的情况，则关闭加倍佣金；',
                  '7.全平台适用的模型配置，不支持批量移除。',
                  '8.批量编辑无保存按钮，所有编辑操作即时生效，完成后点击「完成」退出编辑态。',
                ],
              },
            ]}
          />
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
        listTitle={`已配置返佣模型 ${draft.length} 个`}
        total={filtered.length}
        hideTotal
        titleExtra={
          <Tag color={isAll ? 'blue' : 'default'} style={{ marginInlineStart: 4, flexShrink: 0 }}>
            {PROMO_CAMPAIGN_SCOPE_LABEL[campaign.scope ?? 'partial']}
            {isAll && campaign.defaultRate ? `（默认 ${campaign.defaultRate}%）` : ''}
          </Tag>
        }
        listActions={
          <Space size={8}>
            {editMode ? (
              <>
                <Button disabled={selectedKeys.length === 0} onClick={() => setBatchOpen(true)}>
                  批量设置返佣比例
                </Button>
                {!isAll && (
                  <Button danger disabled={selectedKeys.length === 0} onClick={handleBatchRemove}>
                    批量移除
                  </Button>
                )}
                <Button onClick={handleCancelEdit}>完成</Button>
              </>
            ) : (
              <>
                {draft.length > 0 ? <Button onClick={enterEditMode}>批量编辑</Button> : null}
                {!isAll && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    添加返佣模型
                  </Button>
                )}
              </>
            )}
          </Space>
        }
      >
        <Table
          rowKey={rowKeyOf}
          size="middle"
          columns={columns}
          dataSource={filtered}
          locale={{ emptyText: '暂未配置返佣模型，点击右上角「添加返佣模型」开始配置' }}
          rowSelection={
            editMode
              ? {
                  selectedRowKeys: selectedKeys,
                  onChange: (keys) => setSelectedKeys(keys),
                }
              : undefined
          }
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
        title="添加返佣模型"
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
        <Table<ConfigRow>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <Text>返佣比例</Text>
          <InputNumber
            min={0}
            max={50}
            precision={0}
            addonAfter="%"
            style={{ width: 120 }}
            value={addRate}
            onChange={setAddRate}
          />
          <Text type="secondary">所选模型倍率将按以上返佣设置添加</Text>
        </div>
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={520}
        title="批量设置返佣比例"
        open={batchOpen}
        okText="保存"
        cancelText="取消"
        onOk={applyBatch}
        onCancel={() => {
          setBatchOpen(false)
          setBatchRate(null)
        }}
      >
        <Text type="secondary">所选模型倍率，将统一设置为同一个返佣比例。</Text>
        <div style={{ marginTop: 16 }}>
          <Text>返佣比例</Text>
          <InputNumber
            min={0}
            max={50}
            precision={0}
            placeholder="0 ~ 50"
            addonAfter="%"
            style={{ width: 160, marginLeft: 8 }}
            value={batchRate}
            onChange={setBatchRate}
          />
        </div>
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={520}
        title={
          rateEdit
            ? rateEdit.field === 'rate'
              ? '修改返佣比例'
              : rateEdit.enableBoost
                ? '设为佣金加倍'
                : '修改加倍后比例'
            : ''
        }
        open={!!rateEdit}
        okText="保存"
        cancelText="取消"
        onOk={confirmRateEdit}
        onCancel={closeRateEdit}
      >
        <div>
          <Text>{rateEdit?.field === 'boostRate' ? '加倍后比例' : '返佣比例'}</Text>
          <InputNumber
            min={rateEdit?.field === 'boostRate' ? (rateEditTarget?.rate ?? 0) + 1 : 0}
            max={rateEdit?.field === 'boostRate' ? 100 : 50}
            precision={0}
            addonAfter="%"
            style={{ width: 160, marginLeft: 8 }}
            value={rateEditInput}
            onChange={setRateEditInput}
          />
        </div>
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={960}
        title="价格对比"
        open={!!compareRow}
        footer={<Button onClick={() => setCompareRow(null)}>关闭</Button>}
        onCancel={() => setCompareRow(null)}
      >
        {compareRow
          ? (() => {
              const model = modelByName.get(compareRow.modelName)
              const rate = effectiveRate(compareRow)
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      {compareRow.modelName}
                    </Text>
                    <Text type="secondary">
                      {compareRow.multiplierName} · {compareRow.modelMultiplier ?? 1}x
                    </Text>
                  </div>
                  {model ? (
                    (() => {
                      const lines = priceCompareLinesOf(model, rate)
                      const unit = lines[0]?.unit ?? 'Mt'
                      return (
                        <>
                          <Table<PriceCompareLine>
                            rowKey="key"
                            size="small"
                            pagination={false}
                            dataSource={lines}
                            columns={[
                              {
                                title: '',
                                dataIndex: 'label',
                                key: 'label',
                              },
                              {
                                title: '成本价',
                                key: 'cost',
                                align: 'center',
                                render: (_, line) => (
                                  <span style={{ color: token.colorPrimary }}>
                                    {fmtPrice(line.cost, line.unit)}
                                  </span>
                                ),
                              },
                              {
                                title: '返佣后价格',
                                key: 'after',
                                align: 'center',
                                render: (_, line) => (
                                  <span
                                    style={{
                                      color:
                                        line.after < line.cost ? token.colorError : token.colorPrimary,
                                    }}
                                  >
                                    {fmtPrice(line.after, line.unit)}
                                  </span>
                                ),
                              },
                            ]}
                          />
                          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                            单位：元 / {unit}
                          </Text>
                        </>
                      )
                    })()
                  ) : (
                    <Text type="secondary">模型已删除，暂无价格数据</Text>
                  )}
                </>
              )
            })()
          : null}
      </Modal>
    </>
  )
}
