import { useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
  Typography,
} from 'antd'
import {
  CopyOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { maskSecret } from '../components/SecretCell'
import { SHOW_ENTERPRISE } from '../constants'

const { Text } = Typography

const PRIMARY = '#2f6bff'

/** ====== 通用工具 ====== */
/** API Key 脱敏：统一复用 SecretCell 的规则（首 4 位 + **** + 尾 4 位） */
function maskKey(key: string): string {
  if (!key) return '—'
  return maskSecret(key)
}

function genRandomKey(name: string): string {
  const rand = Array.from({ length: 16 }, () =>
    Math.random().toString(36).slice(2, 6)
  ).join('')
  const suffix = name.replace(/\s+/g, '').slice(0, 4) || 'APIK'
  return `sk-${suffix.toLowerCase()}.${rand.slice(0, 22)}-${rand.slice(-6)}`
}

/** ====== API Key 相关类型 & 初始数据 ====== */
type ApiKeyItem = {
  id: string
  name: string
  key: string
  permanent: boolean
  expireAt?: string // YYYY-MM-DD；permanent=false 时必填
  createdAt: string // YYYY-MM-DD HH:mm:ss
}

const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: 'k1',
    name: 'test',
    key: 'sk-sp-H.DIELMH.XYZ123-BrJQQJb3PWIIIA',
    permanent: true,
    createdAt: '2026-08-23 15:39:58',
  },
]

const MAX_API_KEYS = 10

const API_KEYS_STORAGE_KEY = 'zsdd_api_keys_v1'

function loadApiKeys(): ApiKeyItem[] {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ApiKeyItem[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // 解析失败时回退到初始数据
  }
  return INITIAL_API_KEYS
}

function persistApiKeys(list: ApiKeyItem[]) {
  try {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 存储写入失败不影响交互
  }
}

/** ====== 模拟数据 ====== */
const MONTHLY_TOTAL: number = 12_000_000
const WEEKLY_LIMIT: number = 5_000
const WEEKLY_USED: number = 2_000
const WEEKLY_USAGE_PERCENT = Math.round((WEEKLY_USED / WEEKLY_LIMIT) * 100)

const PLAN_INFO = {
  name: 'Lite 套餐',
  status: '生效中',
  remainingDays: 31,
  startAt: '2026-08-23 13:55:43',
  endAt: '2026-09-24 00:00:00',
}

export type ModelRow = {
  brand: string
  model: string
  capability: string
  nightDiscount?: boolean
}

export const MODEL_DATA: ModelRow[] = [
  { brand: '千问', model: 'qwen3.8-max', capability: '文本生成、推理模型、视觉理解', nightDiscount: true },
  { brand: '千问', model: 'qwen3.7-plus', capability: '文本生成、推理模型、视觉理解' },
  { brand: '千问', model: 'qwen3.7-max', capability: '文本生成、推理模型' },
  { brand: '千问', model: 'qwen3.6-flash', capability: '文本生成、推理模型、视觉理解' },
  { brand: '千问', model: 'qwen-image-3.0-pro', capability: '图片生成' },
  { brand: '千问', model: 'qwen-audio-3.0-asr-flash', capability: '语音识别' },
  { brand: '千问', model: 'qwen-audio-3.0-tts-plus', capability: '实时语音合成、语音合成' },
  { brand: '千问', model: 'qwen-audio-3.0-realtime-plus', capability: '实时语音对话' },
  { brand: '万相', model: 'wan2.7-image', capability: '图片生成' },
  { brand: '万相', model: 'wan2.7-image-pro', capability: '图片生成' },
  { brand: 'HappyHorse', model: 'happyhorse-1.1-i2v', capability: '视频生成' },
  { brand: 'HappyHorse', model: 'happyhorse-1.1-t2v', capability: '视频生成' },
  { brand: 'HappyHorse', model: 'happyhorse-1.1-r2v', capability: '视频生成' },
  { brand: 'DeepSeek', model: 'deepseek-v4-pro-0813', capability: '文本生成、推理模型', nightDiscount: true },
  { brand: 'DeepSeek', model: 'deepseek-v4-pro', capability: '文本生成、推理模型' },
  { brand: 'DeepSeek', model: 'deepseek-v4-flash-0731', capability: '文本生成、推理模型' },
  { brand: '智谱 AI', model: 'glm-5.2', capability: '文本生成、推理模型' },
]

