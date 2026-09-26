import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Cascader, Empty, Input, Modal, Select, Space, Tree, Typography, theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import SearchField from './SearchField'
import { useChannels, useModels } from '../store'
import type { ModelApiConfig, ModelItem } from '../types'

const { Text } = Typography

/** 候选行：一行一个倍率；无任何倍率的模型单独占一行（config 为 null，勾选即按模型加入） */
export type PickerRow = { key: string; model: ModelItem; config: ModelApiConfig | null }

interface ModelFilter {
  vendor: string
  apiPath: string[]
  name: string
}
const emptyModelFilter: ModelFilter = { vendor: 'all', apiPath: [], name: '' }
/** 级联第二级的「全部」选项：等价于只选到渠道一级，即该渠道下所有 API 名称 */
const API_ALL = 'all'
/** 树形父节点（模型）的 key 前缀：真实勾选口径仍是倍率行 key，故父节点 key 需在 onCheck 时剔除 */
const GROUP_PREFIX = 'grp:'

/** 全量候选行：把每个模型的每条倍率配置展开为独立一行 */
export const pickerRowsFromModels = (models: ModelItem[]): PickerRow[] =>
  models.flatMap((model): PickerRow[] => {
    const list = model.apiConfigs ?? []
    return list.length ? list.map((cfg) => ({ key: cfg.id, model, config: cfg })) : [{ key: model.id, model, config: null }]
  })

/** 勾选的倍率行 key → 去重后的模型名称列表（供以「模型名称」存储口径的调用方使用，如券模板适用模型） */
export const modelNamesFromKeys = (keys: string[], models: ModelItem[]): string[] => {
  const wanted = new Set(keys)
  const names: string[] = []
  for (const row of pickerRowsFromModels(models)) {
    if (wanted.has(row.key) && !names.includes(row.model.name)) names.push(row.model.name)
  }
  return names
}

/** 模型名称列表 → 回填勾选：命中模型展开为其全部倍率行 key，无倍率模型以模型 ID 占位 */
export const configKeysFromModelNames = (names: string[], models: ModelItem[]): string[] => {
  const wanted = new Set(names)
  const keys: string[] = []
  for (const model of models) {
    if (!wanted.has(model.name)) continue
    const list = model.apiConfigs ?? []
    if (list.length) keys.push(...list.map((cfg) => cfg.id))
    else keys.push(model.id)
  }
  return keys
}

interface ModelPickerModalProps {
  open: boolean
  title: ReactNode
  /** 打开时回填的勾选（倍率行 key 口径），每次 open 由 false 变 true 时读取一次 */
  initialSelected: string[]
  onOk: (keys: string[]) => void
  onCancel: () => void
}

/** 树节点：父节点是一个模型（或无倍率的模型自身即叶子），子节点是该模型的一条倍率 */
interface PickerTreeNode {
  key: string
  title: ReactNode
  children?: PickerTreeNode[]
}

/**
 * 「选择模型」弹窗（树形）：生产商 / 渠道·API名称 / 模型名称筛选 + 模型-倍率二级复选树。
 * 树的第一级是模型（生产商展示在模型名称前），第二级是该模型的各条倍率（含所属渠道与 API 名称）；
 * 勾选父节点等于全选其下倍率。对外勾选口径仍是「某个模型的某个倍率」，key 为倍率配置 ID
 * （无倍率模型为模型 ID），与 modelNamesFromKeys / configKeysFromModelNames 的名称口径互转。
 */