function copyToClipboard(text: string, label = '内容') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(
      () => message.success(`已复制${label}`),
      () => fallbackCopy(text, label),
    )
  } else {
    fallbackCopy(text, label)
  }
}

function fallbackCopy(text: string, label: string) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    message.success(`已复制${label}`)
  } catch {
    message.error('复制失败，请手动复制')
  }
}

interface Props {
  onOpenUsageStats?: () => void
  variant?: 'normal' | 'noPlan' | 'noPack'
  onSubscribe?: (edition: 'personal' | 'team') => void
  onRenew?: () => void
  onViewOrders?: () => void
}

export default function MySubscriptionPage({ onOpenUsageStats, variant = 'normal', onSubscribe, onRenew, onViewOrders }: Props) {
  const [edition, setEdition] = useState<'personal' | 'team'>('personal')
  const [packDetailOpen, setPackDetailOpen] = useState(false)

  /** ====== API Key 列表管理 ====== */
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(loadApiKeys)
  const [visibleKeyIds, setVisibleKeyIds] = useState<Set<string>>(new Set())
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm] = Form.useForm<{
    name: string
    permanent: boolean
    expireAt?: string
  }>()

  function updateApiKeys(updater: (prev: ApiKeyItem[]) => ApiKeyItem[]) {
    setApiKeys((prev) => {
      const next = updater(prev)
      persistApiKeys(next)
      return next
    })
  }

  function toggleKeyVisible(id: string) {
    setVisibleKeyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAddKeySubmit() {
    addForm.validateFields().then((values) => {
      if (apiKeys.length >= MAX_API_KEYS) {
        message.error(`每个账户最多可生成 ${MAX_API_KEYS} 个密钥`)
        return
      }
      const newItem: ApiKeyItem = {
        id: `k${Date.now()}`,
        name: values.name.trim(),
        key: genRandomKey(values.name.trim()),
        permanent: values.permanent,
        expireAt: values.permanent ? undefined : values.expireAt,
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      }
      updateApiKeys((prev) => [...prev, newItem])
      message.success('API Key 已创建')
      addForm.resetFields()
      setAddModalOpen(false)
    })
  }

  function handleDeleteKey(id: string) {
    updateApiKeys((prev) => prev.filter((k) => k.id !== id))
    setVisibleKeyIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    message.success('已删除')
  }

  function handleResetKey(id: string) {
    Modal.confirm({
      title: '确认重置 API Key？',
      content: '重置后，原有api key 立即失效，请更换新key使用',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        updateApiKeys((prev) =>
          prev.map((k) =>
            k.id === id
              ? {
                  ...k,
                  key: genRandomKey(k.name),
                  createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
                }
              : k
          )
        )
        message.success('API Key 已重置')
      },
    })
  }

  /** 品牌列合并：同一品牌只在首行展示一次 */
  const mergedModelRows: (ModelRow & { _brandRowSpan?: number })[] = MODEL_DATA.map((r, idx, arr) => {
    if (idx === 0 || arr[idx - 1].brand !== r.brand) {
      let span = 1
      for (let j = idx + 1; j < arr.length && arr[j].brand === r.brand; j++) span++
      return { ...r, _brandRowSpan: span }
    }
    return { ...r, _brandRowSpan: 0 }
  })

  const editionLabel = edition === 'personal' ? '个人版' : '企业版'
  const isEmptyState = variant === 'noPlan'

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100%' }}>
      {/* 顶部 Tab（未购买套餐的空状态不展示） */}
      {!isEmptyState && (
        <div style={{ marginBottom: 16 }}>
          <Segmented
            value={edition}
            onChange={(v) => setEdition(v as 'personal' | 'team')}
            options={
              SHOW_ENTERPRISE
                ? [
                    { label: '个人版', value: 'personal' },
                    { label: '企业版', value: 'team' },
                  ]
                : [{ label: '个人版', value: 'personal' }]
            }
          />
        </div>
      )}

      {/* 空状态 */}
      {isEmptyState ? (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #eef0f4',
            padding: '120px 0',
            textAlign: 'center',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <div style={{ fontSize: 18, color: '#1f2937', fontWeight: 600 }}>您还未订阅 Token Plan</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              size="large"
              onClick={() => onSubscribe?.('personal')}
              style={{
                height: 44,
                borderRadius: 10,
                padding: '0 28px',
                fontSize: 15,
                fontWeight: 600,
                background: '#111827',
                borderColor: '#111827',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              立即购买个人版
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" />
                <path d="M9 7h8v8" />
              </svg>
            </Button>
            {SHOW_ENTERPRISE && (
              <Button
                size="large"
                onClick={() => onSubscribe?.('team')}
                style={{
                  height: 44,
                  borderRadius: 10,
                  padding: '0 28px',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#111827',
                  borderColor: '#e0e0e0',
                  background: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                立即购买企业版
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" />
                  <path d="M9 7h8v8" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      ) : (
      <>
      {/* ========= 卡片一：套餐信息 + 套餐额度 ========= */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #eef0f4',
          display: 'flex',
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        {/* 左侧 套餐信息（带浅蓝渐变左边框） */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            padding: '32px 32px 28px',
            background:
              'linear-gradient(180deg, rgba(174,214,255,0.18) 0%, rgba(255,255,255,1) 60%)',
            borderRight: '1px solid #eef0f4',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: 'linear-gradient(180deg,#8ec8ff,#b0a8ff)',
            }}
          />
          {/* 标题行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <Space size={10}>
              <span style={{ fontSize: 22, fontWeight: 600, color: '#1f2937' }}>
                {PLAN_INFO.name}
              </span>
              <Tooltip title="套餐周期内未耗尽额度将自动清零，不顺延到下期">
                <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} />
              </Tooltip>
            </Space>
            <a
              onClick={() => onViewOrders?.()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: PRIMARY,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              查看历史订单 <ArrowRightOutlined style={{ fontSize: 12 }} />
            </a>
          </div>

          {/* 信息列表（flex:1 均分剩余高度，避免与底部按钮之间出现大片空白） */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-evenly',
              gap: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#94a3b8', width: 74 }}>套餐状态</span>
              <Tag
                style={{
                  margin: 0,
                  padding: '2px 10px',
                  background: '#e7f8ec',
                  color: '#14a052',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                {PLAN_INFO.status}
              </Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#94a3b8', width: 74 }}>套餐总量</span>
              <Text strong style={{ fontSize: 16, color: '#111827' }}>
                {MONTHLY_TOTAL.toLocaleString()} tokens
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#94a3b8', width: 74 }}>限额</span>
              <Text strong style={{ fontSize: 16, color: '#111827' }}>
                {WEEKLY_LIMIT.toLocaleString()} tokens/周
              </Text>
              <Tooltip title="限额周期内，达到对应额度上限后，需等待到下一个限额周期方可重置额度；周期内未用完的额度不作结转。">
                <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'pointer' }} />
              </Tooltip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#94a3b8', width: 74 }}>剩余天数</span>
              <Text strong style={{ fontSize: 16, color: '#111827' }}>
                {PLAN_INFO.remainingDays} 天
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#94a3b8', width: 74 }}>开始时间</span>
              <Text style={{ color: '#111827' }}>{PLAN_INFO.startAt}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#94a3b8', width: 74 }}>结束时间</span>
              <Text style={{ color: '#111827' }}>{PLAN_INFO.endAt}</Text>
            </div>
          </div>

          {/* 底部按钮 */}
          <div style={{ marginTop: 'auto', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button
              size="large"
              type="primary"
              onClick={() => onRenew?.()}
              style={{
                height: 48,
                borderRadius: 8,
                background: PRIMARY,
                borderColor: PRIMARY,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              续费
            </Button>
          </div>
        </div>

        {/* 右侧 套餐额度 */}
        <div style={{ flex: 1, padding: '32px 36px 28px' }}>
          {/* 额度 头部 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 32,
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1f2937' }}>套餐额度</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
                限额周期：2026-10-12 ~ 2026-10-18，周期内未用完的额度不作结转
              </div>
            </div>
            <Space size={16}>
              <a
                onClick={() => onOpenUsageStats?.()}
                style={{ color: PRIMARY, fontWeight: 500, cursor: 'pointer' }}
              >
                用量统计
              </a>
            </Space>
          </div>

          {/* 额度使用进度 */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                {WEEKLY_USAGE_PERCENT}%
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                已用{' '}
                <span style={{ color: '#1f2937', fontWeight: 500 }}>
                  {WEEKLY_USED.toLocaleString()} tokens
                </span>
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                总额度{' '}
                <span style={{ color: '#1f2937', fontWeight: 500 }}>
                  {WEEKLY_LIMIT.toLocaleString()} tokens
                </span>
              </span>
            </div>
            {/* 进度条 + 刻度 */}
            <Tooltip
              title={`已用量：${WEEKLY_USED.toLocaleString()} tokens`}
              placement="top"
            >
              <div style={{ position: 'relative' }}>
                <Progress
                  percent={WEEKLY_USAGE_PERCENT}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#6fa5ff',
                    '100%': '#2f6bff',
                  }}
                  trailColor="#edf2ff"
                  strokeLinecap="round"
                  strokeWidth={10}
                />
              {/* 刻度标签 0 50 90 100 */}
              <div
                style={{
                  marginTop: 10,
                  position: 'relative',
                  height: 18,
                  fontSize: 12,
                  color: '#94a3b8',
                }}
              >
                <span style={{ position: 'absolute', left: 0 }}>0%</span>
                <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                  50%
                </span>
                <span style={{ position: 'absolute', left: '90%', transform: 'translateX(-50%)', color: PRIMARY, fontWeight: 500 }}>
                  90%
                </span>
                <span style={{ position: 'absolute', right: 0 }}>100%</span>
              </div>
              {/* 90% 竖虚线 标记 */}
              <div
                style={{
                  position: 'absolute',
                  left: '90%',
                  top: -6,
                  bottom: -26,
                  width: 0,
                  borderLeft: `2px dashed ${PRIMARY}`,
                }}
              />
            </div>
            </Tooltip>
          </div>

          <div
            style={{
              height: 1,
              background: '#eef0f4',
              margin: '32px 0',
            }}
          />

          {/* 资源包 */}
          {variant === 'noPack' ? (
            <div
              style={{
                height: 103,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 14 }}>
                暂无可用{editionLabel}资源包，请先购买
              </div>
              <Button
                type="primary"
                onClick={() => onSubscribe?.(edition)}
                style={{ height: 40, borderRadius: 8, padding: '0 24px' }}
              >
                去购买
              </Button>
            </div>
          ) : (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 500, color: '#475569' }}>资源包补充额度</span>
              <a
                onClick={() => setPackDetailOpen(true)}
                style={{
                  color: PRIMARY,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                资源包详情
              </a>
            </div>
            {/* 百分比 + 到期时间 */}
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  rowGap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                    4%
                  </span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    已用{' '}
                    <span style={{ color: '#1f2937', fontWeight: 500 }}>400,000 tokens</span>
                  </span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    总额度{' '}
                    <span style={{ color: '#1f2937', fontWeight: 500 }}>10,000,000 tokens</span>
                  </span>
                </div>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>到期时间：2026-09-25</span>
              </div>
              {/* 进度条 */}
              <div
                style={{
                  position: 'relative',
                  height: 8,
                  background: '#f1f5f9',
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4%',
                    background: '#a78bfa',
                    borderRadius: 4,
                  }}
                />
                {/* 刻度 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 12,
                    fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  0%
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: 12,
                    fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  50%
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: '10%',
                    top: 12,
                    fontSize: 11,
                    color: PRIMARY,
                    fontWeight: 500,
                  }}
                >
                  90%
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 12,
                    fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  100%
                </div>
                {/* 90% 虚线 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '90%',
                    top: -6,
                    bottom: 18,
                    width: 1,
                    borderLeft: '1.5px dashed #3b82f6',
                  }}
                />
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ========= 卡片二：专属 API KEY ========= */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, marginBottom: 16, border: '1px solid #eef0f4' }}
        bodyStyle={{ padding: '28px 32px' }}
      >
        {/* API Key 标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: '#1f2937' }}>
            专属 API KEY
          </div>
        </div>
        <div style={{ color: '#64748b', lineHeight: 1.8, marginBottom: 18 }}>
          请妥善保存您的密钥信息，不要与他人共享，或者暴露在客户端代码中。为保护您的账户安全，我们可能会自动禁用任何公开泄漏的 API
          Key。您也可以随时重置以生成新的密钥。
        </div>

        {/* 接入地址 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginBottom: 10 }}>
            接入地址
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                label: 'OpenAI 兼容',
                url: 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
              },
              {
                label: 'Anthropic 兼容',
                url: 'https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic',
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  flex: 1,
                  minWidth: 360,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  background: '#f8fafc',
                  border: '1px solid #eef0f4',
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </span>
                <code
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: '#334155',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    background: 'transparent',
                    padding: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.url}
                >
                  {item.url}
                </code>
                <Tooltip title="复制">
                  <span
                    onClick={() => copyToClipboard(item.url, '接入地址')}
                    style={{
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      flexShrink: 0,
                    }}
                  >
                    <CopyOutlined />
                  </span>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        {/* API Key 列表上方：新增 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginBottom: 12,
          }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              if (apiKeys.length >= MAX_API_KEYS) {
                message.error(`每个账户最多可生成 ${MAX_API_KEYS} 个密钥`)
                return
              }
              addForm.setFieldsValue({ permanent: true })
              setAddModalOpen(true)
            }}
            style={{ borderRadius: 8, height: 36, padding: '0 16px' }}
          >
            新增
          </Button>
        </div>

        {/* API Key 表格 */}
        <Table<ApiKeyItem>
          rowKey="id"
          dataSource={apiKeys}
          pagination={false}
          tableLayout="fixed"
          style={{ fontSize: 14 }}
          locale={{ emptyText: '暂无 API Key，点击上方「新增」创建' }}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              width: 180,
              ellipsis: { showTitle: false },
              render: (v: string) => (
                <Tooltip title={v} placement="topLeft">
                  <span style={{ color: '#334155', fontSize: 15, fontWeight: 500 }}>
                    {v}
                  </span>
                </Tooltip>
              ),
            },
            {
              title: 'API KEY',
              dataIndex: 'key',
              render: (v: string, record) => {
                const visible = visibleKeyIds.has(record.id)
                return (
                  <Space size={12} style={{ display: 'flex' }}>
                    <span
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        fontSize: 15,
                        color: '#111827',
                        letterSpacing: 0.3,
                        wordBreak: 'break-all',
                      }}
                    >
                      {visible ? v : maskKey(v)}
                    </span>
                    <Tooltip title={visible ? '隐藏' : '显示'}>
                      <span
                        onClick={() => toggleKeyVisible(record.id)}
                        style={{
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'inline-flex',
                        }}
                      >
                        {visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      </span>
                    </Tooltip>
                    <Tooltip title="复制">
                      <span
                        onClick={() => copyToClipboard(record.key, 'API Key')}
                        style={{
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'inline-flex',
                        }}
                      >
                        <CopyOutlined />
                      </span>
                    </Tooltip>
                  </Space>
                )
              },
            },
            {
              title: '生成时间',
              dataIndex: 'createdAt',
              width: 180,
              render: (v: string) => (
                <span style={{ color: '#334155' }}>{v || '—'}</span>
              ),
            },
            {
              title: '有效期',
              dataIndex: 'permanent',
              width: 140,
              render: (permanent: boolean, record) =>
                permanent ? (
                  <span style={{ color: '#334155' }}>永久</span>
                ) : (
                  <span style={{ color: '#334155' }}>{record.expireAt || '—'}</span>
                ),
            },
            {
              title: '操作',
              width: 160,
              fixed: 'right',
              render: (_, record) => (
                <Space size={18}>
                  <a
                    onClick={() => handleResetKey(record.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: PRIMARY,
                      cursor: 'pointer',
                    }}
                  >
                    <ReloadOutlined /> 重置
                  </a>
                  <Popconfirm
                    title="确认删除该 API Key？"
                    description="删除后将立即失效，无法恢复"
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDeleteKey(record.id)}
                  >
                    <a
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <DeleteOutlined /> 删除
                    </a>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* ========= 新增 API Key 弹窗 ========= */}
      <Modal
        open={addModalOpen}
        title="添加 API Key"
        onOk={handleAddKeySubmit}
        onCancel={() => {
          addForm.resetFields()
          setAddModalOpen(false)
        }}
        okText="确认"
        cancelText="取消"
        centered
        width={520}
        destroyOnClose
      >
        <div style={{ color: '#64748b', marginBottom: 22 }}>
          每个账户最多可生成 {MAX_API_KEYS} 个密钥（当前 {apiKeys.length}/{MAX_API_KEYS}）
        </div>
        <Form
          form={addForm}
          layout="vertical"
          initialValues={{ permanent: true }}
          preserve={false}
          requiredMark
        >
          <Form.Item
            label="密钥名称"
            name="name"
            rules={[
              { required: true, message: '请输入密钥名称' },
              { max: 32, message: '密钥名称最多 32 个字符' },
            ]}
          >
            <Input
              placeholder="输入你的密钥名称"
              style={{ borderRadius: 8, height: 40 }}
            />
          </Form.Item>

          <Form.Item
            label="是否永久有效"
            name="permanent"
            rules={[{ required: true, message: '请选择有效期类型' }]}
          >
            <Radio.Group>
              <Radio value={true}>是</Radio>
              <Radio value={false}>否</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.permanent !== curr.permanent}
          >
            {({ getFieldValue }) =>
              getFieldValue('permanent') === false ? (
                <Form.Item
                  label="到期日期"
                  name="expireAt"
                  rules={[{ required: true, message: '请选择到期日期' }]}
                  extra="到期后该 API Key 将无法调用接口"
                >
                  <Input
                    type="date"
                    style={{ borderRadius: 8, height: 40 }}
                    placeholder="选择到期日期"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* ========= 卡片三：可使用模型表格 ========= */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, border: '1px solid #eef0f4' }}
        bodyStyle={{ padding: '28px 32px 12px' }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 10 }}>
          可使用模型
        </div>
        <div style={{ color: '#64748b', marginBottom: 22 }}>
          当前订阅套餐支持使用以下模型列表，为保证效率最优，可能不定期更新部分模型，届时将会发送站内消息，请关注使用
        </div>

        <Table<ModelRow & { _brandRowSpan?: number }>
          rowKey={(r, idx) => `${r.brand}-${r.model}-${idx}`}
          dataSource={mergedModelRows}
          pagination={false}
          tableLayout="fixed"
          style={{ fontSize: 14 }}
          columns={[
            {
              title: '品牌',
              dataIndex: 'brand',
              width: 120,
              onCell: (record) => ({
                rowSpan: record._brandRowSpan ?? 1,
                style: {
                  color: '#334155',
                  fontSize: 15,
                  verticalAlign: 'middle',
                },
              }),
              render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
            },
            {
              title: '模型',
              dataIndex: 'model',
              width: 280,
              render: (v: string) => (
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    color: '#111827',
                    fontSize: 14,
                  }}
                >
                  {v}
                </span>
              ),
            },
            {
              title: '模型能力',
              dataIndex: 'capability',
              render: (v: string) => <Text style={{ color: '#475569' }}>{v}</Text>,
            },
            {
              title: 'Model ID',
              dataIndex: 'model',
              width: 220,
              render: (v: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      color: '#334155',
                      fontSize: 13,
                    }}
                  >
                    {v}
                  </span>
                  <Tooltip title="复制">
                    <span
                      onClick={() => copyToClipboard(v, 'Model ID')}
                      style={{ color: '#94a3b8', cursor: 'pointer', display: 'inline-flex' }}
                    >
                      <CopyOutlined />
                    </span>
                  </Tooltip>
                </div>
              ),
            },
            {
              title: '操作',
              width: 100,
              fixed: 'right',
              render: () => (
                <a
                  style={{ color: PRIMARY, cursor: 'pointer' }}
                >
                  查看详情
                </a>
              ),
            },
          ]}
        />
      </Card>

      {/* 资源包详情弹窗 */}
      <Modal
        title="资源包"
        open={packDetailOpen}
        onCancel={() => setPackDetailOpen(false)}
        footer={null}
        centered
        width={480}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px 4px' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>Qwen-Max 特价尊享包</div>
          {[
            { label: '可用模型', value: 'Qwen-Max' },
            { label: '额度', value: '100,000,000 Tokens' },
            { label: '订阅时间', value: '2026-09-11' },
            { label: '订阅时长', value: '3个月（到期：2026-11-25）' },
          ].map((it) => (
            <div key={it.label} style={{ display: 'flex', fontSize: 14, lineHeight: 1.6 }}>
              <span style={{ width: 84, color: '#94a3b8', flexShrink: 0 }}>{it.label}</span>
              <span style={{ color: '#1f2937', flex: 1 }}>{it.value}</span>
            </div>
          ))}
        </div>
      </Modal>
      </>
      )}
    </div>
  )
}