export default function ModelPickerModal({ open, title, initialSelected, onOk, onCancel }: ModelPickerModalProps) {
  const { models } = useModels()
  const { channels } = useChannels()
  const { token } = theme.useToken()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [modelFilter, setModelFilter] = useState<ModelFilter>(emptyModelFilter)
  const [appliedModelFilter, setAppliedModelFilter] = useState<ModelFilter>(emptyModelFilter)
  /** null 表示未手动干预展开态：有筛选条件时自动展开全部命中模型，无筛选时默认收起 */
  const [expandedKeys, setExpandedKeys] = useState<string[] | null>(null)

  const initialRef = useRef(initialSelected)
  initialRef.current = initialSelected
  useEffect(() => {
    if (open) {
      setSelectedIds(initialRef.current)
      setModelFilter(emptyModelFilter)
      setAppliedModelFilter(emptyModelFilter)
      setExpandedKeys(null)
    }
  }, [open])

  const channelMap = useMemo(() => new Map(channels.map((channel) => [channel.id, channel])), [channels])
  const channelNameOf = (channelId: string) => channelMap.get(channelId)?.name ?? '—'
  const apiNameOf = (cfg: ModelApiConfig) =>
    channelMap.get(cfg.channelId)?.apiCredentials?.find((cred) => cred.id === cfg.credentialId)?.apiName ?? '—'

  const vendorOptions = useMemo(() => {
    const set = Array.from(new Set(models.map((m) => m.vendor).filter(Boolean)))
    return [{ value: 'all', label: '全部' }, ...set.map((v) => ({ value: v, label: v }))]
  }, [models])

  const apiPathOptions = useMemo(
    () =>
      channels.map((channel) => ({
        value: channel.id,
        label: channel.name,
        children: channel.apiCredentials?.length
          ? [
              { value: API_ALL, label: '全部' },
              ...channel.apiCredentials.map((cred) => ({ value: cred.id, label: cred.apiName })),
            ]
          : undefined,
      })),
    [channels],
  )

  const pickerRows = useMemo(() => pickerRowsFromModels(models), [models])

  /** 筛选后的候选行：渠道 / API 名称按当前行的倍率配置匹配，无倍率的模型行在按渠道筛选时自然被过滤掉 */
  const filteredRows = useMemo(() => {
    const f = appliedModelFilter
    const kw = f.name.trim().toLowerCase()
    const channelId = f.apiPath[0]
    const credentialId = f.apiPath[1] === API_ALL ? undefined : f.apiPath[1]
    return pickerRows.filter((row) => {
      const matchVendor = f.vendor === 'all' || row.model.vendor === f.vendor
      const matchName = !kw || row.model.name.toLowerCase().includes(kw)
      const matchApi =
        !channelId ||
        (!!row.config &&
          (credentialId
            ? row.config.channelId === channelId && row.config.credentialId === credentialId
            : row.config.channelId === channelId))
      return matchVendor && matchApi && matchName
    })
  }, [pickerRows, appliedModelFilter])

  const filtering =
    appliedModelFilter.vendor !== 'all' || appliedModelFilter.apiPath.length > 0 || !!appliedModelFilter.name.trim()

  /** 节点标题统一用不换行的 flex 行，避免长文本折行导致复选框与展开箭头错位 */
  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
  }
  const pillStyle: CSSProperties = {
    ...rowStyle,
    padding: '1px 8px',
    borderRadius: token.borderRadiusSM,
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    fontSize: 12,
  }
  const vendorStyle: CSSProperties = {
    ...rowStyle,
    padding: '1px 8px',
    borderRadius: token.borderRadiusSM,
    background: token.colorFillTertiary,
    color: token.colorTextSecondary,
    fontSize: 12,
  }

  /** 模型节点标题：只保留「生产厂商 + 模型名称」，倍率数由展开后的子节点直接呈现 */
  const modelTitle = (model: ModelItem) => (
    <div style={rowStyle}>
      {model.vendor ? <span style={vendorStyle}>{model.vendor}</span> : null}
      <Text strong style={{ whiteSpace: 'nowrap' }}>
        {model.name}
      </Text>
    </div>
  )

  /** 倍率节点标题：倍率名称 + 倍率药丸，后接所属渠道与 API 名称 */
  const configTitle = (cfg: ModelApiConfig) => (
    <div style={rowStyle}>
      <span style={pillStyle}>
        {cfg.multiplierName || '—'} · {cfg.modelMultiplier ?? 1}x
      </span>
      <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
        {`${channelNameOf(cfg.channelId)} / ${apiNameOf(cfg)}`}
      </Text>
    </div>
  )

  /** 按模型聚合筛选行，生成二级树；同一模型的行连续出现，故用 Map 保持模型原始顺序 */
  const treeData = useMemo<PickerTreeNode[]>(() => {
    const groups = new Map<string, PickerRow[]>()
    for (const row of filteredRows) {
      const list = groups.get(row.model.id)
      if (list) list.push(row)
      else groups.set(row.model.id, [row])
    }
    return Array.from(groups.values()).map((rows) => {
      const withConfig = rows.filter((row): row is PickerRow & { config: ModelApiConfig } => !!row.config)
      if (!withConfig.length) return { key: rows[0].model.id, title: modelTitle(rows[0].model) }
      return {
        key: `${GROUP_PREFIX}${rows[0].model.id}`,
        title: modelTitle(rows[0].model),
        children: withConfig.map((row) => ({ key: row.key, title: configTitle(row.config) })),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, token])

  const modelNodeKeys = useMemo(() => treeData.map((node) => node.key), [treeData])
  const visibleLeafKeys = useMemo(() => new Set(filteredRows.map((row) => row.key)), [filteredRows])
  const rowKeyOrder = useMemo(() => pickerRows.map((row) => row.key), [pickerRows])

  /** 勾选回调：剔除模型父节点 key；被筛掉的已选倍率原样保留，最后按全量行序稳定排序 */
  const handleCheck = (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
    const arr = (Array.isArray(checked) ? checked : checked.checked).map(String)
    const visible = arr.filter((key) => !key.startsWith(GROUP_PREFIX))
    const kept = selectedIds.filter((key) => !visibleLeafKeys.has(key))
    const merged = new Set([...kept, ...visible])
    setSelectedIds(rowKeyOrder.filter((key) => merged.has(key)))
  }

  const effectiveExpanded = expandedKeys ?? (filtering ? modelNodeKeys : [])

  return (
    <Modal
      title={title}
      open={open}
      centered
      width={900}
      okText="保存"
      cancelText="取消"
      destroyOnClose
      onCancel={onCancel}
      onOk={() => onOk(selectedIds)}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <SearchField label="生产商">
          <Select
            value={modelFilter.vendor}
            style={{ width: 140 }}
            options={vendorOptions}
            onChange={(v) => setModelFilter({ ...modelFilter, vendor: v })}
          />
        </SearchField>
        <SearchField label="渠道/API名称">
          <Cascader
            value={modelFilter.apiPath}
            options={apiPathOptions}
            changeOnSelect
            allowClear
            showSearch
            placeholder="全部"
            style={{ width: 260 }}
            onChange={(value) => setModelFilter({ ...modelFilter, apiPath: (value ?? []).map(String) })}
          />
        </SearchField>
        <SearchField label="模型名称">
          <Input
            value={modelFilter.name}
            allowClear
            placeholder="请输入模型名称"
            style={{ width: 160 }}
            onChange={(e) => setModelFilter({ ...modelFilter, name: e.target.value })}
            onPressEnter={() => {
              setAppliedModelFilter(modelFilter)
              setExpandedKeys(null)
            }}
          />
        </SearchField>
        <Space>
          <Button
            type="primary"
            onClick={() => {
              setAppliedModelFilter(modelFilter)
              setExpandedKeys(null)
            }}
          >
            搜索
          </Button>
          <Button
            onClick={() => {
              setModelFilter(emptyModelFilter)
              setAppliedModelFilter(emptyModelFilter)
              setExpandedKeys(null)
            }}
          >
            重置
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text type="secondary">
          {`已选择 ${selectedIds.length} 条倍率 · 共 ${treeData.length} 个模型 / ${filteredRows.length} 条倍率`}
        </Text>
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setExpandedKeys(modelNodeKeys)}>
            展开全部
          </Button>
          <Button type="link" size="small" onClick={() => setExpandedKeys([])}>
            收起全部
          </Button>
        </Space>
      </div>

      {filteredRows.length ? (
        <div
          style={{
            maxHeight: 420,
            overflowY: 'auto',
            overflowX: 'auto',
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            padding: '8px 12px',
          }}
        >
          <Tree
            checkable
            blockNode
            selectable={false}
            treeData={treeData}
            checkedKeys={selectedIds}
            onCheck={handleCheck}
            expandedKeys={effectiveExpanded}
            onExpand={(keys) => setExpandedKeys(keys.map(String))}
          />
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配模型" style={{ margin: '32px 0' }} />
      )}
    </Modal>
  )
}
