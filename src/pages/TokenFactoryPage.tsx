import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Alert, Button, Card, Cascader, DatePicker, Empty, Form, Input, Modal, Popconfirm, Popover, Segmented, Select, Space, Table, Tabs, Tag, Tooltip, Typography, theme, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import {
  AppstoreOutlined,
  AreaChartOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  BellOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CodeOutlined,
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  FireFilled,
  FolderOpenOutlined,
  FundProjectionScreenOutlined,
  GiftOutlined,
  KeyOutlined,
  LoadingOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  RobotOutlined,
  SearchOutlined,
  SlidersOutlined,
  StarFilled,
  SwapOutlined,
  ThunderboltOutlined,
  UpOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { ModelLogo } from './ModelList'
import SecretCell, { maskSecret } from '../components/SecretCell'
import ModelPerformanceModal from '../components/ModelPerformanceModal'
import RequirementDot from '../components/RequirementDot'
import { buildModelPerformance, channelModelPerf, PERF_NORMAL_RATE_THRESHOLD, PERF_WARN_RATE_THRESHOLD } from '../perf'
import type { ChannelModelItem, ModelApiConfig, ModelGroup, ModelItem, ModelPerfStatus } from '../types'
import { roundAmount } from '../types'
import {
  CURRENT_CONSOLE_USER,
  DEFAULT_MODEL_GROUP_ID,
  findNewcomerVoucher,
  findTierConflict,
  MODEL_GROUP_LIMIT_PER_USER,
  type TierConflict,
  useChannels,
  useModelGroups,
  useModels,
  useVoucherTemplates,
} from '../store'

const { Text } = Typography

/* ---------------- 左侧二级菜单 ---------------- */

export type FactoryMenu = 'overview' | 'plaza' | 'experience' | 'usage' | 'apiKey' | 'myGroups' | 'quota' | 'pricing'

const MENU_GROUPS: { title: string; items: { key: FactoryMenu; label: string; icon: ReactNode; dot?: ReactNode }[] }[] = [
  {
    title: '',
    items: [
      {
        key: 'overview',
        label: '概览',
        icon: <FundProjectionScreenOutlined />,
      },
    ],
  },
  {
    title: '模型服务',
    items: [{ key: 'plaza', label: '模型广场', icon: <AppstoreOutlined /> }],
  },
  {
    title: '体验中心',
    items: [{ key: 'experience', label: '体验语言模型', icon: <RobotOutlined /> }],
  },
  {
    title: '统计分析',
    items: [{ key: 'usage', label: '用量统计', icon: <AreaChartOutlined /> }],
  },
  {
    title: '配置管理',
    items: [
      { key: 'apiKey', label: 'API Key管理', icon: <KeyOutlined /> },
      { key: 'myGroups', label: '模型分组', icon: <FolderOpenOutlined /> },
      { key: 'quota', label: '配额管理', icon: <DashboardOutlined /> },
      { key: 'pricing', label: '模型费率', icon: <FileTextOutlined /> },
    ],
  },
]

const MENU_LABELS: Record<FactoryMenu, string> = {
  overview: '概览',
  plaza: '模型广场',
  experience: '体验语言模型',
  usage: '用量统计',
  apiKey: 'API Key管理',
  myGroups: '模型分组',
  quota: '配额管理',
  pricing: '模型费率',
}

/* ---------------- 模型广场数据 ---------------- */

type PriceCell = { label: string; value: string }

type PlazaModel = {
  id: string
  name: string
  vendor: string
  /** 模型类别标签：一级（文本/图像/视频）与二级（文本生成/图像生成/视频生成） */
  tags: string[]
  desc: string
  /** 阶梯定价档数，无阶梯时不展示阶梯标签 */
  tiers?: number
  /** 两列价格，与截图一致：左列在前、右列在后 */
  prices: PriceCell[][]
  hot?: boolean
  badge?: string
}

const TEXT = ['文本', '文本生成']
const IMAGE = ['图像', '图像生成']
const VIDEO = ['视频', '视频生成']

const P = (label: string, value: string): PriceCell => ({ label, value })
const MT = (v: number) => `¥${v}/Mt`
const PC = (v: string) => `¥${v}/张`
const PS = (v: string) => `¥${v}/秒`

const MODELS: PlazaModel[] = [
  {
    id: 'dodo-og-g-6-astra',
    name: 'DODO-OG-G-6-Astra',
    vendor: '智算多多',
    tags: TEXT,
    desc: '国外顶尖模型，长上下文与复杂推理任务的旗舰之选。',
    tiers: 2,
    prices: [
      [P('输入', MT(7.7)), P('输出', MT(38.5)), P('缓存', MT(0.77)), P('上下文', '1050k')],
      [P('最高输入', MT(15.4)), P('最高输出', MT(57.75))],
    ],
  },
  {
    id: 'dodo-og-g-5-6-sol',
    name: 'DODO-OG-G-5-6-Sol',
    vendor: '智算多多',
    tags: TEXT,
    desc: '顶尖模型，兼顾效果与成本的日常主力。',
    tiers: 2,
    prices: [
      [P('输入', MT(0.924)), P('输出', MT(4.62)), P('缓存', MT(0.0924)), P('上下文', '1050k')],
      [P('最高输入', MT(1.848)), P('最高输出', MT(6.93))],
    ],
  },
  {
    id: 'kimi-k3',
    name: 'Kimi-K3',
    vendor: '月之暗面',
    tags: TEXT,
    desc: 'Kimi K3 是月之暗面（Moonshot AI）发布的旗舰级开源大模型，于 2026 年 7 月 17 日正式亮相，是全球首个参数规模接近 3 万亿的开源模型。',
    prices: [
      [P('输入', MT(13.588344)), P('输出', MT(67.941258))],
      [P('上下文', '1000k'), P('缓存价格', MT(1.358825))],
    ],
    hot: true,
    badge: 'K3',
  },
  {
    id: 'glm-5-3',
    name: 'GLM-5.3',
    vendor: '智谱',
    tags: TEXT,
    desc: 'GLM-5.3 是智谱 AI 于 2026 年 8 月发布的代码与安全专用旗舰模型，基于 GLM-5.2 基座通过后训练强化，定位聚焦代码生成与安全审计。',
    tiers: 2,
    prices: [
      [P('输入', MT(5.6)), P('输出', MT(22.4)), P('缓存', MT(0.56)), P('上下文', '200k')],
      [P('最高输入', MT(8.4)), P('最高输出', MT(33.6))],
    ],
  },
  {
    id: 'qwen3-8-max',
    name: 'Qwen3.8-Max',
    vendor: '阿里',
    tags: TEXT,
    desc: '2.4 万亿参数 MoE 旗舰，编程与办公能力全面跃升，可自主编程十数天交付完整项目，胜任法律、金融、设计等数百种专业场景。',
    tiers: 3,
    prices: [
      [P('输入', MT(6.8)), P('输出', MT(27.2)), P('缓存', MT(0.68)), P('上下文', '1000k')],
      [P('最高输入', MT(10.2)), P('最高输出', MT(40.8))],
    ],
    hot: true,
  },
  {
    id: 'dodo-ac-ultra-5',
    name: 'DODO-AC-Ultra-5',
    vendor: '智算多多',
    tags: TEXT,
    desc: '高性价比对话模型，适合高并发的轻量问答与摘要场景。',
    prices: [
      [P('输入', MT(0.28)), P('输出', MT(1.12))],
      [P('上下文', '256k'), P('缓存价格', MT(0.028))],
    ],
  },
  {
    id: 'deepseek-v4',
    name: 'DeepSeek-V4',
    vendor: '深度求索',
    tags: TEXT,
    desc: '旗舰推理模型，多步骤推理与智能体任务执行更稳定。',
    tiers: 2,
    prices: [
      [P('输入', MT(1.2)), P('输出', MT(3.6)), P('缓存', MT(0.024)), P('上下文', '164k')],
      [P('最高输入', MT(2.4)), P('最高输出', MT(6))],
    ],
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek-V4-Flash',
    vendor: '深度求索',
    tags: TEXT,
    desc: '极速低价版本，适合对时延敏感的实时交互场景。',
    prices: [
      [P('输入', MT(0.3)), P('输出', MT(0.9))],
      [P('上下文', '164k'), P('缓存价格', MT(0.01))],
    ],
  },
  {
    id: 'minimax-m3',
    name: 'MiniMax-M3',
    vendor: '稀宇科技',
    tags: TEXT,
    desc: '长上下文与多模态理解并重，角色扮演与内容创作表现突出。',
    prices: [
      [P('输入', MT(2.2)), P('输出', MT(8.8))],
      [P('上下文', '512k'), P('缓存价格', MT(0.22))],
    ],
  },
  {
    id: 'mimo-vl-pro',
    name: 'MiMo-VL-Pro',
    vendor: '小米',
    tags: TEXT,
    desc: '小米多模态理解模型，图文混排解析与视觉问答表现出色。',
    prices: [
      [P('输入', MT(1.6)), P('输出', MT(6.4))],
      [P('上下文', '256k'), P('缓存价格', MT(0.16))],
    ],
  },
  {
    id: 'doubao-seed-2-0',
    name: 'Doubao-Seed-2.0',
    vendor: '字节跳动',
    tags: TEXT,
    desc: '豆包主力对话模型，推理、创作与工具调用能力均衡。',
    tiers: 2,
    prices: [
      [P('输入', MT(0.8)), P('输出', MT(3.2)), P('缓存', MT(0.08)), P('上下文', '128k')],
      [P('最高输入', MT(1.2)), P('最高输出', MT(4.8))],
    ],
  },
  {
    id: 'glm-5-2',
    name: 'GLM-5.2',
    vendor: '智谱',
    tags: TEXT,
    desc: '通用旗舰模型，支持 1M 无损上下文，工程规范遵循更可靠。',
    tiers: 2,
    prices: [
      [P('输入', MT(2.5)), P('输出', MT(10)), P('缓存', MT(0.25)), P('上下文', '1000k')],
      [P('最高输入', MT(4.5)), P('最高输出', MT(18))],
    ],
  },
  {
    id: 'gemini-3-1-pro',
    name: 'Gemini-3.1-Pro',
    vendor: '谷歌',
    tags: TEXT,
    desc: '国外顶尖模型，原生多模态推理与超长上下文标杆。',
    tiers: 2,
    prices: [
      [P('输入', MT(12.6)), P('输出', MT(37.8)), P('缓存', MT(1.26)), P('上下文', '2000k')],
      [P('最高输入', MT(18.9)), P('最高输出', MT(56.7))],
    ],
    hot: true,
    badge: 'Pro',
  },
  {
    id: 'dodo-vision-4',
    name: 'DODO-Vision-4',
    vendor: '智算多多',
    tags: IMAGE,
    desc: '文生图与图像编辑一体，中英文字渲染精准。',
    prices: [
      [P('标准', PC('0.25')), P('高清', PC('0.60'))],
      [P('图生图', PC('0.35')), P('最大分辨率', '2048px')],
    ],
  },
  {
    id: 'doubao-seedream-5-0-pro',
    name: 'Doubao-Seedream-5.0-Pro',
    vendor: '字节跳动',
    tags: IMAGE,
    desc: '豆包文生图旗舰，兼顾全局指令理解与局部细节刻画。',
    prices: [
      [P('标准', PC('0.20')), P('高清', PC('0.50'))],
      [P('图像编辑', PC('0.30')), P('最大分辨率', '4096px')],
    ],
  },
  {
    id: 'wan-image-2-5',
    name: 'Wan-Image-2.5',
    vendor: '阿里',
    tags: IMAGE,
    desc: '通义万相图像模型，海报与知识密集型场景效果佳。',
    prices: [
      [P('标准', PC('0.14')), P('高清', PC('0.42'))],
      [P('图像编辑', PC('0.21')), P('最大分辨率', '2048px')],
    ],
  },
  {
    id: 'glm-image',
    name: 'GLM-Image',
    vendor: '智谱',
    tags: IMAGE,
    desc: '智谱图像生成模型，版式控制与图文混排能力突出。',
    prices: [
      [P('标准', PC('0.18')), P('高清', PC('0.48'))],
      [P('图像编辑', PC('0.26')), P('最大分辨率', '2048px')],
    ],
  },
  {
    id: 'imagen-5',
    name: 'Imagen-5',
    vendor: '谷歌',
    tags: IMAGE,
    desc: '国外顶尖图像模型，写实细节与光影表现业界领先。',
    prices: [
      [P('标准', PC('0.70')), P('高清', PC('1.40'))],
      [P('图像编辑', PC('0.90')), P('最大分辨率', '4096px')],
    ],
    hot: true,
  },
  {
    id: 'pixverse-image',
    name: 'PixVerse-Image',
    vendor: '爱诗科技',
    tags: IMAGE,
    desc: '爱诗科技图像生成模型，风格化与主体一致性控制出色。',
    prices: [
      [P('标准', PC('0.12')), P('高清', PC('0.36'))],
      [P('参考生图', PC('0.20')), P('最大分辨率', '1536px')],
    ],
  },
  {
    id: 'vidu-image',
    name: 'Vidu-Image',
    vendor: '生数',
    tags: IMAGE,
    desc: '生数科技图像模型，多主体一致性与参考图控制见长。',
    prices: [
      [P('标准', PC('0.16')), P('高清', PC('0.44'))],
      [P('参考生图', PC('0.24')), P('最大分辨率', '2048px')],
    ],
  },
  {
    id: 'qwen-image-layered',
    name: 'Qwen-Image-Layered',
    vendor: '阿里',
    tags: IMAGE,
    desc: '分层图像模型，支持可编辑图层与精准文字排版。',
    prices: [
      [P('标准', PC('0.22')), P('高清', PC('0.58'))],
      [P('分层编辑', PC('0.34')), P('最大分辨率', '2048px')],
    ],
  },
  {
    id: 'dodo-veo-fast',
    name: 'DODO-Veo-Fast',
    vendor: '智算多多',
    tags: VIDEO,
    desc: '极速视频生成，适合短视频批量生产与效果预览。',
    prices: [
      [P('720P', PS('0.90')), P('1080P', PS('1.80'))],
      [P('单条最长时长', '10s'), P('图生视频', PS('1.20'))],
    ],
  },
  {
    id: 'doubao-seedance-2-0',
    name: 'Doubao-Seedance-2.0',
    vendor: '字节跳动',
    tags: VIDEO,
    desc: '全新视频生成模型，支持文生视频、图生视频的高质量生成，画面流畅、细节丰富。',
    hot: true,
    prices: [
      [P('720P', PS('1.20')), P('1080P', PS('2.60'))],
      [P('单条最长时长', '12s'), P('图生视频', PS('1.60'))],
    ],
  },
  {
    id: 'wan-video-2-5',
    name: 'Wan-Video-2.5',
    vendor: '阿里',
    tags: VIDEO,
    desc: '通义万相视频模型，运镜控制与人物动作更自然。',
    prices: [
      [P('720P', PS('1.00')), P('1080P', PS('2.20'))],
      [P('单条最长时长', '10s'), P('图生视频', PS('1.40'))],
    ],
  },
  {
    id: 'pixverse-v5',
    name: 'PixVerse-V5',
    vendor: '爱诗科技',
    tags: VIDEO,
    desc: '爱诗科技旗舰视频模型，动漫与特效风格表现突出。',
    prices: [
      [P('720P', PS('0.70')), P('1080P', PS('1.50'))],
      [P('单条最长时长', '8s'), P('图生视频', PS('0.95'))],
    ],
  },
  {
    id: 'vidu-q3',
    name: 'Vidu-Q3',
    vendor: '生数',
    tags: VIDEO,
    desc: '生数科技 Q 系列视频模型，长时长与主体一致性领先。',
    prices: [
      [P('720P', PS('1.10')), P('1080P', PS('2.40'))],
      [P('单条最长时长', '16s'), P('图生视频', PS('1.50'))],
    ],
  },
  {
    id: 'minimax-hailuo-2-5',
    name: 'MiniMax-Hailuo-2.5',
    vendor: '稀宇科技',
    tags: VIDEO,
    desc: '海螺视频模型，电影级镜头语言与人物表演细节丰富。',
    prices: [
      [P('720P', PS('0.85')), P('1080P', PS('1.90'))],
      [P('单条最长时长', '10s'), P('图生视频', PS('1.10'))],
    ],
  },
  {
    id: 'veo-4',
    name: 'Veo-4',
    vendor: '谷歌',
    tags: VIDEO,
    desc: '国外顶尖视频模型，原生音频与物理真实感表现标杆。',
    prices: [
      [P('720P', PS('3.20')), P('1080P', PS('5.60'))],
      [P('单条最长时长', '20s'), P('图生视频', PS('4.20'))],
    ],
    hot: true,
  },
]

const VENDORS = ['智算多多', '小米', '爱诗科技', '阿里', '深度求索', '稀宇科技', '智谱', '月之暗面', '谷歌', '字节跳动', '生数']

const CATEGORIES: { label: string; icon?: ReactNode }[] = [
  { label: '文本', icon: <FileTextOutlined /> },
  { label: '图像', icon: <PictureOutlined /> },
  { label: '视频', icon: <PlayCircleOutlined /> },
]

/** 筛选面板的计数：类别按一级标签匹配，供应商按厂商匹配 */
const countByCategory = (category: string) => MODELS.filter((m) => m.tags.includes(category)).length
const countByVendor = (vendor: string) => MODELS.filter((m) => m.vendor === vendor).length

const IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?image_size=landscape_16_9&prompt='

const HOT_MODELS: { modelId: string; title: string; image: string }[] = [
  {
    modelId: 'kimi-k3',
    title: 'Kimi-K3',
    image:
      IMG +
      'abstract%203d%20render%20of%20a%20glowing%20iridescent%20crystal%20prism%20floating%20above%20an%20open%20hand%20made%20of%20light%2C%20deep%20space%20background%20with%20planets%20and%20neon%20rays%2C%20purple%20blue%20pink%20gradient%2C%20cinematic%20high%20detail',
  },
  {
    modelId: 'glm-5-3',
    title: 'GLM-5.3',
    image:
      IMG +
      'smooth%20flowing%20abstract%20waves%20of%20blue%20violet%20and%20white%20light%2C%20glossy%20silk%20ribbon%20curves%2C%20dark%20navy%20background%2C%20minimal%203d%20gradient%20art%2C%20cinematic%20lighting',
  },
  {
    modelId: 'qwen3-8-max',
    title: 'Qwen3.8-Max',
    image:
      IMG +
      'abstract%20translucent%20glass%20cube%20containing%20a%20glowing%20sphere%2C%20shards%20of%20light%20floating%20around%2C%20dark%20purple%20background%2C%20neon%20magenta%20and%20cyan%20rim%20light%2C%203d%20render%20high%20detail',
  },
]

/* ---------------- 模型详情数据（由广场数据派生，不重复维护一份） ---------------- */

const BASE_URL = 'https://api.zsdodo.com'

type DetailRow = { label: string; value: string }

/** 文本模型按 Token 区间分档报价 */
type PriceTier = {
  range: string
  input: string
  output: string
  cache: string
  cacheWrite: string
  cacheRead: string
}

type ModelDetailData = {
  /** 价格表单位说明，展示在价格表下方 */
  unit: string
  /** 图像 / 视频模型按计费项纵向列出 */
  priceRows?: DetailRow[]
  /** 文本模型按 Token 区间阶梯列出 */
  priceTiers?: PriceTier[]
  infoRows: DetailRow[]
  endpoints: string[]
  features: string[]
}

/** 阶梯价格表的区间文案，与官方定价档位一致 */
const TIER_RANGES = ['0 – 272K', '272.001K – 2M']

/** 从「¥7.7/Mt」中取出数值，用于按系数推导缓存相关价格 */
const numOf = (value?: string) => {
  const n = value ? parseFloat(value.replace(/[^\d.]/g, '')) : NaN
  return Number.isFinite(n) ? n : 0
}

/** 展示为「¥9.625」，消除浮点噪声与多余尾零 */
const yen = (n: number) => `¥${Number(n.toFixed(6))}`

type RateLevel = { level: string; rpm: number; tpm: number }

const RATE_LEVELS: RateLevel[] = [
  { level: 'T1', rpm: 50, tpm: 50000 },
  { level: 'T2', rpm: 60, tpm: 110000 },
  { level: 'T3', rpm: 70, tpm: 310000 },
  { level: 'T4', rpm: 80, tpm: 610000 },
  { level: 'T5', rpm: 10000, tpm: 1100000 },
]

const CURRENT_LEVEL = 'T1'

/** groupId：密钥关联的模型分组，决定该密钥可调用哪些模型倍率 */
type ApiKeyRow = {
  id: string
  name: string
  key: string
  createdAt: string
  expire: string
  groupId?: string
}

const KEY_CHARS = '0123456789abcdef'

/** 确定性生成占位 Key，避免随机数导致每次渲染结果不同 */
const buildApiKey = (index: number) =>
  `sk-${Array.from({ length: 32 }, (_, j) => KEY_CHARS[(index * 7 + j * 5 + 3) % 16]).join('')}`

/** 模型详情「接入示例」中的密钥列表：与控制台 API Key 管理一致，均关联模型分组 */
const INITIAL_API_KEYS: ApiKeyRow[] = [
  { id: 'key-1', name: 'test', key: 'sk-test2f7c9a41b6e3805d7c1a9f3b5e8d2046ruxj', createdAt: '2026-05-09 16:03:09', expire: '永久', groupId: DEFAULT_MODEL_GROUP_ID },
  { id: 'key-2', name: '在线客服', key: buildApiKey(5), createdAt: '2026-08-20 10:12:36', expire: '永久', groupId: 'custom_cs_bot' },
]

/** 账户级密钥：控制台「API Key管理」列表的种子数据 */
const INITIAL_ACCOUNT_KEYS: ApiKeyRow[] = [
  { id: 'ak-1', name: 'test', key: 'sk-test2f7c9a41b6e3805d7c1a9f3b5e8d2046ruxj', createdAt: '2026-05-09 16:03:09', expire: '永久', groupId: DEFAULT_MODEL_GROUP_ID },
  { id: 'ak-2', name: '生产环境', key: buildApiKey(2), createdAt: '2026-06-18 10:24:37', expire: '永久', groupId: 'custom_cs_bot' },
  { id: 'ak-3', name: '测试环境', key: buildApiKey(3), createdAt: '2026-07-02 09:15:52', expire: '2026-12-31 23:59:59', groupId: 'custom_marketing' },
  { id: 'ak-4', name: '数据看板', key: buildApiKey(4), createdAt: '2026-08-11 14:48:03', expire: '2026-11-30 23:59:59', groupId: DEFAULT_MODEL_GROUP_ID },
]

type ModelKind = 'text' | 'image' | 'video'

const kindOf = (m: PlazaModel): ModelKind => (m.tags.includes('图像') ? 'image' : m.tags.includes('视频') ? 'video' : 'text')

/** 最大输出 Token 数按上下文窗口分档：2M 级 256k、512k~1M 级 128k、256k 级 64k、其余 32k */
const maxOutputOf = (ctx: number) => (ctx >= 2000 ? '256k' : ctx >= 512 ? '128k' : ctx >= 256 ? '64k' : '32k')

function deriveDetail(model: PlazaModel): ModelDetailData {
  const flat = model.prices.flat()
  const pick = (label: string) => flat.find((c) => c.label === label)?.value

  if (kindOf(model) === 'image') {
    const edit = flat.find((c) => c.label !== '标准' && c.label !== '高清' && c.label !== '最大分辨率')
    const editLabel = edit?.label ?? '图像编辑'
    return {
      unit: '元 / 张',
      priceRows: [
        { label: '标准', value: pick('标准') ?? '—' },
        { label: '高清', value: pick('高清') ?? '—' },
        { label: editLabel, value: edit?.value ?? '—' },
      ],
      infoRows: [
        { label: '生成模式', value: `文生图、${editLabel}` },
        { label: '最大分辨率', value: pick('最大分辨率') ?? '—' },
        { label: '模态（输入）', value: '文本' },
        { label: '模态（输出）', value: '图像' },
      ],
      endpoints: ['/v1/images/generations'],
      features: ['文生图', editLabel, '标准 / 高清双档', '模型体验'],
    }
  }

  if (kindOf(model) === 'video') {
    return {
      unit: '元 / 秒',
      priceRows: [
        { label: '720P', value: pick('720P') ?? '—' },
        { label: '1080P', value: pick('1080P') ?? '—' },
        { label: '图生视频', value: pick('图生视频') ?? '—' },
      ],
      infoRows: [
        { label: '分辨率档位', value: '720P、1080P' },
        { label: '单条最长时长', value: pick('单条最长时长') ?? '—' },
        { label: '模态（输入）', value: '文本、图像' },
        { label: '模态（输出）', value: '视频' },
      ],
      endpoints: ['/v1/videos/generations'],
      features: ['文生视频', '图生视频', '多档分辨率', '模型体验'],
    }
  }

  const ctx = pick('上下文') ?? '—'
  const input = numOf(pick('输入'))
  const topInput = numOf(pick('最高输入'))
  const baseCache = numOf(pick('缓存') ?? pick('缓存价格')) || input * 0.1
  /** 缓存价 = 输入价 × 0.1、显式缓存创建 = 输入价 × 1.25，与官方阶梯定价口径一致 */
  const tierOf = (range: string, inp: number, out: number, cache: number): PriceTier => ({
    range,
    input: yen(inp),
    output: yen(out),
    cache: yen(cache),
    cacheWrite: yen(inp * 1.25),
    cacheRead: yen(cache),
  })
  const priceTiers: PriceTier[] = [
    tierOf(topInput ? TIER_RANGES[0] : `0 – ${ctx}`, input, numOf(pick('输出')), baseCache),
  ]
  if (topInput) {
    priceTiers.push(tierOf(TIER_RANGES[1], topInput, numOf(pick('最高输出')), topInput * 0.1))
  }
  return {
    unit: '元 / Mt',
    priceTiers,
    infoRows: [
      { label: '上下文窗口', value: ctx },
      { label: '最大输出 Token 数', value: maxOutputOf(parseFloat(ctx) || 0) },
      { label: '模态（输入）', value: '文本、图像' },
      { label: '模态（输出）', value: '文本' },
    ],
    endpoints: ['/v1/chat/completions', '/v1/messages'],
    features: ['结构化输出', 'function calling', 'cache缓存', '模型体验'],
  }
}

/* ---------------- 小组件 ---------------- */

function Chip({
  label,
  icon,
  count,
  active,
  disabled,
  onClick,
}: {
  label: string
  icon?: ReactNode
  count?: number
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <span
      onClick={() => {
        if (!disabled) onClick()
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        fontSize: 13,
        lineHeight: '18px',
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        color: disabled ? '#c9cdd4' : active ? '#2f6bff' : '#1d2129',
        background: active && !disabled ? '#f0f7ff' : '#fff',
        border: `1px solid ${disabled ? '#eef0f4' : active ? '#2f6bff' : '#e5e6eb'}`,
        fontWeight: active ? 600 : 400,
      }}
    >
      {icon}
      {label}
      {typeof count === 'number' && (
        <span style={{ fontSize: 12, color: disabled ? '#c9cdd4' : active ? '#2f6bff' : '#86909c' }}>{count}</span>
      )}
    </span>
  )
}

/** 筛选面板里的可折叠分组 */
function FilterSection({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div style={{ borderTop: '1px solid #eef0f4', marginTop: 14, paddingTop: 14 }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1d2129' }}>{title}</span>
        {collapsed ? (
          <DownOutlined style={{ fontSize: 11, color: '#86909c' }} />
        ) : (
          <UpOutlined style={{ fontSize: 11, color: '#86909c' }} />
        )}
      </div>
      {!collapsed && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{children}</div>}
    </div>
  )
}

function ModelCard({ model, onOpen }: { model: PlazaModel; onOpen: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        border: '1px solid',
        borderColor: hover ? '#2f6bff' : '#eef0f4',
        borderRadius: 12,
        padding: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hover ? '0 6px 18px rgba(47, 107, 255, 0.12)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {(model.hot || model.badge) && (
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', borderBottomLeftRadius: 8, overflow: 'hidden' }}>
          {model.hot && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 12, color: '#ff7d00', background: '#fff7e8' }}>
              <FireFilled />
              Hot
            </span>
          )}
          {model.badge && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 12, color: '#2f6bff', background: '#eaf1ff' }}>
              <StarFilled />
              {model.badge}
            </span>
          )}
        </div>
      )}
      <ModelLogo text={model.name} size={44} />
      <div style={{ marginTop: 12, fontSize: 17, fontWeight: 600, color: '#1d2129' }}>{model.name}</div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          color: '#4e5969',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden',
        }}
      >
        {model.desc}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 14 }}>
        <div style={{ borderTop: '1px dashed #eef0f4', marginBottom: 12 }} />
        {model.tiers && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#2f6bff', background: '#f0f5ff', borderRadius: 4, padding: '1px 8px' }}>阶梯</span>
            <span style={{ fontSize: 12, color: '#722ed1', background: '#f5e9ff', borderRadius: 4, padding: '1px 8px' }}>
              {model.tiers} 个阶梯
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 16 }}>
          {model.prices.map((col, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.map((cell) => (
                <div key={cell.label}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1d2129' }}>{cell.value}</div>
                  <div style={{ fontSize: 12, color: '#86909c' }}>{cell.label}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- 模型详情 ---------------- */

function SectionTitle({ children, top = 0 }: { children: ReactNode; top?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: top, marginBottom: 14 }}>
      <span style={{ width: 3, height: 15, background: '#2f6bff', borderRadius: 2 }} />
      <span style={{ fontSize: 16, fontWeight: 600, color: '#1d2129' }}>{children}</span>
    </div>
  )
}

function CopyLine({ text, accent = false }: { text: string; accent?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制')
    } catch {
      message.error('复制失败')
    }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          lineHeight: '22px',
          wordBreak: 'break-all',
          color: accent ? '#2f6bff' : '#1d2129',
        }}
      >
        {text}
      </span>
      <Tooltip title="复制">
        <CopyOutlined style={{ color: '#86909c', cursor: 'pointer', marginTop: 4 }} onClick={copy} />
      </Tooltip>
    </div>
  )
}

/* ---------------- 调用示例代码片段（按模型类型 / 协议 / 语言派生） ---------------- */

type Protocol = 'anthropic' | 'openai'
type Lang = 'cURL' | 'Python' | 'TypeScript' | 'JavaScript'

const PROTOCOLS: Protocol[] = ['anthropic', 'openai']
const LANGS: Lang[] = ['cURL', 'Python', 'TypeScript', 'JavaScript']

/** 各语言示例统一使用同一句提问，便于横向对比写法 */
const PROMPTS: Record<ModelKind, string> = {
  text: 'Explain quantum entanglement in one paragraph.',
  image: 'A translucent glass cube on a marble desk, soft morning light',
  video: 'A drone shot flying over a coastline at sunset',
}

/** 示例里的密钥一律以环境变量占位，不出现真实 Key */
const KEY_ENV = 'ZSDDO_API_KEY'
const ANTHROPIC_VERSION = '2023-06-01'

/** 图像 / 视频只有 OpenAI 兼容风格的任务接口，文本按协议区分消息接口 */
const pathOf = (kind: ModelKind, protocol: Protocol) => {
  if (kind === 'image') return '/v1/images/generations'
  if (kind === 'video') return '/v1/videos/generations'
  return protocol === 'anthropic' ? '/v1/messages' : '/v1/chat/completions'
}

/** 请求体字段（键名 + 值字面量），各语言按自身语法改写引号 */
const bodyFields = (kind: ModelKind, modelId: string): [string, string][] => {
  if (kind === 'image') {
    return [
      ['model', `"${modelId}"`],
      ['prompt', `"${PROMPTS.image}"`],
      ['size', '"1024x1024"'],
      ['n', '1'],
    ]
  }
  if (kind === 'video') {
    return [
      ['model', `"${modelId}"`],
      ['prompt', `"${PROMPTS.video}"`],
      ['duration', '5'],
      ['resolution', '"1080P"'],
    ]
  }
  return [
    ['model', `"${modelId}"`],
    ['max_tokens', '1024'],
    ['messages', `[{ role: "user", content: "${PROMPTS.text}" }]`],
  ]
}

const curlCode = (kind: ModelKind, protocol: Protocol, modelId: string) => {
  const headers =
    protocol === 'anthropic'
      ? [`  -H "x-api-key: $${KEY_ENV}" \\`, `  -H "anthropic-version: ${ANTHROPIC_VERSION}" \\`, `  -H "Content-Type: application/json" \\`]
      : [`  -H "Authorization: Bearer $${KEY_ENV}" \\`, `  -H "Content-Type: application/json" \\`]
  const body = kind === 'text'
    ? `  -d '{
    "model": "${modelId}",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "${PROMPTS.text}"
      }
    ]
  }'`
    : `  -d '{\n${bodyFields(kind, modelId)
        .map(([k, v], i, arr) => `    "${k}": ${v}${i < arr.length - 1 ? ',' : ''}`)
        .join('\n')}\n  }'`
  return [`curl ${BASE_URL}${pathOf(kind, protocol)} \\`, ...headers, body].join('\n')
}

const pythonCode = (kind: ModelKind, protocol: Protocol, modelId: string) => {
  if (kind === 'video') {
    return `import os
import requests

resp = requests.post(
    "${BASE_URL}/v1/videos/generations",
    headers={"Authorization": f"Bearer {os.environ['${KEY_ENV}']}"},
    json={
        "model": "${modelId}",
        "prompt": "${PROMPTS.video}",
        "duration": 5,
        "resolution": "1080P",
    },
)

print(resp.json())`
  }
  if (protocol === 'anthropic') {
    return `import os
import anthropic

client = anthropic.Anthropic(
    api_key=os.environ["${KEY_ENV}"],
    base_url="${BASE_URL}",
)

message = client.messages.create(
    model="${modelId}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "${PROMPTS.text}"}],
)

print(message.content[0].text)`
  }
  if (kind === 'image') {
    return `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["${KEY_ENV}"],
    base_url="${BASE_URL}/v1",
)

image = client.images.generate(
    model="${modelId}",
    prompt="${PROMPTS.image}",
    size="1024x1024",
    n=1,
)

print(image.data[0].url)`
  }
  return `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["${KEY_ENV}"],
    base_url="${BASE_URL}/v1",
)

completion = client.chat.completions.create(
    model="${modelId}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "${PROMPTS.text}"}],
)

print(completion.choices[0].message.content)`
}

const tsCode = (kind: ModelKind, protocol: Protocol, modelId: string) => {
  const fields = bodyFields(kind, modelId)
    .map(([k, v]) => `  ${k}: ${v},`)
    .join('\n')
  if (kind === 'video') {
    const nested = bodyFields(kind, modelId)
      .map(([k, v]) => `    ${k}: ${v},`)
      .join('\n')
    return `const resp = await fetch("${BASE_URL}/v1/videos/generations", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.${KEY_ENV},
    "content-type": "application/json",
  },
  body: JSON.stringify({
${nested}
  }),
});

console.log(await resp.json());`
  }
  if (protocol === 'anthropic') {
    return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.${KEY_ENV},
  baseURL: "${BASE_URL}",
});

const message = await client.messages.create({
${fields}
});

console.log(message.content[0].text);`
  }
  const call = kind === 'image' ? 'client.images.generate' : 'client.chat.completions.create'
  const result = kind === 'image' ? 'image.data[0].url' : 'completion.choices[0].message.content'
  return `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.${KEY_ENV},
  baseURL: "${BASE_URL}/v1",
});

const ${kind === 'image' ? 'image' : 'completion'} = await ${call}({
${fields}
});

console.log(${result});`
}

const jsCode = (kind: ModelKind, protocol: Protocol, modelId: string) => {
  const headers =
    protocol === 'anthropic'
      ? `    "x-api-key": process.env.${KEY_ENV},\n    "anthropic-version": "${ANTHROPIC_VERSION}",\n    "content-type": "application/json",`
      : `    Authorization: "Bearer " + process.env.${KEY_ENV},\n    "content-type": "application/json",`
  const body = bodyFields(kind, modelId)
    .map(([k, v]) => `    ${k}: ${v},`)
    .join('\n')
  const output =
    kind === 'video' ? 'data' : kind === 'image' ? 'data.data[0].url' : protocol === 'anthropic' ? 'data.content[0].text' : 'data.choices[0].message.content'
  return `const res = await fetch("${BASE_URL}${pathOf(kind, protocol)}", {
  method: "POST",
  headers: {
${headers}
  },
  body: JSON.stringify({
${body}
  }),
});

const data = await res.json();
console.log(${output});`
}

const buildSnippet = (kind: ModelKind, protocol: Protocol, lang: Lang, modelId: string) => {
  if (lang === 'cURL') return curlCode(kind, protocol, modelId)
  if (lang === 'Python') return pythonCode(kind, protocol, modelId)
  if (lang === 'TypeScript') return tsCode(kind, protocol, modelId)
  return jsCode(kind, protocol, modelId)
}

/** 代码块：等宽字体 + 右上角复制，长行内部横向滚动 */
function CodeBlock({ code }: { code: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      message.success('已复制')
    } catch {
      message.error('复制失败')
    }
  }
  return (
    <div style={{ position: 'relative', border: '1px solid #eef0f4', borderRadius: 10, background: '#fff', padding: '16px 48px 16px 16px' }}>
      <Tooltip title="复制">
        <CopyOutlined style={{ position: 'absolute', top: 16, right: 16, fontSize: 16, color: '#86909c', cursor: 'pointer' }} onClick={copy} />
      </Tooltip>
      <pre style={{ margin: 0, overflowX: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13, lineHeight: '22px', color: '#1d2129' }}>
        {code}
      </pre>
    </div>
  )
}

/** 价格单元格统一用主色展示 */
const priceCell = (value: string) => <span style={{ color: '#2f6bff', fontSize: 14, fontWeight: 500 }}>{value}</span>

/** 详情左右两栏统一行高，保证「模型信息」与「支持的功能」逐行对齐 */
const detailRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  height: 50,
  borderBottom: '1px solid #eef0f4',
}

/** 分档定价下方的使用引导：选档位 》看所属分组 》在 API Key 关联分组 》开始使用 */
const TIER_USAGE_GUIDE =
  '您需要：选择需要的模型档位 》查看档位所属分组（或添加到您的自定义分组） 》在 API Key 中关联分组 》开始使用模型'

/** 分档定价来源：一个档位对应一种倍率，档位名取模型 API 配置上的「倍率名称」 */
type RateTier = {
  id: string
  name: string
  rate: number
  /** 该倍率配置在渠道上的运行指标：状态、24h 访问成功率（%）、24h 平均延迟（s）、24h 平均吞吐（t/s）、24h 缓存命中率（%） */
  status: ModelPerfStatus
  successRate: number
  latency: number
  throughput: number
  /** 24h 缓存命中率，百分比数值：命中缓存的输入 Token ÷ 输入 Token 总量 */
  cacheHit: number
  /** 查看性能详情所需的渠道模型数据 */
  perfModel: ChannelModelItem
  /** 是否对应后台真实存在的倍率配置（兜底的「默认倍率」没有配置可加入分组） */
  configurable: boolean
}

/** 后台模型只有名称，价格与详情取自模型广场数据，按名称回查；查不到即为「无详情」 */
const plazaOf = (name: string): PlazaModel | undefined => MODELS.find((item) => item.name === name)

/** 把一条 API 配置换算成档位：状态 / 延迟 / 吞吐取该配置在渠道上的模型性能 */
const tierOfConfig = (modelName: string, cfg: ModelApiConfig): RateTier => {
  const name = cfg.multiplierName?.trim() || '默认倍率'
  const perfModel: ChannelModelItem = {
    id: cfg.id,
    modelName: `${modelName} / ${name}`,
    channelId: cfg.channelId,
    credentialId: cfg.credentialId,
    modelCode: cfg.modelCode,
    endpoints: cfg.endpointMappings,
    operator: '',
    createdAt: '',
  }
  const perf = channelModelPerf(perfModel)
  return {
    id: cfg.id,
    name,
    rate: cfg.modelMultiplier ?? 1,
    status: perf.status,
    successRate: perf.successRate24h,
    latency: perf.latency,
    throughput: perf.throughput,
    cacheHit: perf.cacheHit ?? 0,
    perfModel,
    configurable: true,
  }
}

/** 后台未配置任何倍率时的兜底档位，按 1x 计，仅供查看性能 */
const fallbackTier = (modelName: string): RateTier => {
  const perfModel: ChannelModelItem = {
    id: 'default',
    modelName: `${modelName} / 默认倍率`,
    channelId: '',
    modelCode: '',
    endpoints: [],
    operator: '',
    createdAt: '',
  }
  const perf = channelModelPerf(perfModel)
  return {
    id: perfModel.id,
    name: '默认倍率',
    rate: 1,
    status: perf.status,
    successRate: perf.successRate24h,
    latency: perf.latency,
    throughput: perf.throughput,
    cacheHit: perf.cacheHit ?? 0,
    perfModel,
    configurable: false,
  }
}

/**
 * 某个广场模型的档位列表：一档一倍率，取后台该模型的 API 配置，档位名用「倍率名称」；
 * 后台查不到该模型或未配置倍率时，兜底一条「默认倍率」（1x）。
 */
const rateTiersOf = (plazaName: string, models: ModelItem[]): RateTier[] => {
  const backend = models.find((item) => item.name === plazaName)
  const seen = new Set<string>()
  const tiers: RateTier[] = []
  ;(backend?.apiConfigs ?? []).forEach((cfg) => {
    const label = cfg.multiplierName?.trim() || '默认倍率'
    if (seen.has(label)) return
    seen.add(label)
    tiers.push(tierOfConfig(plazaName, cfg))
  })
  return tiers.length ? tiers : [fallbackTier(plazaName)]
}

/**
 * 分档定价行：一个「档位 × 阶梯」一行。
 * 档位、倍率、成功率、延迟、吞吐、缓存命中率、操作属于档位级信息，跨阶梯合并为一格（span 首行为组行数、其余为 0）；
 * Token 范围与价格列按阶梯逐行展示。
 */
type TierPriceRow = {
  key: string
  tier: string
  rate: number
  /** 档位级单元格的纵向合并行数 */
  span: number
  /** 该行的档位元信息 */
  meta: RateTier
  /** 文本模型：Token 区间与各档价格 */
  range?: string
  input?: string
  output?: string
  cache?: string
  cacheWrite?: string
  cacheRead?: string
  /** 图像 / 视频模型：计费项与价格 */
  item?: string
  price?: string
}

/** 按倍率换算价格文案：只替换其中的数值，保留「¥」「/Mt」「/张」等前后缀 */
const scalePrice = (value: string, rate: number) =>
  value.replace(/[\d.]+/, (num) => `${Number((Number(num) * rate).toFixed(6))}`)

const scaleTier = (tier: PriceTier, rate: number): Omit<PriceTier, 'range'> => ({
  input: scalePrice(tier.input, rate),
  output: scalePrice(tier.output, rate),
  cache: scalePrice(tier.cache, rate),
  cacheWrite: scalePrice(tier.cacheWrite, rate),
  cacheRead: scalePrice(tier.cacheRead, rate),
})

type DetailTab = 'overview' | 'access'

/**
 * 成功率单元格：近 24 小时逐小时成功率柱状微图 + 汇总百分比。
 * 柱子高度按该档位自身的高低区间归一化（5~18px），避免成功率集中在 99% 上下时看不出波动；
 * 颜色口径与性能明细一致：≥ 99% 绿、≥ 80% 橙、其余红，无流量的小时置灰。
 */
function SuccessRateCell({ value, bars }: { value: number; bars: number[] }) {
  const { token } = theme.useToken()
  const tone = (v: number) =>
    v >= PERF_NORMAL_RATE_THRESHOLD
      ? token.colorSuccess
      : v >= PERF_WARN_RATE_THRESHOLD
        ? token.colorWarning
        : token.colorError
  const floor = bars.length ? Math.min(...bars) : 0
  const ceil = bars.length ? Math.max(...bars) : 0
  const spread = ceil - floor
  const height = (v: number) => (v <= 0 ? 5 : spread > 0 ? 5 + ((v - floor) / spread) * 13 : 18)
  return (
    <Tooltip
      title={`近 24 小时逐小时访问成功率（${bars.length} 根柱子），≥ ${PERF_NORMAL_RATE_THRESHOLD}% 为正常`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 6, cursor: 'default' }}>
        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1, height: 18 }}>
          {bars.map((v, i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: 3,
                height: height(v),
                borderRadius: 1.5,
                background: v > 0 ? tone(v) : token.colorSplit,
              }}
            />
          ))}
        </span>
        <span style={{ color: tone(value), fontWeight: 600, whiteSpace: 'nowrap' }}>
          {value.toFixed(1)}%
        </span>
      </span>
    </Tooltip>
  )
}

/**
 * 成功率纯文本：只展示百分比数字，按阈值着色（≥ 99% 绿、≥ 80% 橙、其余红），用于不需要趋势微图的紧凑列表。
 */
function SuccessRateText({ value }: { value: number }) {
  const { token } = theme.useToken()
  const color =
    value >= PERF_NORMAL_RATE_THRESHOLD
      ? token.colorSuccess
      : value >= PERF_WARN_RATE_THRESHOLD
        ? token.colorWarning
        : token.colorError
  return <Text style={{ color, fontWeight: 600 }}>{value.toFixed(1)}%</Text>
}

function ModelDetail({
  model,
  rateTiers,
  onGoMyGroups,
}: {
  model: PlazaModel
  rateTiers: RateTier[]
  /** 无自定义分组时，从「加入分组」弹窗跳转到「模型分组」 */
  onGoMyGroups: () => void
}) {
  const detail = useMemo(() => deriveDetail(model), [model])
  const { channels } = useChannels()
  const { models } = useModels()
  const { modelGroups, addModelGroupConfig } = useModelGroups()
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>(INITIAL_API_KEYS)
  const [revealed, setRevealed] = useState(false)
  const [tab, setTab] = useState<DetailTab>('overview')
  const [protocol, setProtocol] = useState<Protocol>('anthropic')
  const [lang, setLang] = useState<Lang>('cURL')
  /** 查看性能详情：当前选中的档位 */
  const [perfTier, setPerfTier] = useState<RateTier | null>(null)
  /** 加入分组：当前选中的档位与待加入的用户自定义分组 */
  const [groupTier, setGroupTier] = useState<RateTier | null>(null)
  const [pickedGroup, setPickedGroup] = useState<string>()
  const rootRef = useRef<HTMLDivElement>(null)
  /** 成功率柱状微图数据：逐档位取近 24 小时逐小时成功率，与「查看性能」弹窗的趋势完全同源 */
  const tierSuccessBars = useMemo(
    () =>
      new Map(
        rateTiers.map((t) => [
          t.id,
          buildModelPerformance(t.perfModel, channels).availabilityTrend.map((p) => p.value),
        ]),
      ),
    [rateTiers, channels],
  )

  /** 图像 / 视频模型没有 Anthropic 风格的消息接口，只保留 OpenAI 兼容协议 */
  const kind = kindOf(model)
  const protocols: Protocol[] = kind === 'text' ? PROTOCOLS : ['openai']
  const activeProtocol: Protocol = protocols.includes(protocol) ? protocol : protocols[0]
  const snippet = useMemo(() => buildSnippet(kind, activeProtocol, lang, model.id), [kind, activeProtocol, lang, model.id])

  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: 'start' })
  }, [])

  const createKey = () => {
    const index = apiKeys.length
    const now = dayjs()
    setApiKeys([
      ...apiKeys,
      { id: `key-${now.valueOf()}`, name: `api-key-${index}`, key: buildApiKey(index), createdAt: now.format('YYYY-MM-DD HH:mm:ss'), expire: '永久', groupId: DEFAULT_MODEL_GROUP_ID },
    ])
    message.success('API Key 已创建')
  }

  /** 分档定价：每个档位一种倍率，档位内逐条阶梯把基础价格乘以该倍率，档位级信息跨阶梯合并 */
  const tierRows = useMemo<TierPriceRow[]>(() => {
    const rows: TierPriceRow[] = []
    const tiers = detail.priceTiers
    const items = detail.priceRows ?? []
    rateTiers.forEach((tier) => {
      if (tiers) {
        tiers.forEach((price, index) => {
          rows.push({
            key: `${tier.id}-${index}`,
            tier: tier.name,
            rate: tier.rate,
            meta: tier,
            span: index === 0 ? tiers.length : 0,
            range: price.range,
            ...scaleTier(price, tier.rate),
          })
        })
      } else {
        items.forEach((item, index) => {
          rows.push({
            key: `${tier.id}-${index}`,
            tier: tier.name,
            rate: tier.rate,
            meta: tier,
            span: index === 0 ? items.length : 0,
            item: item.label,
            price: scalePrice(item.value, tier.rate),
          })
        })
      }
    })
    return rows
  }, [detail, rateTiers])

  /** 倍率命中的分组名：用于「所属分组」列展示与操作列提示，一条倍率可属于多个分组；官方分组另有「default」标签，此处只列用户自建分组 */
  const groupNamesOf = (configId: string) =>
    modelGroups
      .filter((group) => group.groupType === 'custom' && (group.configIds ?? []).includes(configId))
      .map((group) => group.name)

  const submitGroup = () => {
    if (!groupTier || !pickedGroup) return
    try {
      addModelGroupConfig(pickedGroup, groupTier.id)
      message.success(`已加入分组「${modelGroups.find((group) => group.id === pickedGroup)?.name ?? ''}」`)
      setGroupTier(null)
      setPickedGroup(undefined)
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  /** 档位级列：跨阶梯合并为一格；价格列不合并，按阶梯逐行展示 */
  const tierMetaColumns: ColumnsType<TierPriceRow> = [
    {
      title: '档位',
      dataIndex: 'tier',
      align: 'center',
      width: 104,
      onCell: (row) => ({ rowSpan: row.span }),
    },
    {
      title: '模型倍率',
      dataIndex: 'rate',
      align: 'center',
      width: 78,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (value: number) => `${value}x`,
    },
    {
      title: '成功率',
      key: 'successRate',
      align: 'center',
      width: 152,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => (
        <SuccessRateCell value={row.meta.successRate} bars={tierSuccessBars.get(row.meta.id) ?? []} />
      ),
    },
    {
      title: '延迟(s)',
      key: 'latency',
      align: 'center',
      width: 72,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => row.meta.latency.toFixed(2),
    },
    {
      title: '吞吐(t/s)',
      key: 'throughput',
      align: 'center',
      width: 78,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => row.meta.throughput.toFixed(1),
    },
    {
      title: '缓存命中率',
      key: 'cacheHit',
      align: 'center',
      width: 96,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => `${row.meta.cacheHit.toFixed(1)}%`,
    },
  ]

  /**
   * 所属分组：档位级信息，跨阶梯合并，固定在表格右侧不随横向滚动移动。
   * 官方 default 分组恒定存在（橙色，悬浮提示「官方分组」）；
   * 用户自己创建的分组（蓝色）展示分组名称，悬浮提示「自建分组」，一条倍率可归属多个分组。
   */
  const tierGroupColumn: ColumnsType<TierPriceRow>[number] = {
    title: '所属分组',
    key: 'groups',
    align: 'center',
    width: 180,
    fixed: 'right',
    onCell: (row) => ({ rowSpan: row.span }),
    render: (_, row) => {
      const names = groupNamesOf(row.meta.id)
      return (
        <Space size={[4, 4]} wrap style={{ justifyContent: 'center' }}>
          <Tooltip title="官方分组">
            <Tag color="orange" style={{ marginInlineEnd: 0 }}>
              default
            </Tag>
          </Tooltip>
          {names.map((name) => (
            <Tooltip key={name} title="自建分组">
              <Tag
                color="blue"
                style={{
                  marginInlineEnd: 0,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'middle',
                }}
              >
                {name}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      )
    },
  }

  const tierActionColumn: ColumnsType<TierPriceRow>[number] = {
    title: '操作',
    key: 'action',
    align: 'center',
    width: 128,
    fixed: 'right',
    onCell: (row) => ({ rowSpan: row.span }),
    render: (_, row) => (
      <Space size={8} style={{ whiteSpace: 'nowrap' }}>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: 'auto' }}
          onClick={() => setPerfTier(row.meta)}
        >
          查看性能
        </Button>
        {row.meta.configurable && (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: 'auto' }}
            onClick={() => {
              setPickedGroup(undefined)
              setGroupTier(row.meta)
            }}
          >
            加入分组
          </Button>
        )}
      </Space>
    ),
  }

  /**
   * 可加入的分组：与「模型分组 › 我的分组」同口径，只列当前账号自己创建的用户自定义分组。
   * 同一模型只能有一个档位进组，已被该模型其他档位占用的分组置灰不可选，并提示占用的档位名称。
   */
  const customGroupOptions = modelGroups
    .filter(
      (group) =>
        group.groupType === 'custom' && group.owner?.accountId === CURRENT_CONSOLE_USER.accountId,
    )
    .map((group) => {
      const members = group.configIds ?? []
      const joined = groupTier ? members.includes(groupTier.id) : false
      const conflict =
        groupTier && !joined ? findTierConflict(models, groupTier.id, members) : undefined
      const label = joined
        ? `${group.name}（已加入）`
        : conflict
          ? `${group.name}（${conflict.multiplierName}已加入）`
          : group.name
      return { value: group.id, label, disabled: joined || !!conflict, conflict }
    })

  /** 因同模型其他档位占用而不可选的分组，用于选择框的缺省提示文案 */
  const blockedGroupNames = customGroupOptions
    .filter((option) => option.conflict)
    .map((option) => option.label.replace(/（.*）$/, ''))

  const detailTabs = [
    {
      key: 'overview',
      label: '信息概览',
      children: (
        <div style={{ paddingTop: 4 }}>
          {/* 顶部两栏：模型信息 + 支持的功能并列，宽度不足时自动换行；下方价格表格通栏铺满整个内容区 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 40 }}>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <SectionTitle>模型信息</SectionTitle>
              {detail.infoRows.map((row) => (
                <div key={row.label} style={detailRow}>
                  <span style={{ fontSize: 14, color: '#4e5969' }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1d2129' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ flex: '0 0 320px' }}>
              <SectionTitle>支持的功能</SectionTitle>
              {detail.features.map((f) => (
                <div key={f} style={detailRow}>
                  <span style={{ fontSize: 14, color: '#1d2129' }}>{f}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1d2129' }}>
                    <CheckOutlined />
                    支持
                  </span>
                </div>
              ))}
            </div>
          </div>

          <SectionTitle top={28}>基础价格</SectionTitle>
          {detail.priceTiers ? (
            <Table
              rowKey="range"
              size="small"
              pagination={false}
              tableLayout="fixed"
              dataSource={detail.priceTiers}
              columns={[
                { title: 'Token 范围', dataIndex: 'range', align: 'center', width: 124 },
                { title: '输入价格', dataIndex: 'input', align: 'center', render: priceCell },
                { title: '输出价格', dataIndex: 'output', align: 'center', render: priceCell },
                { title: '缓存价格', dataIndex: 'cache', align: 'center', render: priceCell },
                { title: '显式缓存创建', dataIndex: 'cacheWrite', align: 'center', render: priceCell },
                { title: '显式缓存读取', dataIndex: 'cacheRead', align: 'center', render: priceCell },
              ]}
            />
          ) : (
            <Table
              rowKey="label"
              size="small"
              pagination={false}
              tableLayout="fixed"
              dataSource={detail.priceRows ?? []}
              columns={[
                { title: '计费项', dataIndex: 'label', align: 'center' },
                { title: '价格', dataIndex: 'value', align: 'center', render: priceCell },
              ]}
            />
          )}
          <div style={{ marginTop: 10, fontSize: 13, color: '#86909c' }}>单位：{detail.unit}</div>

          <SectionTitle top={28}>
            分档定价
            <RequirementDot
              title="模型详情 · 分档定价"
              sections={[
                {
                  label: '',
                  items: [
                    '1.倍率信息展示如图。按照倍率由小到大展示。分档的价格=基础价格×倍率。',
                    '2.展示不同渠道模型下的性能指标；具体如图；算法同后台。',
                    '3.展示不同的分组，官方橙色、自定义蓝色。',
                    '4.支持查看性能，如图；算法同后台。',
                    '5.点击加入分组，展示用户自定义分组。注意，一个分组只能添加1个模型的1个倍率；已添加后，其他倍率加入时，展示「xx已加入分组」。',
                  ],
                },
              ]}
            />
          </SectionTitle>
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message={TIER_USAGE_GUIDE} />
          {detail.priceTiers ? (
            <Table
              rowKey="key"
              size="small"
              pagination={false}
              tableLayout="fixed"
              scroll={{ x: 'max-content' }}
              dataSource={tierRows}
              columns={[
                ...tierMetaColumns,
                { title: 'Token 范围', dataIndex: 'range', align: 'center', width: 124 },
                { title: '输入价格', dataIndex: 'input', align: 'center', width: 92, render: priceCell },
                { title: '输出价格', dataIndex: 'output', align: 'center', width: 92, render: priceCell },
                { title: '缓存价格', dataIndex: 'cache', align: 'center', width: 92, render: priceCell },
                { title: '显式缓存创建', dataIndex: 'cacheWrite', align: 'center', width: 104, render: priceCell },
                { title: '显式缓存读取', dataIndex: 'cacheRead', align: 'center', width: 104, render: priceCell },
                tierGroupColumn,
                tierActionColumn,
              ]}
            />
          ) : (
            <Table
              rowKey="key"
              size="small"
              pagination={false}
              tableLayout="fixed"
              scroll={{ x: 'max-content' }}
              dataSource={tierRows}
              columns={[
                ...tierMetaColumns,
                { title: '计费项', dataIndex: 'item', align: 'center' },
                { title: '价格', dataIndex: 'price', align: 'center', render: priceCell },
                tierGroupColumn,
                tierActionColumn,
              ]}
            />
          )}

          <div style={{ marginTop: 24, padding: '16px 20px', background: '#f7f8fa', border: '1px solid #eef0f4', borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d2129' }}>模型提供方</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#4e5969' }}>{model.vendor}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'access',
      label: (
        <Space size={6}>
          接入示例
          <RequirementDot
            title="模型详情 · 接入示例"
            sections={[
              {
                label: '',
                items: [
                  '1.页面各项同以往。',
                  '2.API KEY 中增加分组信息，鼠标点击后展示组内模型信息（文本的直接展示价格，其他模型展示「查看价格」，点击新开页面转到模型详情查看）。',
                ],
              },
            ]}
          />
        </Space>
      ),
      children: (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 40, paddingTop: 4 }}>
          {/* 左主栏 */}
          <div style={{ flex: '1 1 520px', minWidth: 0 }}>
            <SectionTitle>调用示例</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1d2129' }}>API KEY</span>
              <Button type="primary" style={{ background: '#1d2129', borderColor: '#1d2129' }} icon={<PlusOutlined />} onClick={createKey}>
                创建 API Key
              </Button>
            </div>
            <Table
              rowKey="key"
              pagination={false}
              dataSource={apiKeys}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: '名称', dataIndex: 'name', align: 'center' },
                {
                  title: '分组名称',
                  key: 'group',
                  align: 'center',
                  render: (_, row) => <ApiKeyGroupCell groupId={row.groupId} groups={modelGroups} models={models} />,
                },
                {
                  title: 'API KEY',
                  dataIndex: 'key',
                  align: 'center',
                  render: (value: string) => (
                    <Space size={6}>
                      <span style={{ fontSize: 13, color: '#1d2129' }}>{revealed ? value : maskSecret(value)}</span>
                      <Tooltip title={revealed ? '隐藏' : '显示'}>
                        {revealed ? (
                          <EyeInvisibleOutlined style={{ color: '#86909c', cursor: 'pointer' }} onClick={() => setRevealed(false)} />
                        ) : (
                          <EyeOutlined style={{ color: '#86909c', cursor: 'pointer' }} onClick={() => setRevealed(true)} />
                        )}
                      </Tooltip>
                    </Space>
                  ),
                },
                { title: '有效期', dataIndex: 'expire', align: 'center' },
              ]}
            />

            {/* 协议 + 语言切换 + 代码块 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '24px 0 12px' }}>
              <Segmented
                value={activeProtocol}
                onChange={(value) => setProtocol(value as Protocol)}
                options={protocols}
                style={{ background: '#fff', border: '1px solid #e5e6eb', borderRadius: 8, padding: 2 }}
              />
              <Segmented value={lang} onChange={(value) => setLang(value as Lang)} options={LANGS} />
            </div>
            <CodeBlock code={snippet} />
          </div>

          {/* 右侧栏 */}
          <div style={{ flex: '0 1 320px', minWidth: 260 }}>
            <SectionTitle>API 接入指南</SectionTitle>
            <div style={{ paddingBottom: 14, borderBottom: '1px solid #eef0f4' }}>
              <div style={{ fontSize: 13, color: '#86909c', marginBottom: 6 }}>Base URL：</div>
              <CopyLine text={BASE_URL} accent />
            </div>
            <div style={{ padding: '14px 0', borderBottom: '1px solid #eef0f4' }}>
              <div style={{ fontSize: 13, color: '#86909c', marginBottom: 6 }}>API Endpoints：</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.endpoints.map((ep) => (
                  <CopyLine key={ep} text={ep} />
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 0', borderBottom: '1px solid #eef0f4' }}>
              <div style={{ fontSize: 13, color: '#86909c', marginBottom: 6 }}>Model ID：</div>
              <CopyLine text={model.id} />
            </div>

            <SectionTitle top={28}>Rate Limits</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#86909c' }}>
                您当前可用额度为 <span style={{ color: '#1d2129', fontWeight: 600 }}>{CURRENT_LEVEL}</span>
              </span>
              <Button type="primary" size="small" onClick={() => message.info('配额申请请在「配额管理」中提交，当前原型未实现')}>
                申请配额
              </Button>
            </div>
            <Table
              rowKey="level"
              size="small"
              pagination={false}
              dataSource={RATE_LEVELS}
              onRow={(record) => ({ style: { background: record.level === CURRENT_LEVEL ? '#f0f7ff' : undefined } })}
              columns={[
                { title: '用量级别', dataIndex: 'level', align: 'center' },
                { title: 'RPM', dataIndex: 'rpm', align: 'center' },
                { title: 'TPM', dataIndex: 'tpm', align: 'center' },
              ]}
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div ref={rootRef} style={{ minHeight: '100%', background: 'linear-gradient(180deg, #e8f0ff 0, #fff 320px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 16 }}>
          <ModelLogo text={model.name} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#1d2129', lineHeight: '40px' }}>{model.name}</div>
            <div style={{ marginTop: 8 }}>
              <span style={{ display: 'inline-block', padding: '3px 10px', fontSize: 12, color: '#4e5969', background: '#f2f3f5', borderRadius: 4 }}>
                {model.tags[1]}
              </span>
            </div>
          </div>
          <Space size={12} style={{ flexShrink: 0 }}>
            <Button onClick={() => message.info('模型对比功能规划中，当前原型未实现')}>模型对比</Button>
            <Button type="primary" onClick={() => message.info('模型体验功能规划中，当前原型未实现')}>
              立即体验
            </Button>
          </Space>
        </div>

        <div style={{ marginTop: 20, fontSize: 14, lineHeight: '24px', color: '#1d2129' }}>{model.desc}</div>

        <Tabs
          activeKey={tab}
          onChange={(key) => {
            setTab(key as DetailTab)
            rootRef.current?.scrollIntoView({ block: 'start' })
          }}
          items={detailTabs}
          style={{ marginTop: 28 }}
        />
      </div>

      <ModelPerformanceModal
        open={!!perfTier}
        model={perfTier?.perfModel ?? null}
        channels={channels}
        onClose={() => setPerfTier(null)}
        tier={
          perfTier
            ? { modelName: model.name, tierName: perfTier.name, rate: perfTier.rate }
            : undefined
        }
      />

      <Modal
        title={
          <Space size={6}>
            加入分组
            <RequirementDot
              title="模型详情 · 加入分组"
              sections={[
                {
                  label: '',
                  items: [
                    '1.入口为分档定价操作列「加入分组」，弹窗顶部回显「模型名称 · 档位 倍率」，明确本次加入的档位。',
                    '2.分组下拉仅列出当前账号自己创建的用户自定义分组，官方分组与其他账号的分组不可选。',
                    '3.一个分组只允许加入一个模型的一种倍率：该模型其他档位已占用的分组置灰不可选，选项文案回显占用档位（如「A 组（2x已加入）」），同档位已在组内显示「（已加入）」并置灰；该规则以红字常驻提示，不随冲突状态出现或消失。',
                    '4.未选择分组时「保存」禁用；保存成功提示「已加入分组「X」」，对应档位「所属分组」列即时新增蓝色自建分组标签。',
                    '5.账号下无自定义分组时不展示选择框与底部按钮，改为空态提示，点「去添加分组」跳转控制台「模型分组」。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={!!groupTier}
        centered
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !pickedGroup }}
        onOk={submitGroup}
        onCancel={() => {
          setGroupTier(null)
          setPickedGroup(undefined)
        }}
        footer={customGroupOptions.length ? undefined : null}
      >
        <div style={{ padding: '8px 0 20px', fontSize: 14, color: '#4e5969' }}>
          {model.name} · 档位
          <span style={{ marginLeft: 6, fontWeight: 600, color: '#1d2129' }}>{groupTier?.name}</span>
          <span style={{ marginLeft: 6 }}>{groupTier?.rate}x</span>
        </div>
        {customGroupOptions.length ? (
          <>
            <div style={{ marginBottom: 8, fontSize: 14, color: '#1d2129' }}>选择分组</div>
            <Select
              style={{ width: '100%' }}
              placeholder={
                blockedGroupNames.length === customGroupOptions.length
                  ? '该模型的其他档位已加入你的全部分组'
                  : '请选择要加入的用户自定义分组'
              }
              value={pickedGroup}
              options={customGroupOptions}
              onChange={(value) => setPickedGroup(value)}
            />
            {/* 规则固定说明，不随冲突状态出现/消失，避免用户在无冲突时看不到约束口径 */}
            <Text type="danger" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
              注：一个分组只允许加入一个模型的一种倍率
            </Text>
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ fontSize: 14, color: '#4e5969' }}>
                还没有用户自定义分组，请先到「模型分组」创建
              </span>
            }
          >
            <Button
              type="primary"
              onClick={() => {
                setGroupTier(null)
                setPickedGroup(undefined)
                onGoMyGroups()
              }}
            >
              去添加分组
            </Button>
          </Empty>
        )}
      </Modal>
    </div>
  )
}

/* ---------------- 模型广场 ---------------- */

function ModelPlaza({
  detailId,
  onDetailChange,
  onGoMyGroups,
}: {
  detailId: string | null
  onDetailChange: (id: string | null) => void
  onGoMyGroups: () => void
}) {
  const [keyword, setKeyword] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [vendors, setVendors] = useState<string[]>([])
  const [hoverHot, setHoverHot] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const { modelGroups } = useModelGroups()
  const { models } = useModels()
  const plazaRef = useRef<HTMLDivElement>(null)

  /** 从模型详情返回广场时，列表容器可能仍停留在详情页的滚动位置，需回到顶部 */
  useEffect(() => {
    if (!detailId) plazaRef.current?.scrollIntoView({ block: 'start' })
  }, [detailId])

  const toggleSection = (title: string) =>
    setCollapsed(collapsed.includes(title) ? collapsed.filter((t) => t !== title) : [...collapsed, title])

  /**
   * 广场模型与后台「模型分组」的关联：分组内模型以名称匹配广场模型；
   * 官方 default 分组不可维护具体模型，语义为「未归入其他分组的模型」，故兜底收录剩余广场模型。
   */
  const plazaGroups = useMemo(() => {
    const nameById = new Map(models.map((item) => [item.id, item.name]))
    const plazaIdByName = new Map(MODELS.map((item) => [item.name, item.id]))
    const visible = modelGroups.filter((group) => group.groupType === 'custom' || group.status !== 'disabled')
    const assigned = new Set<string>()
    const rest: { id: string; name: string; ids: string[] }[] = []
    visible.forEach((group) => {
      if (group.id === DEFAULT_MODEL_GROUP_ID) return
      const ids: string[] = []
      group.modelIds.forEach((id) => {
        const plazaId = plazaIdByName.get(nameById.get(id) ?? '')
        if (plazaId && !ids.includes(plazaId)) {
          ids.push(plazaId)
          assigned.add(plazaId)
        }
      })
      rest.push({ id: group.id, name: group.name, ids })
    })
    const fallback: { id: string; name: string; ids: string[] }[] = visible.some(
      (group) => group.id === DEFAULT_MODEL_GROUP_ID,
    )
      ? [
          {
            id: DEFAULT_MODEL_GROUP_ID,
            name: 'default',
            ids: MODELS.filter((item) => !assigned.has(item.id)).map((item) => item.id),
          },
        ]
      : []
    return [...fallback, ...rest]
  }, [modelGroups, models])

  /** 选中分组命中的广场模型集合（多分组取并集） */
  const groupedIds = useMemo(() => {
    const set = new Set<string>()
    plazaGroups.forEach((group) => {
      if (groups.includes(group.id)) group.ids.forEach((id) => set.add(id))
    })
    return set
  }, [groups, plazaGroups])

  /**
   * 详情「分档定价」的数据来源：当前广场模型在后台的 API 配置，一档一倍率。
   * 档位名取 API 配置的「倍率名称」，未配置或未设倍率按 1x 计；
   * 状态、延迟、吞吐取该配置落到渠道模型后的性能数据。
   */
  const rateTiers = useMemo<RateTier[]>(() => {
    if (!detailId) return []
    return rateTiersOf(MODELS.find((m) => m.id === detailId)?.name ?? '', models)
  }, [detailId, models])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return MODELS.filter((m) => {
      if (kw && !(m.name.toLowerCase().includes(kw) || m.vendor.toLowerCase().includes(kw))) return false
      if (cats.length && !m.tags.some((t) => cats.includes(t))) return false
      if (groups.length && !groupedIds.has(m.id)) return false
      if (vendors.length && !vendors.includes(m.vendor)) return false
      return true
    })
  }, [cats, groupedIds, groups, keyword, vendors])

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const filteredAny = cats.length > 0 || groups.length > 0 || vendors.length > 0 || keyword.trim() !== ''

  const resetFilter = () => {
    setKeyword('')
    setCats([])
    setGroups([])
    setVendors([])
  }

  const detailModel = detailId ? MODELS.find((m) => m.id === detailId) : undefined
  if (detailModel) {
    return <ModelDetail model={detailModel} rateTiers={rateTiers} onGoMyGroups={onGoMyGroups} />
  }

  return (
    <div ref={plazaRef} style={{ minHeight: '100%', background: 'linear-gradient(180deg, #e8f0ff 0, #fff 320px)' }}>
      <div style={{ textAlign: 'center', padding: '22px 0 20px', fontSize: 26, fontWeight: 700, color: '#1d2129' }}>模型广场</div>
      <div style={{ maxWidth: 1280, minWidth: 1000, margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
          {HOT_MODELS.map((hot) => {
            const model = MODELS.find((m) => m.id === hot.modelId)
            return (
              <div
                key={hot.modelId}
                onClick={() => {
                  if (model) onDetailChange(model.id)
                }}
                onMouseEnter={() => setHoverHot(hot.modelId)}
                onMouseLeave={() => setHoverHot(null)}
                style={{ cursor: 'pointer' }}
              >
                <img
                  src={hot.image}
                  alt={hot.title}
                  style={{
                    width: '100%',
                    height: 156,
                    objectFit: 'cover',
                    borderRadius: 8,
                    display: 'block',
                    background: '#eef0f4',
                    boxShadow: hoverHot === hot.modelId ? '0 6px 18px rgba(47, 107, 255, 0.18)' : 'none',
                    transition: 'box-shadow 0.2s',
                  }}
                />
                <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600, color: '#1d2129' }}>{hot.title}</div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: '21px',
                    color: '#86909c',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden',
                  }}
                >
                  {model?.desc}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 48 }}>
          <div
            style={{
              width: 260,
              flexShrink: 0,
              position: 'sticky',
              top: 16,
              background: '#fff',
              border: '1px solid #eef0f4',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space size={6}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1d2129' }}>筛选</span>
                <RequirementDot
                  title="模型广场 · 搜索与筛选"
                  sections={[
                    {
                      label: '',
                      items: [
                        '1.增加模型分组，优先展示官方分组，用橙色表示，其次展示自定义分组，用蓝色表示，鼠标悬浮展示官方分组、自定义分组字样。',
                        '2.点击分组，筛选到分组关联的模型。',
                        '3.分组支持多选。',
                      ],
                    },
                  ]}
                />
              </Space>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined style={{ fontSize: 12 }} />}
                disabled={!filteredAny}
                onClick={resetFilter}
                style={{ height: 'auto', padding: 0, fontSize: 13, color: '#4e5969' }}
              >
                重置
              </Button>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, lineHeight: '18px', color: '#86909c' }}>
              按模型类别、倍率、供应商分类。
            </div>

            <FilterSection title="模型类别" collapsed={collapsed.includes('类别')} onToggle={() => toggleSection('类别')}>
              <Chip label="全部" count={MODELS.length} active={cats.length === 0} onClick={() => setCats([])} />
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.label}
                  label={c.label}
                  icon={c.icon}
                  count={countByCategory(c.label)}
                  active={cats.includes(c.label)}
                  onClick={() => toggle(cats, setCats, c.label)}
                />
              ))}
            </FilterSection>

            <FilterSection title="模型分组" collapsed={collapsed.includes('分组')} onToggle={() => toggleSection('分组')}>
              <Chip label="全部分组" count={MODELS.length} active={groups.length === 0} onClick={() => setGroups([])} />
              {plazaGroups.map((group) => (
                <Chip
                  key={group.id}
                  label={group.name}
                  count={group.ids.length}
                  active={groups.includes(group.id)}
                  disabled={group.ids.length === 0}
                  onClick={() => toggle(groups, setGroups, group.id)}
                />
              ))}
            </FilterSection>

            <FilterSection title="模型供应商" collapsed={collapsed.includes('供应商')} onToggle={() => toggleSection('供应商')}>
              <Chip label="全部" count={MODELS.length} active={vendors.length === 0} onClick={() => setVendors([])} />
              {VENDORS.map((v) => (
                <Chip
                  key={v}
                  label={v}
                  count={countByVendor(v)}
                  active={vendors.includes(v)}
                  onClick={() => toggle(vendors, setVendors, v)}
                />
              ))}
            </FilterSection>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <span style={{ flexShrink: 0, fontSize: 16, fontWeight: 600, color: '#1d2129', whiteSpace: 'nowrap' }}>
                模型 {filtered.length} 个
              </span>
              <RequirementDot
                title="模型广场 · 模型列表"
                sections={[
                  {
                    label: '',
                    items: ['搜索框移动到列表上。其他不变。'],
                  },
                ]}
              />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                allowClear
                placeholder="搜索模型名称"
                prefix={<SearchOutlined style={{ color: '#86909c' }} />}
                style={{ flex: 1, minWidth: 0, maxWidth: 560, height: 40, borderRadius: 6 }}
              />
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Empty description="未找到匹配的模型，请调整搜索或筛选条件" />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {filtered.map((m) => (
                  <ModelCard key={m.id} model={m} onOpen={() => onDetailChange(m.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 分组倍率明细（API Key 分组悬浮卡与模型分组共用） ---------------- */

/** 分组内已引用的倍率明细：由 configId 回查模型名称、倍率名称、倍率与渠道 */
type GroupRate = { configId: string; modelName: string; name: string; rate: number; channel: string }

/**
 * 分组内的倍率明细：用户自定义分组取勾选的 API 配置（按加入顺序）；
 * 官方分组与管理后台「组内模型信息」同口径：只展开组内模型的倍率，未指定组内模型时视为覆盖全部模型
 * （即系统内置的 default 兜底分组，与分档定价的所属分组一致）。
 */
const groupRatesOf = (
  group: ModelGroup,
  models: ModelItem[],
  channelName: (channelId: string) => string = () => '—',
): GroupRate[] => {
  const resolve = (configId: string): GroupRate[] => {
    const model = models.find((item) => (item.apiConfigs ?? []).some((cfg) => cfg.id === configId))
    const cfg = model?.apiConfigs?.find((item) => item.id === configId)
    if (!model || !cfg) return []
    return [
      {
        configId,
        modelName: model.name,
        name: cfg.multiplierName?.trim() || '默认倍率',
        rate: cfg.modelMultiplier ?? 1,
        channel: channelName(cfg.channelId),
      },
    ]
  }
  if (group.groupType === 'custom') return (group.configIds ?? []).flatMap(resolve)
  const scoped = group.modelIds.length
    ? group.modelIds.flatMap((id) => models.find((model) => model.id === id)?.apiConfigs ?? [])
    : models.flatMap((model) => model.apiConfigs ?? [])
  const picked = new Set(group.configIds ?? [])
  return (picked.size ? scoped.filter((cfg) => picked.has(cfg.id)) : scoped)
    .map((cfg) => cfg.id)
    .flatMap(resolve)
}

/** 一条倍率的价格详情：在模型广场基础价上按倍率换算，阶梯定价按 Token 区间逐行列出 */
const ratePriceDetail = (modelName: string, rate: number): { unit: string; lines: string[] } | null => {
  const plaza = plazaOf(modelName)
  if (!plaza) return null
  const detail = deriveDetail(plaza)
  const lines = detail.priceTiers
    ? detail.priceTiers.map((tier) => {
        const scaled = scaleTier(tier, rate)
        return `${tier.range}｜输入 ${scaled.input} · 输出 ${scaled.output} · 缓存 ${scaled.cache}`
      })
    : (detail.priceRows ?? []).map((row) => `${row.label}｜${scalePrice(row.value, rate)}`)
  return { unit: detail.unit, lines }
}

/** 悬浮卡数据行：倍率明细 + 按倍率换算后的价格详情 */
type RateRow = GroupRate & { price: { unit: string; lines: string[] } | null }

/** 悬浮卡内的倍率明细表：模型名称、倍率名称、倍率、模型价格详情 */
function RateDetailTable({ rows }: { rows: RateRow[] }) {
  return (
    <Table
      size="small"
      rowKey="configId"
      pagination={false}
      tableLayout="fixed"
      dataSource={rows}
      scroll={{ y: 260 }}
      columns={[
        { title: '模型名称', dataIndex: 'modelName', width: 148, ellipsis: true },
        { title: '倍率名称', dataIndex: 'name', width: 100, ellipsis: true },
        { title: '倍率', dataIndex: 'rate', width: 56, align: 'center', render: (v: number) => `${v}x` },
        {
          title: '模型价格详情',
          key: 'price',
          render: (_, row) =>
            row.price?.lines.length ? (
              <Space direction="vertical" size={0}>
                {row.price.lines.map((line) => (
                  <Text key={line} style={{ fontSize: 12 }}>
                    {line}
                  </Text>
                ))}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  单位：{row.price.unit}
                </Text>
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
      ]}
    />
  )
}

/** 分组名称悬浮卡：逐条列出组内倍率的模型名称、倍率名称、倍率与模型价格详情 */
function GroupRatePopover({ group, models }: { group: ModelGroup; models: ModelItem[] }) {
  const rows = useMemo<RateRow[]>(
    () =>
      groupRatesOf(group, models).map((rate) => ({
        ...rate,
        price: ratePriceDetail(rate.modelName, rate.rate),
      })),
    [group, models],
  )
  if (!rows.length) return <Text type="secondary">组内暂无模型倍率</Text>
  return <RateDetailTable rows={rows} />
}

/* ---------------- API Key 管理 ---------------- */

const API_KEY_NOTICE_HEAD = 'API Key 是您请求大模型服务的重要凭证。API Key 长期有效，'
const API_KEY_NOTICE_TAIL = '请您不要将密钥信息共享至公开环境，妥善保管并定期轮换密钥，避免因未经授权的使用造成安全风险或资金损失。'

const EXPIRE_OPTIONS = [
  { value: 'never', label: '永久有效' },
  { value: 'dated', label: '指定日期' },
]

type ApiKeyFormValues = { name: string; groupId: string; expireType: 'never' | 'dated'; expireDate?: Dayjs }

type ApiKeyDialog = { mode: 'create' } | { mode: 'edit'; row: ApiKeyRow }

/** 分组下拉与悬浮卡展示用的类型标记后缀 */
const groupTypeLabel = (group: ModelGroup) => (group.groupType === 'official' ? '官方分组' : '自建分组')

/** 密钥关联分组单元格：官方分组橙色、自建分组蓝色，悬浮展示组内模型倍率与价格详情 */
function ApiKeyGroupCell({ groupId, groups, models }: { groupId?: string; groups: ModelGroup[]; models: ModelItem[] }) {
  const group = groupId ? groups.find((item) => item.id === groupId) : undefined
  if (!group) return <Text type="secondary">—</Text>
  const official = group.groupType === 'official'
  return (
    <Popover
      trigger="hover"
      overlayStyle={{ width: 640 }}
      title={`${group.name}（${groupTypeLabel(group)}）`}
      content={<GroupRatePopover group={group} models={models} />}
    >
      <Tag color={official ? 'orange' : 'blue'} style={{ marginInlineEnd: 0 }}>
        {group.name}
      </Tag>
    </Popover>
  )
}

function ApiKeyManage({ keys, onChange }: { keys: ApiKeyRow[]; onChange: (keys: ApiKeyRow[]) => void }) {
  const { token } = theme.useToken()
  const { models } = useModels()
  const { modelGroups } = useModelGroups()
  const [form] = Form.useForm<ApiKeyFormValues>()
  const [dialog, setDialog] = useState<ApiKeyDialog | null>(null)
  const expireType = Form.useWatch('expireType', form)

  /** 可选分组：对外展示的官方分组 + 当前账号自建分组，单选，标签上标注分组类型 */
  const groupOptions = useMemo(
    () =>
      modelGroups
        .filter(
          (group) =>
            (group.groupType === 'official' && group.status !== 'disabled') ||
            (group.groupType === 'custom' && group.owner?.accountId === CURRENT_CONSOLE_USER.accountId),
        )
        .map((group) => ({ value: group.id, label: `${group.name}（${groupTypeLabel(group)}）` })),
    [modelGroups],
  )

  const save = async () => {
    try {
      const v = await form.validateFields()
      const expire = v.expireType === 'never' ? '永久' : `${v.expireDate?.format('YYYY-MM-DD')} 23:59:59`
      if (dialog?.mode === 'edit') {
        onChange(keys.map((row) => (row.id === dialog.row.id ? { ...row, name: v.name, groupId: v.groupId, expire } : row)))
        message.success('API 密钥已更新')
      } else {
        const now = dayjs()
        onChange([
          ...keys,
          {
            id: `ak-${now.valueOf()}`,
            name: v.name,
            key: buildApiKey(keys.length + 1),
            createdAt: now.format('YYYY-MM-DD HH:mm:ss'),
            expire,
            groupId: v.groupId,
          },
        ])
        message.success('API 密钥已创建')
      }
      setDialog(null)
    } catch {
      /* 校验失败，不处理 */
    }
  }

  const remove = (row: ApiKeyRow) => {
    onChange(keys.filter((item) => item.id !== row.id))
    message.success('已删除')
  }

  const columns: ColumnsType<ApiKeyRow> = [
    { title: '名称', dataIndex: 'name', width: 180, align: 'center', fixed: 'left' },
    {
      title: '分组名称',
      key: 'group',
      width: 200,
      align: 'center',
      render: (_, row) => <ApiKeyGroupCell groupId={row.groupId} groups={modelGroups} models={models} />,
    },
    {
      title: 'API KEY',
      dataIndex: 'key',
      width: 340,
      align: 'center',
      render: (value: string) => <SecretCell value={value} maxWidth={220} />,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 200, align: 'center' },
    { title: '到期时间', dataIndex: 'expire', width: 180, align: 'center' },
    {
      title: '操作',
      key: 'action',
      width: 110,
      align: 'center',
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setDialog({ mode: 'edit', row })} />
          </Tooltip>
          <Popconfirm
            title="确认删除该 API 密钥？"
            description="删除后，使用该密钥发起的请求将立即失败。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(row)}
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        message={
          <span>
            {API_KEY_NOTICE_HEAD}
            <span style={{ color: token.colorPrimary }}>{API_KEY_NOTICE_TAIL}</span>
          </span>
        }
      />
      <Space size={10} style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDialog({ mode: 'create' })}>
          创建 API 密钥
        </Button>
        <RequirementDot
          title="API Key 管理 · 密钥列表"
          sections={[
            {
              label: '',
              items: [
                '1.添加 API KEY 需要选择分组，必选。',
                '2.成功创建后，列表展示分组信息，鼠标点击展示组内模型信息。文本模型直接展示价格，其他模型展示「查看价格」，点击后新开页面展开模型详情查看。',
              ],
            },
          ]}
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={keys}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `共 ${t} 条记录` }}
      />
      <Modal
        title={
          <Space size={6}>
            {dialog?.mode === 'edit' ? '编辑 API 密钥' : '创建 API 密钥'}
            <RequirementDot
              title="API Key 管理 · 创建 / 编辑密钥"
              sections={[
                {
                  label: '',
                  items: [
                    '1.入口：列表右上角「创建 API 密钥」与行内「编辑」，同一弹窗，标题按新增/编辑切换。',
                    '2.名称：必填，最多 20 字，占位「请输入名称，便于识别用途」。',
                    '3.选择分组：必填、单选，可选范围为官方分组与当前账号自建分组，选项文案标注类型（如「A 组（自建分组）」），默认选中 default 分组；密钥可调用的模型与倍率由所选分组决定。',
                    '4.到期时间：必填，可选「永久有效」或「指定日期」；选「指定日期」时出现「到期日期」，不可早于当天，保存后到期时间记为该日 23:59:59。',
                    '5.弹窗居中、宽 520，按钮「取消 / 保存」；校验不通过时不关闭弹窗，保存成功提示「API 密钥已创建」「API 密钥已更新」。',
                    '6.每次打开弹窗按当前密钥重新初始化表单，不残留上一次填写内容；新建密钥由系统自动生成。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={!!dialog}
        centered
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        onCancel={() => setDialog(null)}
        onOk={save}
      >
        {/* preserve=false + initialValues：每次打开都从当前 dialog 重新初始化，避免残留上一次填写的内容 */}
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          preserve={false}
          initialValues={
            dialog?.mode === 'edit'
              ? {
                  name: dialog.row.name,
                  groupId: dialog.row.groupId ?? DEFAULT_MODEL_GROUP_ID,
                  expireType: dialog.row.expire === '永久' ? 'never' : 'dated',
                  expireDate: dialog.row.expire === '永久' ? undefined : dayjs(dialog.row.expire),
                }
              : { name: '', groupId: DEFAULT_MODEL_GROUP_ID, expireType: 'never' }
          }
        >
          <Form.Item label="名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入 API 密钥名称' }]}>
            <Input maxLength={20} placeholder="请输入名称，便于识别用途" />
          </Form.Item>
          <Form.Item label="选择分组" name="groupId" rules={[{ required: true, message: '请选择模型分组' }]}>
            <Select options={groupOptions} placeholder="请选择密钥可调用的模型分组" />
          </Form.Item>
          <Form.Item label="到期时间" name="expireType" rules={[{ required: true, message: '请选择到期时间' }]}>
            <Select options={EXPIRE_OPTIONS} />
          </Form.Item>
          {expireType === 'dated' && (
            <Form.Item label="到期日期" name="expireDate" rules={[{ required: true, message: '请选择到期日期' }]}>
              <DatePicker style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

/* ---------------- 模型分组（我的分组 / 官方分组） ---------------- */

type GroupFormValues = { name: string; description?: string }
type GroupDialog = { mode: 'create' } | { mode: 'edit'; group: ModelGroup }

/** store 抛出的业务校验统一在此处理，返回是否成功供调用方决定是否关闭弹窗 */
const runGroupAction = (action: () => void, text: string) => {
  try {
    action()
    message.success(text)
    return true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作失败')
    return false
  }
}

/** 添加模型弹窗的搜索条件：三个字段各自独立过滤，AND 组合，点击搜索才生效 */
type PickerFilters = { name: string; vendor: string; rate: string }
/** 弹窗表格行：一条「模型 × 倍率配置」，状态/延迟/吞吐取自该配置在渠道上的性能 */
type PickerRow = { model: ModelItem; config: ModelApiConfig; tier: RateTier }

const EMPTY_PICKER_FILTERS: PickerFilters = { name: '', vendor: '', rate: '' }

const PICKER_FILTER_FIELDS: { key: keyof PickerFilters; label: string; placeholder: string }[] = [
  { key: 'name', label: '模型名称', placeholder: '请输入模型名称' },
  { key: 'vendor', label: '生产商', placeholder: '请输入生产商' },
  { key: 'rate', label: '倍率', placeholder: '请输入倍率，如 2' },
]

/** 价格表格：倍率取 1 即模型基础价格，其余倍率按「基础价格 × 倍率」展示分档价格 */
function PriceTable({ detail, rate }: { detail: ModelDetailData; rate: number }) {
  if (detail.priceTiers) {
    const rows = detail.priceTiers.map((tier, index) => ({ key: index, range: tier.range, ...scaleTier(tier, rate) }))
    return (
      <Table
        rowKey="key"
        size="small"
        pagination={false}
        tableLayout="fixed"
        dataSource={rows}
        columns={[
          { title: 'Token 范围', dataIndex: 'range', align: 'center', width: 124 },
          { title: '输入价格', dataIndex: 'input', align: 'center', render: priceCell },
          { title: '输出价格', dataIndex: 'output', align: 'center', render: priceCell },
          { title: '缓存价格', dataIndex: 'cache', align: 'center', render: priceCell },
          { title: '显式缓存创建', dataIndex: 'cacheWrite', align: 'center', render: priceCell },
          { title: '显式缓存读取', dataIndex: 'cacheRead', align: 'center', render: priceCell },
        ]}
      />
    )
  }
  const rows = (detail.priceRows ?? []).map((item, index) => ({
    key: index,
    item: item.label,
    price: scalePrice(item.value, rate),
  }))
  return (
    <Table
      rowKey="key"
      size="small"
      pagination={false}
      tableLayout="fixed"
      dataSource={rows}
      columns={[
        { title: '计费项', dataIndex: 'item', align: 'center' },
        { title: '价格', dataIndex: 'price', align: 'center', render: priceCell },
      ]}
    />
  )
}

/** 模型价格弹窗：展示基础价格；倍率大于 1 时再展示该倍率的分档价格，1x 只展示基础价格 */
function ModelPriceModal({ model, tier, onClose }: { model: PlazaModel; tier: RateTier; onClose: () => void }) {
  const detail = useMemo(() => deriveDetail(model), [model])
  const scaled = tier.rate !== 1
  return (
    <Modal title="模型价格" open centered width={760} destroyOnClose footer={null} onCancel={onClose}>
      <SectionTitle top={16}>基础价格</SectionTitle>
      <PriceTable detail={detail} rate={1} />
      {scaled ? (
        <>
          <SectionTitle top={24}>分档价格 · {tier.name}（基础价格 × {tier.rate}）</SectionTitle>
          <PriceTable detail={detail} rate={tier.rate} />
        </>
      ) : (
        <div style={{ marginTop: 12, fontSize: 13, color: '#86909c' }}>当前倍率为 1x，分档价格与基础价格一致。</div>
      )}
      <div style={{ marginTop: 12, fontSize: 13, color: '#86909c' }}>单位：{detail.unit}</div>
    </Modal>
  )
}

/**
 * 添加模型弹窗内容：以「模型 × 倍率配置」为粒度挑选，支持勾选多条后一次性批量加入分组。
 * 弹窗打开时即按分组现有成员回填勾选，取消勾选并在弹窗底部「保存」后该倍率移出分组。
 */
function RatePicker({
  selected,
  onSelectChange,
}: {
  selected: string[]
  onSelectChange: (ids: string[]) => void
}) {
  const { models } = useModels()
  const [filters, setFilters] = useState<PickerFilters>(EMPTY_PICKER_FILTERS)
  const [applied, setApplied] = useState<PickerFilters>(EMPTY_PICKER_FILTERS)
  /** 查看模型价格：当前选中的「模型 × 倍率」行 */
  const [priceRow, setPriceRow] = useState<PickerRow | null>(null)

  const rows = useMemo<PickerRow[]>(() => {
    const name = applied.name.trim().toLowerCase()
    const vendor = applied.vendor.trim().toLowerCase()
    /** 倍率只按数值精确匹配，兼容输入尾缀 x，不再匹配倍率名称 */
    const rate = applied.rate.trim().toLowerCase().replace(/x$/, '')
    return models.flatMap((model) =>
      (model.apiConfigs ?? [])
        .filter((config) => {
          if (name && !model.name.toLowerCase().includes(name)) return false
          if (vendor && !model.vendor.toLowerCase().includes(vendor)) return false
          if (rate) {
            const tier = tierOfConfig(model.name, config)
            if (String(tier.rate) !== rate) return false
          }
          return true
        })
        .map((config) => ({ model, config, tier: tierOfConfig(model.name, config) })),
    )
  }, [models, applied])

  /** 价格取自模型广场的定价数据，按名称回查；查不到时该行的价格入口置空 */
  const currentPriceModel = priceRow ? plazaOf(priceRow.model.name) : undefined

  /** 同一模型只能保留一个档位：已勾选该模型的其他档位时，本行禁选并说明占用者 */
  const conflictOf = (row: PickerRow): TierConflict | undefined =>
    selected.includes(row.config.id) ? undefined : findTierConflict(models, row.config.id, selected)

  const columns: ColumnsType<PickerRow> = [
    {
      title: '模型名称',
      key: 'model',
      width: 220,
      fixed: 'left',
      render: (_, row) => <Text strong>{row.model.name}</Text>,
    },
    {
      title: '生产商',
      key: 'vendor',
      width: 130,
      render: (_, row) => row.model.vendor,
    },
    {
      title: '倍率名称',
      key: 'rateName',
      width: 140,
      render: (_, row) => {
        const conflict = conflictOf(row)
        return conflict ? (
          <Tooltip title={`同一模型只能有一个档位加入本分组，「${conflict.multiplierName}」已占用`}>
            <Text type="secondary">{row.tier.name}</Text>
          </Tooltip>
        ) : (
          row.tier.name
        )
      },
    },
    {
      title: '模型倍率',
      key: 'rate',
      width: 100,
      align: 'center',
      render: (_, row) => `${row.tier.rate}x`,
    },
    {
      title: '模型价格',
      key: 'price',
      width: 116,
      align: 'center',
      render: (_, row) =>
        plazaOf(row.model.name) ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: 'auto' }}
            onClick={() => setPriceRow(row)}
          >
            查看模型价格
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '成功率',
      key: 'successRate',
      width: 110,
      align: 'center',
      render: (_, row) => <SuccessRateText value={row.tier.successRate} />,
    },
    {
      title: '延迟(s)',
      key: 'latency',
      width: 96,
      align: 'center',
      render: (_, row) => row.tier.latency.toFixed(2),
    },
    {
      title: '吞吐(t/s)',
      key: 'throughput',
      width: 104,
      align: 'center',
      render: (_, row) => row.tier.throughput.toFixed(1),
    },
    {
      title: '缓存命中率',
      key: 'cacheHit',
      width: 110,
      align: 'center',
      render: (_, row) => `${row.tier.cacheHit.toFixed(1)}%`,
    },
  ]

  return (
    <div style={{ marginTop: 16 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        每个分组只能添加某个模型的1个档位。如default分组添加了seedance 1x 的模型，就不可以再添加 seedance 1.5x。
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {PICKER_FILTER_FIELDS.map((field) => (
          <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              {field.label}：
            </Text>
            <Input
              value={filters[field.key]}
              allowClear
              onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
              onPressEnter={() => setApplied(filters)}
              placeholder={field.placeholder}
              style={{ width: 180 }}
            />
          </div>
        ))}
        <Button type="primary" icon={<SearchOutlined />} onClick={() => setApplied(filters)}>
          搜索
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            setFilters(EMPTY_PICKER_FILTERS)
            setApplied(EMPTY_PICKER_FILTERS)
          }}
        >
          重置
        </Button>
      </div>
      <Table
        rowKey={(row) => row.config.id}
        size="small"
        columns={columns}
        dataSource={rows}
        rowSelection={{
          columnWidth: 44,
          selectedRowKeys: selected,
          /** 勾选结果跨搜索条件保留：被搜索条件过滤掉的已勾选倍率不因数据源变化而丢失 */
          preserveSelectedRowKeys: true,
          /** 同模型的其他档位在本分组内已被占用时禁选 */
          getCheckboxProps: (row) => ({ disabled: !!conflictOf(row) }),
          onChange: (keys) => onSelectChange(keys as string[]),
        }}
        scroll={{ x: 'max-content', y: 360 }}
        pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (t) => `共 ${t} 条记录` }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配的模型，请调整搜索条件" />,
        }}
      />
      {priceRow && currentPriceModel ? (
        <ModelPriceModal model={currentPriceModel} tier={priceRow.tier} onClose={() => setPriceRow(null)} />
      ) : null}
    </div>
  )
}

function MyModelGroups({ onOpenModelDetail }: { onOpenModelDetail: (model: PlazaModel) => void }) {
  const { models } = useModels()
  const { channels } = useChannels()
  const {
    modelGroups,
    addCustomGroup,
    updateCustomGroup,
    removeCustomGroup,
    removeModelGroupConfig,
    syncModelGroupConfigs,
    clearModelGroupConfigs,
  } = useModelGroups()
  const [form] = Form.useForm<GroupFormValues>()

  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  /** 页面内两个 Tab：我的分组（用户自建、可维护）/ 官方分组（后台维护、只读） */
  const [tab, setTab] = useState<'mine' | 'official'>('mine')
  const [dialog, setDialog] = useState<GroupDialog | null>(null)
  const [pickerId, setPickerId] = useState<string | null>(null)
  /** 弹窗中的勾选集合：打开时回填分组现有成员，跨搜索条件保留，保存后即为分组最终成员 */
  const [picked, setPicked] = useState<string[]>([])

  const channelMap = useMemo(() => new Map(channels.map((channel) => [channel.id, channel])), [channels])

  /** 只展示当前账号自己创建的分组，官方分组与 default 分组不在此维护 */
  const mine = useMemo(
    () =>
      modelGroups.filter(
        (group) => group.groupType === 'custom' && group.owner?.accountId === CURRENT_CONSOLE_USER.accountId,
      ),
    [modelGroups],
  )

  const ratesOf = (group: ModelGroup): GroupRate[] =>
    groupRatesOf(group, models, (channelId) => channelMap.get(channelId)?.name ?? '—')

  /** 按「模型名称」搜索：组内任意一条倍率的模型名称命中即保留该分组 */
  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase()
    if (!kw) return mine
    return mine.filter((group) => ratesOf(group).some((rate) => rate.modelName.toLowerCase().includes(kw)))
    /** 组内模型信息取自模型列表与渠道名称，两者变化时搜索结果需重算 */
  }, [mine, query, models, channelMap])

  /** 每人最多创建 10 个分组，达到上限后禁用新建入口，store 内仍有一道兜底校验 */
  const atLimit = mine.length >= MODEL_GROUP_LIMIT_PER_USER

  /** 弹窗内的分组以 store 为准，保存后成员即时刷新 */
  const pickerGroup = pickerId ? mine.find((group) => group.id === pickerId) ?? null : null

  /** 打开弹窗时把分组现有成员回填为勾选态：勾选即成员，取消勾选即移出 */
  const openPicker = (group: ModelGroup) => {
    setPicked(group.configIds ?? [])
    setPickerId(group.id)
  }

  const closePicker = () => {
    setPickerId(null)
    setPicked([])
  }

  /** 待提交的变化：新增条数与移出条数，用于控制「保存」按钮可用态与保存后的提示文案 */
  const pending = useMemo(() => {
    const joined = pickerGroup?.configIds ?? []
    return {
      added: picked.filter((id) => !joined.includes(id)).length,
      removed: joined.filter((id) => !picked.includes(id)).length,
    }
  }, [pickerGroup, picked])

  /** 保存：以弹窗勾选集合整体重写分组倍率，新增与移出一次提交 */
  const confirmPicker = () => {
    if (!pickerGroup) return
    if (!pending.added && !pending.removed) {
      closePicker()
      return
    }
    const tips = [
      pending.added ? `已添加 ${pending.added} 条` : '',
      pending.removed ? `已移出 ${pending.removed} 条` : '',
    ].filter(Boolean)
    const ok = runGroupAction(() => syncModelGroupConfigs(pickerGroup.id, picked), tips.join('，'))
    if (ok) closePicker()
  }

  const save = async () => {
    try {
      const v = await form.validateFields()
      const editing = dialog?.mode === 'edit' ? dialog.group : null
      const ok = runGroupAction(
        () =>
          editing
            ? updateCustomGroup(editing.id, { name: v.name, description: v.description })
            : addCustomGroup({ name: v.name, description: v.description }, CURRENT_CONSOLE_USER),
        editing ? '分组已更新' : '分组已创建',
      )
      if (ok) setDialog(null)
    } catch {
      /* 校验失败，不处理 */
    }
  }

  const columns: ColumnsType<ModelGroup> = [
    {
      title: '分组名称',
      dataIndex: 'name',
      width: 180,
      fixed: 'left',
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      /** 组内模型纵向排列：一条倍率占一行，便于逐条查看详情与移出 */
      title: '组内模型信息',
      key: 'models',
      width: 400,
      render: (_, group) => {
        const list = ratesOf(group)
        if (!list.length) return <Text type="secondary">—</Text>
        return (
          <Space direction="vertical" size={6} align="start" style={{ maxWidth: '100%' }}>
            {list.map((rate) => {
              const detail = plazaOf(rate.modelName)
              return (
                <Space key={rate.configId} size={2} align="center">
                  {/* 点击倍率标签展开该条倍率的价格详情列表，口径与 API Key 分组悬浮卡一致 */}
                  <Popover
                    trigger="click"
                    overlayStyle={{ width: 560 }}
                    title={group.name}
                    content={<RateDetailTable rows={[{ ...rate, price: ratePriceDetail(rate.modelName, rate.rate) }]} />}
                  >
                    <Tag color="blue" style={{ marginInlineEnd: 0, cursor: 'pointer' }}>
                      {rate.modelName} / {rate.name} · {rate.rate}x
                    </Tag>
                  </Popover>
                  {/* 禁用态按钮不响应鼠标事件，外层 span 承接 hover 才能弹出提示 */}
                  <Tooltip title={detail ? '查看详情' : '该模型暂无详情数据'}>
                    <span style={{ display: 'inline-flex' }}>
                      <Button
                        type="text"
                        size="small"
                        disabled={!detail}
                        icon={<EyeOutlined />}
                        style={{ padding: '0 4px', height: 22 }}
                        onClick={() => {
                          if (detail) onOpenModelDetail(detail)
                        }}
                      />
                    </span>
                  </Tooltip>
                  {/* Tooltip 挂外层 span、Popconfirm 接管点击，避免两个浮层争抢同一子元素 */}
                  <Tooltip title="移出分组">
                    <span style={{ display: 'inline-flex' }}>
                      <Popconfirm
                        title="是否确认删除？"
                        okText="确认移除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() =>
                          runGroupAction(
                            () => removeModelGroupConfig(group.id, rate.configId),
                            `已移出「${rate.modelName} · ${rate.name}」`,
                          )
                        }
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ padding: '0 4px', height: 22 }}
                        />
                      </Popconfirm>
                    </span>
                  </Tooltip>
                </Space>
              )
            })}
          </Space>
        )
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 170,
      ellipsis: true,
      render: (value?: string) => (value ? <Tooltip title={value}>{value}</Tooltip> : <Text type="secondary">—</Text>),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      align: 'center',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      align: 'center',
      fixed: 'right',
      render: (_, group) => {
        const count = ratesOf(group).length
        return (
          <Space size={12}>
            <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={() => openPicker(group)}>
              添加模型
            </Button>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: 'auto' }}
              onClick={() => setDialog({ mode: 'edit', group })}
            >
              编辑
            </Button>
            <Popconfirm
              title="是否确认清空组内模型？"
              okText="清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => runGroupAction(() => clearModelGroupConfigs(group.id), '组内模型已清空')}
            >
              <Button
                type="link"
                size="small"
                danger
                disabled={!count}
                style={{ padding: 0, height: 'auto' }}
              >
                清空组内模型
              </Button>
            </Popconfirm>
            <Popconfirm
              title="是否确认删除？"
              description={`组内 ${count} 条倍率引用将一并移除，模型本身不受影响。`}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => runGroupAction(() => removeCustomGroup(group.id), '分组已删除')}
            >
              <Button type="link" size="small" danger style={{ padding: 0, height: 'auto' }}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  /** tab1「我的分组」：与改造前同一张列表，搜索条件收敛为「模型名称」，按组内模型匹配 */
  const myGroupsPane = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Text style={{ whiteSpace: 'nowrap' }}>模型名称：</Text>
        <Input
          value={keyword}
          allowClear
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => setQuery(keyword)}
          placeholder="请输入模型名称"
          prefix={<SearchOutlined style={{ color: '#86909c' }} />}
          style={{ width: 260 }}
        />
        <Button type="primary" onClick={() => setQuery(keyword)}>
          搜索
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            setKeyword('')
            setQuery('')
          }}
        >
          重置
        </Button>
        <RequirementDot
          title="模型分组（控制台） · 页面与搜索"
          sections={[
            {
              label: '',
              items: [
                '1.我的模型分组支持根据模型名称模糊搜索；分组按照创建时间倒序展示。',
                '2.列表展示如图。',
                '3.点击组内模型信息展示模型信息，文本的展示价格，其他展示「查看价格」，点击后新开页面跳转到模型详情。',
                '4.点击查看详情，跳转到模型详情；点击删除模型倍率，二次确认后移除分组。',
              ],
            },
          ]}
        />
        <div style={{ flex: 1 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          已创建 {mine.length}/{MODEL_GROUP_LIMIT_PER_USER}
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            if (atLimit) {
              message.warning(`每人最多创建 ${MODEL_GROUP_LIMIT_PER_USER} 个模型分组，请删除后再新建`)
              return
            }
            setDialog({ mode: 'create' })
          }}
        >
          新建分组
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        tableLayout="fixed"
        scroll={{ x: 1090 }}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `共 ${t} 条记录` }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                query ? '未找到组内包含该模型的分组，请调整搜索条件' : '还没有创建模型分组，点击右上角「新建分组」开始'
              }
            />
          ),
        }}
      />
    </>
  )

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as 'mine' | 'official')}
        items={[
          { key: 'mine', label: '我的分组', children: myGroupsPane },
          { key: 'official', label: '官方分组', children: <OfficialModelGroups /> },
        ]}
      />
      <Modal
        title={
          <Space size={6}>
            {dialog?.mode === 'edit' ? '编辑模型分组' : '新建模型分组'}
            <RequirementDot
              title="模型分组（控制台） · 新建 / 编辑分组"
              sections={[
                {
                  label: '',
                  items: [
                    '1.分组名称必填，最长 10 字，不可重复，也不能跟官方重复；描述选填，最长 100 字并展示字数。',
                    '2.保存后提示保存成功，弹窗关闭，刷新列表。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={!!dialog}
        centered
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        onCancel={() => setDialog(null)}
        onOk={save}
      >
        {/* preserve=false + initialValues：每次打开都按当前分组重新初始化，避免残留上一次填写的内容 */}
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          preserve={false}
          initialValues={
            dialog?.mode === 'edit'
              ? { name: dialog.group.name, description: dialog.group.description }
              : { name: '', description: '' }
          }
        >
          <Form.Item
            label="分组名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入分组名称' }]}
          >
            <Input maxLength={30} placeholder="请输入分组名称" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea maxLength={200} showCount rows={3} placeholder="选填，说明该分组适用的业务场景" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          <Space size={6}>
            添加模型
            <RequirementDot
              title="模型分组（控制台） · 添加模型"
              sections={[
                {
                  label: '',
                  items: [
                    '1.支持根据模型名称模糊搜索、生产商模糊搜索、倍率数字搜索。',
                    '2.每个分组只能添加某个模型的1个倍率。',
                    '3.保存后验证，模型是否存在，验证模型下倍率是否只有1个。否则提示「模型不存在」「每个分组只能添加某个模型的1个倍率」。验证成功，将模型添加到分组。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={!!pickerGroup}
        centered
        width={1040}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !pending.added && !pending.removed }}
        onCancel={closePicker}
        onOk={confirmPicker}
      >
        {pickerGroup ? <RatePicker selected={picked} onSelectChange={setPicked} /> : null}
      </Modal>
    </div>
  )
}

/* ---------------- 模型分组 › 官方分组（只读） ---------------- */

/** 官方分组明细行：一条「模型 × 倍率」，分组名称与描述按分组做单元格合并 */
type OfficialRow = { key: string; group: ModelGroup; rate: GroupRate | null; rowSpan: number }

/** 官方分组每页行数：合并单元格按当前页窗口计算，页容量取大值以保证分组尽量不被拆到两页 */
const OFFICIAL_PAGE_SIZE = 20

/**
 * tab2「官方分组」：展示管理后台维护的官方分组，字段为分组名称、组内模型、模型倍率、价格、描述。
 * 只读，无操作列，不提供任何用户操作；合并单元格与固定列在 antd 中冲突，因此本表不使用 fixed 列。
 */
function OfficialModelGroups() {
  const { models } = useModels()
  const { modelGroups } = useModelGroups()
  const [current, setCurrent] = useState(1)

  const official = useMemo(
    () =>
      modelGroups.filter(
        (group) =>
          group.groupType === 'official' && group.id !== DEFAULT_MODEL_GROUP_ID && group.status !== 'disabled',
      ),
    [modelGroups],
  )

  /** 展开口径与管理后台「组内模型信息」一致：只列组内模型的倍率档位，无组内模型时展示一行空值 */
  const rows = useMemo<OfficialRow[]>(
    () =>
      official.flatMap((group) => {
        const list = groupRatesOf(group, models)
        return (list.length ? list : [null]).map((rate, index) => ({
          key: `${group.id}-${index}`,
          group,
          rate,
          rowSpan: 1,
        }))
      }),
    [official, models],
  )

  /** 合并只在当前页窗口内生效：跨页的分组在新页重新展示分组名称，避免单元格被合并到上一页 */
  const data = useMemo(() => {
    const page = rows.slice((current - 1) * OFFICIAL_PAGE_SIZE, current * OFFICIAL_PAGE_SIZE)
    const span = new Map<string, number>()
    page.forEach((row) => span.set(row.group.id, (span.get(row.group.id) ?? 0) + 1))
    const shown = new Set<string>()
    return page.map((row) => {
      const first = !shown.has(row.group.id)
      shown.add(row.group.id)
      return { ...row, rowSpan: first ? span.get(row.group.id) ?? 1 : 0 }
    })
  }, [rows, current])

  const columns: ColumnsType<OfficialRow> = [
    {
      title: '分组名称',
      key: 'group',
      width: 180,
      onCell: (row) => ({ rowSpan: row.rowSpan }),
      render: (_, row) => <Text strong>{row.group.name}</Text>,
    },
    {
      title: '组内模型',
      key: 'model',
      width: 200,
      ellipsis: true,
      render: (_, row) => (row.rate ? <Text>{row.rate.modelName}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: '模型倍率',
      key: 'rate',
      width: 180,
      render: (_, row) =>
        row.rate ? (
          <Space size={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.rate.name}
            </Text>
            <Text strong>{row.rate.rate}x</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '价格',
      key: 'price',
      width: 340,
      render: (_, row) => {
        const price = row.rate ? ratePriceDetail(row.rate.modelName, row.rate.rate) : null
        if (!price?.lines.length) return <Text type="secondary">—</Text>
        return (
          <Space direction="vertical" size={0}>
            {price.lines.map((line) => (
              <Text key={line} style={{ fontSize: 12 }}>
                {line}
              </Text>
            ))}
            <Text type="secondary" style={{ fontSize: 12 }}>
              单位：{price.unit}
            </Text>
          </Space>
        )
      },
    },
    {
      title: '描述',
      key: 'description',
      width: 220,
      ellipsis: true,
      onCell: (row) => ({ rowSpan: row.rowSpan }),
      render: (_, row) =>
        row.group.description ? (
          <Tooltip title={row.group.description}>
            <Text>{row.group.description}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        官方分组由平台统一维护，仅供查看，不支持编辑。
      </Text>
      <Table
        rowKey="key"
        size="small"
        columns={columns}
        dataSource={data}
        scroll={{ x: 'max-content' }}
        pagination={{
          current,
          pageSize: OFFICIAL_PAGE_SIZE,
          total: rows.length,
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条记录`,
          onChange: (page) => setCurrent(page),
        }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无官方分组" />,
        }}
      />
    </div>
  )
}

/* ---------------- 体验语言模型 ---------------- */

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }
/** 弹窗目标：调用示例 / API 文档 / 模型信息 都按「模型 + 档位」展示，对比视图下指向被点击的那一列 */
type PlaygroundDialog = { kind: 'sample' | 'doc' | 'info'; model: PlazaModel; tier: RateTier } | null
/** 模型对比的一列：各自选模型档位、各自选 API 密钥、各自维护会话 */
type CompareColumn = { id: string; modelId: string; tierId: string; keyId: string; messages: ChatMessage[] }

/** 系统提示词默认值，与线上体验页文案一致 */
const DEFAULT_SYSTEM_PROMPT =
  '你是一名优秀的AI助手，你具备丰富的知识和强大的理解能力。请帮助用户解决各类问题，并用中文简洁回答。'

/** 原型内消息 id 自增，避免同一毫秒产生重复 key */
let chatSeq = 0
/** 模型对比的列 id 与消息 id 自增 */
let compareSeq = 0

/** 按标签取模型价格，兼容「缓存 / 缓存价格」这类同义标签 */
const priceOf = (model: PlazaModel, ...labels: string[]) =>
  model.prices.flat().find((c) => labels.includes(c.label))?.value ?? '—'

/** 档位倍率后的输入 / 输出价格文案，供体验页展示「所选档位怎么计费」 */
const tierPriceText = (model: PlazaModel, tier: RateTier) =>
  `输入 ${scalePrice(priceOf(model, '输入'), tier.rate)} · 输出 ${scalePrice(priceOf(model, '输出'), tier.rate)}`

/** 演示用回答：原型不真实调用模型，按提问、档位倍率与开关拼装一段结构化文本 */
const mockAnswer = (model: PlazaModel, tier: RateTier, question: string, deep: boolean) =>
  [
    deep ? `已开启深度思考，${model.name} 对「${question}」的分析如下：` : `${model.name} 对「${question}」的回答如下：`,
    '',
    '1. 先明确问题的核心诉求与约束条件；',
    '2. 结合上下文与模型已有知识，给出可直接执行的结论；',
    '3. 若关注成本或时延，可切换模型档位（倍率）后重新调用。',
    '',
    `本次调用档位：${tier.name}（${tier.rate}x），${tierPriceText(model, tier)}`,
    '（原型演示内容，未真实调用模型接口）',
  ].join('\n')

/** 模型对比最多并排的列数 */
const MAX_COMPARE_COLUMNS = 3

/** 消息气泡列表：单模型体验与模型对比共用 */
const ChatBubbles = ({ list, model }: { list: ChatMessage[]; model: PlazaModel }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {list.map((msg) =>
      msg.role === 'user' ? (
        <div key={msg.id} style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
          <div
            style={{
              background: '#f0f7ff',
              border: '1px solid #dfeaff',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              lineHeight: '22px',
              color: '#1d2129',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
        </div>
      ) : (
        <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <ModelLogo text={model.name} size={28} />
          <div
            style={{
              maxWidth: '82%',
              background: '#f7f8fa',
              border: '1px solid #eef0f4',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 14,
              lineHeight: '22px',
              color: '#1d2129',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
        </div>
      ),
    )}
  </div>
)

/** 生成中的提示行 */
const ReplyPending = ({ model }: { model: PlazaModel }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#86909c', fontSize: 13 }}>
    <ModelLogo text={model.name} size={28} />
    <Space size={6}>
      <LoadingOutlined spin />
      {model.name} 正在生成回复…
    </Space>
  </div>
)

/** 输入区：单模型体验带「深度思考」开关，模型对比只保留发送按钮 */
const ComposerBox = ({
  value,
  onValueChange,
  placeholder,
  replying,
  onSend,
  deep,
}: {
  value: string
  onValueChange: (next: string) => void
  placeholder: string
  replying: boolean
  onSend: () => void
  deep?: { on: boolean; toggle: () => void }
}) => (
  <div
    style={{
      background: '#fff',
      border: '1px solid #eef0f4',
      borderRadius: 16,
      boxShadow: '0 6px 18px rgba(47, 107, 255, 0.08)',
      padding: '12px 12px 12px 16px',
    }}
  >
    <Input.TextArea
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onPressEnter={(e) => {
        if (!e.shiftKey) {
          e.preventDefault()
          onSend()
        }
      }}
      placeholder={placeholder}
      variant="borderless"
      autoSize={{ minRows: 4, maxRows: 8 }}
      style={{ fontSize: 14, padding: '4px 0' }}
    />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
      {deep ? (
        <div
          onClick={deep.toggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 999,
            border: `1px solid ${deep.on ? '#2f6bff' : '#e5e6eb'}`,
            background: deep.on ? '#f0f7ff' : '#fff',
            color: deep.on ? '#2f6bff' : '#4e5969',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <ThunderboltOutlined />
          深度思考
        </div>
      ) : (
        <span />
      )}
      <Tooltip title="发送">
        <Button
          type="primary"
          shape="circle"
          icon={<ArrowUpOutlined />}
          disabled={!value.trim() || replying}
          onClick={onSend}
          style={{ background: value.trim() ? '#2f6bff' : undefined }}
        />
      </Tooltip>
    </div>
  </div>
)

/** API 文档中的请求参数说明 */
const API_PARAMS: { name: string; type: string; desc: string }[] = [
  { name: 'model', type: 'string', desc: '模型名称，必填' },
  { name: 'messages', type: 'array', desc: '对话消息列表，含 system / user / assistant 角色' },
  { name: 'max_tokens', type: 'number', desc: '单次回复的最大输出 Token 数' },
  { name: 'temperature', type: 'number', desc: '采样温度，取值范围 0 ~ 2' },
  { name: 'stream', type: 'boolean', desc: '是否以流式方式返回结果' },
]

function ExperiencePlayground({
  keys,
  onOpenModelDetail,
}: {
  keys: ApiKeyRow[]
  onOpenModelDetail: (model: PlazaModel) => void
}) {
  const { models } = useModels()
  const textModels = useMemo(() => MODELS.filter((m) => kindOf(m) === 'text'), [])
  const [modelId, setModelId] = useState('kimi-k3')
  const model = textModels.find((m) => m.id === modelId) ?? textModels[0]
  /** 当前模型下的档位（倍率），与模型详情「分档定价」同源 */
  const tiers = useMemo(() => rateTiersOf(model.name, models), [model.name, models])
  const [tierId, setTierId] = useState('')
  const tier = tiers.find((t) => t.id === tierId) ?? tiers[0]
  /** 级联选择：一级选模型，二级选该模型下的档位-倍率 */
  const modelOptions = useMemo(
    () =>
      textModels.map((m) => ({
        value: m.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ModelLogo text={m.name} size={28} />
            <div style={{ lineHeight: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d2129' }}>{m.name}</div>
              <div style={{ fontSize: 12, color: '#86909c' }}>{m.vendor}</div>
            </div>
          </div>
        ),
        children: rateTiersOf(m.name, models).map((t) => ({
          value: t.id,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, minWidth: 168 }}>
              <span>{t.name}</span>
              <span style={{ color: '#86909c' }}>{t.rate}x</span>
            </div>
          ),
        })),
      })),
    [textModels, models],
  )
  /** 右侧「模型参数」面板，默认展开，与顶部高亮的入口联动 */
  const [panelOpen, setPanelOpen] = useState(true)
  const [keyId, setKeyId] = useState(keys[0]?.id ?? '')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [deepThink, setDeepThink] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [replying, setReplying] = useState(false)
  const [dialog, setDialog] = useState<PlaygroundDialog>(null)
  const [lang, setLang] = useState<Lang>('cURL')
  const listRef = useRef<HTMLDivElement>(null)
  /** 视图切换：单模型体验 / 模型对比（对比为整页，替换聊天区） */
  const [view, setView] = useState<'chat' | 'compare'>('chat')
  const [columns, setColumns] = useState<CompareColumn[]>([])
  const [compareDraft, setCompareDraft] = useState('')
  const [compareReplying, setCompareReplying] = useState(false)
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, replying])

  useEffect(() => {
    Object.values(columnRefs.current).forEach((node) => {
      if (node) node.scrollTop = node.scrollHeight
    })
  }, [columns, compareReplying])

  /** 列内模型 / 档位解析：数据缺失时兜底到第一个文本模型的第一档 */
  const columnTarget = (col: CompareColumn): { model: PlazaModel; tier: RateTier } => {
    const target = textModels.find((m) => m.id === col.modelId) ?? textModels[0]
    const list = rateTiersOf(target.name, models)
    return { model: target, tier: list.find((t) => t.id === col.tierId) ?? list[0] }
  }

  /** 级联确认后同时切换模型与档位，并清空上一轮的会话 */
  const selectModelTier = (nextModelId: string, nextTierId: string) => {
    if (nextModelId === model.id && nextTierId === tier.id) return
    setModelId(nextModelId)
    setTierId(nextTierId)
    setMessages([])
    setDraft('')
  }

  /** 进入模型对比：首次进入时按当前模型与档位并排两列 */
  const openCompare = () => {
    if (!columns.length) {
      compareSeq += 1
      setColumns(
        [0, 1].map((offset) => ({
          id: `col-${compareSeq}-${offset}`,
          modelId: model.id,
          tierId: tier.id,
          keyId,
          messages: [],
        })),
      )
    }
    setCompareDraft('')
    setView('compare')
  }

  /** 对比列内切换模型档位：只影响该列，并清空该列会话 */
  const selectColumnTier = (id: string, nextModelId: string, nextTierId: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, modelId: nextModelId, tierId: nextTierId, messages: [] } : c)))
  }

  const setColumnKey = (id: string, nextKeyId: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, keyId: nextKeyId } : c)))
  }

  const removeColumn = (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id))
    delete columnRefs.current[id]
  }

  /** 追加一列：优先选尚未参与对比的模型 */
  const addColumn = () => {
    const used = new Set(columns.map((c) => c.modelId))
    const target = textModels.find((m) => !used.has(m.id)) ?? model
    compareSeq += 1
    setColumns((prev) => [
      ...prev,
      { id: `col-${compareSeq}`, modelId: target.id, tierId: rateTiersOf(target.name, models)[0].id, keyId, messages: [] },
    ])
  }

  /** 同一个问题广播给所有列，各列按自己的模型与档位作答 */
  const sendCompare = () => {
    const question = compareDraft.trim()
    if (!question || compareReplying || !columns.length) return
    compareSeq += 1
    const userId = `cu-${compareSeq}`
    setColumns((prev) => prev.map((c) => ({ ...c, messages: [...c.messages, { id: userId, role: 'user', content: question }] })))
    setCompareDraft('')
    setCompareReplying(true)
    window.setTimeout(() => {
      compareSeq += 1
      const answerId = `ca-${compareSeq}`
      setColumns((prev) =>
        prev.map((c) => {
          const { model: colModel, tier: colTier } = columnTarget(c)
          return { ...c, messages: [...c.messages, { id: answerId, role: 'assistant', content: mockAnswer(colModel, colTier, question, false) }] }
        }),
      )
      setCompareReplying(false)
    }, 600)
  }

  const send = () => {
    const question = draft.trim()
    if (!question || replying) return
    chatSeq += 1
    setMessages((prev) => [...prev, { id: `u-${chatSeq}`, role: 'user', content: question }])
    setDraft('')
    setReplying(true)
    window.setTimeout(() => {
      chatSeq += 1
      setMessages((prev) => [...prev, { id: `a-${chatSeq}`, role: 'assistant', content: mockAnswer(model, tier, question, deepThink) }])
      setReplying(false)
    }, 600)
  }

  const topAction = (label: string, icon: ReactNode, onClick: () => void, active = false) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 14,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        color: active ? '#2f6bff' : '#4e5969',
        background: active ? '#f0f7ff' : 'transparent',
        fontWeight: active ? 600 : 400,
      }}
    >
      {icon}
      {label}
    </div>
  )

  /** 模型级联选择器：一级选模型、二级选该模型的档位-倍率，单模型体验与对比列共用 */
  const modelCascader = (
    current: PlazaModel,
    currentTier: RateTier,
    onPick: (modelId: string, tierId: string) => void,
    style?: CSSProperties,
  ) => (
    <Cascader
      value={[current.id, currentTier.id]}
      options={modelOptions}
      onChange={(value) => {
        const [nextModelId, nextTierId] = (value ?? []) as string[]
        if (nextModelId && nextTierId) onPick(nextModelId, nextTierId)
      }}
      displayRender={() => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 24 }}>
          <ModelLogo text={current.name} size={32} />
          <div style={{ lineHeight: '17px', textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1d2129' }}>{current.name}</div>
            <div style={{ fontSize: 12, color: '#86909c' }}>
              {current.vendor} · {currentTier.name} {currentTier.rate}x
            </div>
          </div>
        </div>
      )}
      expandTrigger="hover"
      allowClear={false}
      variant="borderless"
      style={{ minWidth: 240, ...style }}
    />
  )

  const keyOptions = keys.map((k) => ({ value: k.id, label: k.name }))

  const composer = (
    <ComposerBox
      value={draft}
      onValueChange={setDraft}
      placeholder={`向 ${model.name} 发送消息`}
      replying={replying}
      onSend={send}
      deep={{ on: deepThink, toggle: () => setDeepThink((v) => !v) }}
    />
  )

  /** 弹窗内容按目标列展示，未指定时沿用当前体验的模型与档位 */
  const dialogModel = dialog?.model ?? model
  const dialogTier = dialog?.tier ?? tier

  /** 模型对比：整页多列并排，底部共用一个输入区，同一问题广播给所有列 */
  const compareView = (
    <>
      <div
        style={{
          flexShrink: 0,
          height: 56,
          padding: '0 24px',
          borderBottom: '1px solid #eef0f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#1d2129' }}>
          <SwapOutlined />
          模型对比
        </div>
        <Button
          icon={<ArrowLeftOutlined />}
          style={{ background: '#1d2129', borderColor: '#1d2129', color: '#fff' }}
          onClick={() => setView('chat')}
        >
          退出模型
        </Button>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, padding: '16px 24px 0', minHeight: 0, overflowX: 'auto' }}>
        {columns.map((col) => {
          const { model: colModel, tier: colTier } = columnTarget(col)
          return (
            <div key={col.id} style={{ flex: '1 1 0', minWidth: 380, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px 8px 14px',
                  borderRadius: 12,
                  border: '1px solid #eef0f4',
                  background: 'linear-gradient(90deg, #f2f5ff 0%, #fbfcff 100%)',
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  {modelCascader(colModel, colTier, (nextModelId, nextTierId) => selectColumnTier(col.id, nextModelId, nextTierId), {
                    minWidth: 180,
                  })}
                </div>
                <Tooltip title="该列调用使用的 API 密钥">
                  <Space size={4} style={{ flexShrink: 0 }}>
                    <KeyOutlined style={{ color: '#86909c' }} />
                    <Select
                      value={col.keyId || undefined}
                      onChange={(value) => setColumnKey(col.id, value)}
                      placeholder="API密钥"
                      options={keyOptions}
                      style={{ width: 140 }}
                    />
                  </Space>
                </Tooltip>
                <Button style={{ flexShrink: 0 }} onClick={() => setDialog({ kind: 'info', model: colModel, tier: colTier })}>
                  模型信息
                </Button>
                <Button style={{ flexShrink: 0 }} onClick={() => setDialog({ kind: 'sample', model: colModel, tier: colTier })}>
                  调用示例
                </Button>
                <Tooltip title="移除该模型">
                  <Button
                    style={{ flexShrink: 0 }}
                    icon={<CloseOutlined />}
                    disabled={columns.length <= 1}
                    onClick={() => removeColumn(col.id)}
                  />
                </Tooltip>
              </div>
              <div
                ref={(node) => {
                  columnRefs.current[col.id] = node
                }}
                style={{ flex: 1, overflowY: 'auto', padding: '20px 8px 8px' }}
              >
                {col.messages.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <ChatBubbles list={col.messages} model={colModel} />
                    {compareReplying ? <ReplyPending model={colModel} /> : null}
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      发送问题后，此处展示 {colModel.name}（{colTier.name}）的回答
                    </Text>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {columns.length < MAX_COMPARE_COLUMNS ? (
          <div
            onClick={addColumn}
            style={{
              flex: '0 0 168px',
              borderRadius: 12,
              border: '1px dashed #dfe3ec',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#86909c',
              cursor: 'pointer',
            }}
          >
            <PlusOutlined />
            <span style={{ fontSize: 13 }}>添加对比模型</span>
          </div>
        ) : null}
      </div>

      <div style={{ flexShrink: 0, padding: '12px 24px 24px' }}>
        <ComposerBox
          value={compareDraft}
          onValueChange={setCompareDraft}
          placeholder="请输入问题，帮你深度思考"
          replying={compareReplying}
          onSend={sendCompare}
        />
      </div>
    </>
  )

  /** 单模型体验：顶栏模型级联 + 快捷操作，主区会话，右侧模型参数面板 */
  const chatView = (
    <>
      {/* 顶栏：模型选择 + 快捷操作 */}
      <div
        style={{
          flexShrink: 0,
          height: 56,
          padding: '0 24px',
          borderBottom: '1px solid #eef0f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {modelCascader(model, tier, selectModelTier, { minWidth: 260 })}
        <RequirementDot
          title="体验语言模型 · 模型选择"
          sections={[
            {
              label: '',
              items: [
                '1.模型选择改为级联选择：一级选模型，二级选该模型的档位-倍率。',
                '2.选择倍率后，倒推当前用户，倍率所在的组，组所对应的key是否存在，不存在提示「当前模型档位尚未创建API KEY，请创建」；如果存在，默认选中。',
                '3.模型对比逻辑与上方一致。',
              ],
            },
          ]}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {topAction('模型对比', <SwapOutlined />, openCompare)}
          {topAction('调用示例', <CodeOutlined />, () => setDialog({ kind: 'sample', model, tier }))}
          {topAction('API文档', <FileTextOutlined />, () => setDialog({ kind: 'doc', model, tier }))}
          {topAction('模型详情', <AppstoreOutlined />, () => onOpenModelDetail(model))}
          {topAction('模型参数', <SlidersOutlined />, () => setPanelOpen((v) => !v), panelOpen)}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 主区：空态居中，有消息时列表滚动 + 输入框吸底 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {messages.length === 0 && !replying ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 28,
                padding: '24px 32px 48px',
              }}
            >
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    position: 'absolute',
                    top: -20,
                    width: 420,
                    height: 120,
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse at center, rgba(124, 110, 245, 0.26) 0%, rgba(124, 110, 245, 0) 70%)',
                    pointerEvents: 'none',
                  }}
                />
                <ModelLogo text={model.name} size={56} />
                <div style={{ fontSize: 20, fontWeight: 600, color: '#1d2129' }}>试用 {model.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                    {tier.name} · {tier.rate}x
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {tierPriceText(model, tier)}
                  </Text>
                </div>
              </div>
              <div style={{ width: '100%', maxWidth: 1000 }}>{composer}</div>
            </div>
          ) : (
            <>
              <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ChatBubbles list={messages} model={model} />
                  {replying ? <ReplyPending model={model} /> : null}
                </div>
              </div>
              <div style={{ padding: '12px 32px 24px' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>{composer}</div>
              </div>
            </>
          )}
        </div>

        {/* 右侧：模型参数 */}
        {panelOpen ? (
          <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid #eef0f4', padding: '24px 24px 32px', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1d2129', marginBottom: 20 }}>模型参数</div>
            <div style={{ fontSize: 13, color: '#4e5969', marginBottom: 8 }}>API密钥</div>
            <Select
              value={keyId || undefined}
              onChange={setKeyId}
              placeholder="请选择 API 密钥"
              style={{ width: '100%' }}
              options={keyOptions}
            />
            <div style={{ fontSize: 13, color: '#4e5969', margin: '20px 0 8px' }}>系统提示词</div>
            <Input.TextArea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              autoSize={{ minRows: 5, maxRows: 12 }}
              style={{ fontSize: 13 }}
            />
          </div>
        ) : null}
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {view === 'compare' ? compareView : chatView}

      <Modal
        title="调用示例"
        open={dialog?.kind === 'sample'}
        onCancel={() => setDialog(null)}
        footer={null}
        width={760}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 12px', fontSize: 13 }}>
          <Text type="secondary">调用档位</Text>
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {dialogTier.name} · {dialogTier.rate}x
          </Tag>
          <Text type="secondary">{tierPriceText(dialogModel, dialogTier)}</Text>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Segmented value={lang} onChange={(value) => setLang(value as Lang)} options={LANGS} />
        </div>
        <CodeBlock code={buildSnippet('text', 'openai', lang, dialogModel.id)} />
      </Modal>

      <Modal
        title="API文档"
        open={dialog?.kind === 'doc'}
        onCancel={() => setDialog(null)}
        footer={null}
        width={720}
        centered
        destroyOnClose
      >
        <SectionTitle top={16}>接口地址</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deriveDetail(dialogModel).endpoints.map((path) => (
            <div
              key={path}
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 13,
                color: '#1d2129',
                background: '#f7f8fa',
                border: '1px solid #eef0f4',
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              POST https://api.zhisuanduoduo.com{path}
            </div>
          ))}
        </div>
        <SectionTitle top={24}>请求参数</SectionTitle>
        <Table
          rowKey="name"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          dataSource={API_PARAMS}
          columns={[
            { title: '参数名', dataIndex: 'name', width: 160 },
            { title: '类型', dataIndex: 'type', width: 100 },
            { title: '说明', dataIndex: 'desc' },
          ]}
        />
        <SectionTitle top={24}>模型信息</SectionTitle>
        <div style={{ border: '1px solid #eef0f4', borderRadius: 10, padding: '0 16px' }}>
          {deriveDetail(dialogModel).infoRows.map((row) => (
            <div key={row.label} style={detailRow}>
              <span style={{ fontSize: 13, color: '#86909c' }}>{row.label}</span>
              <span style={{ fontSize: 13, color: '#1d2129' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        title="模型信息"
        open={dialog?.kind === 'info'}
        onCancel={() => setDialog(null)}
        footer={null}
        width={640}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 12px', fontSize: 13 }}>
          <Text type="secondary">当前档位</Text>
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {dialogTier.name} · {dialogTier.rate}x
          </Tag>
          <Text type="secondary">{tierPriceText(dialogModel, dialogTier)}</Text>
        </div>
        <div style={{ border: '1px solid #eef0f4', borderRadius: 10, padding: '0 16px' }}>
          {deriveDetail(dialogModel).infoRows.map((row) => (
            <div key={row.label} style={detailRow}>
              <span style={{ fontSize: 13, color: '#86909c' }}>{row.label}</span>
              <span style={{ fontSize: 13, color: '#1d2129' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}

/* ---------------- 概览 ---------------- */

type NoticeItem = { title: string; type: string; time: string }

const OVERVIEW_NOTICES: NoticeItem[] = [
  { title: 'DODO-AC-Ultra-5上线通知', type: '系统公告', time: '2026-08-03 09:46:29' },
  { title: '模型维护通知', type: '系统公告', time: '2026-07-29 16:46:09' },
  { title: 'Token Plan 团队版上线', type: '产品动态', time: '2026-07-21 10:12:06' },
  { title: 'API Key 安全策略升级', type: '系统公告', time: '2026-07-14 14:30:55' },
]

/** 概览四项指标：原型演示数据 */
const OVERVIEW_METRICS: { value: string; label: string }[] = [
  { value: '227', label: 'API调用次数' },
  { value: '¥299.37', label: '本月消耗' },
  { value: '29', label: '可用模型' },
  { value: '1', label: 'API密钥' },
]

interface OverviewProps {
  onGoMyGroups: () => void
  onGoApiKey: () => void
  onGoRecharge: () => void
  onGoUsage: () => void
  onGoPlaza: () => void
}

interface OverviewStepItem {
  no: number
  icon: ReactNode
  title: string
  desc: string
  onClick: () => void
  /** 卡内小额度入口（如第三步的代金券），自渲染点击，需阻止冒泡避免触发整卡跳转 */
  extra?: ReactNode
}

function OverviewStepCard({ step }: { step: OverviewStepItem }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={step.onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer',
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        borderRadius: 8,
        background: hover ? '#f2f6ff' : '#f7f8fa',
        border: `1px solid ${hover ? '#adc6ff' : '#eef0f4'}`,
        boxShadow: hover ? '0 2px 8px rgba(47, 107, 255, 0.12)' : 'none',
        padding: '16px 34px 16px 16px',
        transition: 'background .2s, border-color .2s, box-shadow .2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ color: '#2f6bff', fontSize: 15, flex: 'none' }}>{step.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1d2129', flex: 'none' }}>
          第{['一', '二', '三'][step.no - 1]}步
        </span>
        <span
          style={{ fontSize: 15, fontWeight: 600, color: '#1d2129', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {step.title}
        </span>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: '#86909c', lineHeight: 1.6 }}>
        {step.desc}
      </div>
      {step.extra && <div style={{ marginTop: 10 }}>{step.extra}</div>}
      <RightOutlined
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 12,
          color: hover ? '#2f6bff' : '#c9cdd4',
          transition: 'color .2s',
        }}
      />
    </div>
  )
}

/** 第三步卡内体验代金券的面额（原型演示：立即领取，无需充值）；是否展示该入口由后台新人券决定 */
const FREE_VOUCHER_AMOUNT = 20

function OverviewSection({ onGoMyGroups, onGoApiKey, onGoRecharge, onGoUsage, onGoPlaza }: OverviewProps) {
  const [noticeOpen, setNoticeOpen] = useState(false)
  /** 体验代金券弹窗：null 关闭 / claim 待领取 / claimed 已领取 */
  const [freeVoucher, setFreeVoucher] = useState<'claim' | 'claimed' | null>(null)
  /**
   * 新人券来自后台券模板：后台配置好这张券、且处于启用状态时，概览第三步才展示赠送入口；
   * 后台删掉或停用这张券，前台入口自动消失。新人身份关系暂不处理，只由页面控制是否展示。
   */
  const newcomerVoucher = findNewcomerVoucher(useVoucherTemplates())

  const steps: OverviewStepItem[] = [
    {
      no: 1,
      icon: <AppstoreOutlined />,
      title: '创建分组，选择模型',
      desc: '按场景灵活创建模型分组，如高效代码组、低价省钱组。',
      onClick: onGoMyGroups,
    },
    {
      no: 2,
      icon: <KeyOutlined />,
      title: '创建 API Key，关联分组',
      desc: '关联不同分组，方便控费，保障安全。',
      onClick: onGoApiKey,
    },
    {
      no: 3,
      icon: <WalletOutlined />,
      title: '账户充值，立即使用',
      desc: '充值即可开启大模型之旅，主流模型任你选。',
      onClick: onGoRecharge,
      /** 充值不是唯一路径：卡内给一个小额度入口，免费领取体验代金券后先去模型广场体验；入口仅在后台配置了新人券时出现 */
      extra: newcomerVoucher ? (
        <span
          className="overview-step-voucher"
          onClick={(e) => {
            e.stopPropagation()
            setFreeVoucher('claim')
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: '#2f6bff',
            background: '#e2edff',
            borderRadius: 6,
            padding: '3px 10px',
            cursor: 'pointer',
          }}
        >
          <GiftOutlined />
          立即领取，新用户{FREE_VOUCHER_AMOUNT}元体验券
        </span>
      ) : undefined,
    },
  ]

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1d2129' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          概览
          <RequirementDot
            title="Token工厂 · 概览 · 需求说明"
            sections={[
              {
                label: '需求内容',
                items: [
                  '1.页面展示如图；',
                  '2.点击三个步骤可以跳转到不同页面。鼠标悬浮有交互；',
                  '3.如为首次注册用户，则第三步展示赠送20元代金券。这个券后台配置好，不要删除即可。（如果没有这个券了，前台要判断不要展示这个赠送按钮了）；点击立即领取，弹窗如图，领取成功，为用户发放20元代金券，有效期1个月，点击去模型广场，跳转到模型广场。点击关闭，页面刷新，领取代金券按钮消失（未成功领取的，依然展示）。',
                  '4.点击数据概览的，查看详情，跳转到用量统计页面。',
                  '5.去掉左上角控制台的点击跳转页面。',
                ],
              },
            ]}
          />
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: '#86909c' }}>欢迎查看您的服务概览</div>

      <Card
        variant="borderless"
        style={{ marginTop: 16, borderRadius: 8, border: '1px solid #eef0f4' }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#eaf1ff',
              color: '#2f6bff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            <StarFilled />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1d2129' }}>
              欢迎，{CURRENT_CONSOLE_USER.nickname}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: '#86909c' }}>
              仅需3步，主流模型随您选用
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <style>{'@media (max-width: 999px) { .overview-step-arrow { opacity: 0 !important; } }'}</style>
          {steps.map((step, idx) => (
            <Fragment key={step.no}>
              <OverviewStepCard step={step} />
              {idx < steps.length - 1 && (
                <svg
                  className="overview-step-arrow"
                  width="16"
                  height="12"
                  viewBox="0 0 16 12"
                  style={{
                    position: 'absolute',
                    left: `calc(${((idx + 1) / steps.length) * 100}% + ${16 * idx + 8 - ((idx + 1) * (steps.length - 1) * 16) / steps.length}px)`,
                    top: 22,
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    transition: 'opacity .2s',
                  }}
                >
                  <path d="M0 6 H9" fill="none" stroke="#2f6bff" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
                  <path d="M8 1.5 L13.5 6 L8 10.5" fill="none" stroke="#2f6bff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </Fragment>
          ))}
        </div>
      </Card>

      <Card
        variant="borderless"
        style={{ marginTop: 16, borderRadius: 8, border: '1px solid #eef0f4' }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d2129' }}>数据概览</span>
          <Typography.Link className="overview-usage-link" style={{ fontSize: 13 }} onClick={onGoUsage}>
            查看详情 <RightOutlined style={{ fontSize: 10 }} />
          </Typography.Link>
        </div>
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          }}
        >
          {OVERVIEW_METRICS.map((metric, idx) => (
            <div
              key={metric.label}
              style={{
                textAlign: 'center',
                padding: '8px 12px',
                borderLeft: idx === 0 ? 'none' : '1px solid #eef0f4',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>{metric.value}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#86909c' }}>{metric.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        variant="borderless"
        style={{ marginTop: 16, marginBottom: 16, borderRadius: 8, border: '1px solid #eef0f4' }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1d2129' }}>公告</span>
          <Typography.Link style={{ fontSize: 13 }} onClick={() => setNoticeOpen(true)}>
            查看更多 <RightOutlined style={{ fontSize: 10 }} />
          </Typography.Link>
        </div>
        {OVERVIEW_NOTICES.slice(0, 2).map((notice, idx) => (
          <div
            key={notice.title}
            style={{
              padding: '14px 0',
              borderBottom: idx === 0 ? '1px solid #eef0f4' : 'none',
            }}
          >
            <div style={{ fontSize: 14, color: '#1d2129' }}>{notice.title}</div>
            <Space size={6} style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {notice.type}
              </Text>
              <ClockCircleOutlined style={{ fontSize: 12, color: '#86909c' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {notice.time}
              </Text>
            </Space>
          </div>
        ))}
      </Card>

      <Modal
        title="公告"
        open={noticeOpen}
        onCancel={() => setNoticeOpen(false)}
        footer={null}
        width={520}
        centered
        destroyOnHidden
      >
        {OVERVIEW_NOTICES.map((notice, idx) => (
          <div
            key={notice.title}
            style={{
              padding: '12px 0',
              borderBottom: idx === OVERVIEW_NOTICES.length - 1 ? 'none' : '1px solid #eef0f4',
            }}
          >
            <div style={{ fontSize: 14, color: '#1d2129' }}>{notice.title}</div>
            <Space size={6} style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {notice.type}
              </Text>
              <BellOutlined style={{ fontSize: 12, color: '#86909c' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {notice.time}
              </Text>
            </Space>
          </div>
        ))}
      </Modal>

      <Modal
        title="体验代金券"
        open={freeVoucher !== null}
        centered
        width={400}
        destroyOnClose
        onCancel={() => setFreeVoucher(null)}
        footer={
          freeVoucher === 'claimed' ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setFreeVoucher(null)}>关闭</Button>
              <Button
                type="primary"
                onClick={() => {
                  setFreeVoucher(null)
                  onGoPlaza()
                }}
              >
                去模型广场体验
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setFreeVoucher(null)}>取消</Button>
              <Button type="primary" onClick={() => setFreeVoucher('claimed')}>
                立即领取
              </Button>
            </div>
          )
        }
      >
        {freeVoucher === 'claimed' ? (
          <div style={{ padding: '12px 0 4px', textAlign: 'center' }}>
            <CheckCircleFilled style={{ fontSize: 44, color: '#52c41a' }} />
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: '#1d2129' }}>
              领取成功！¥{FREE_VOUCHER_AMOUNT} 代金券已到账
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#86909c' }}>
              您已可以抵扣调用费用，立即体验模型了
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 0 4px', textAlign: 'center' }}>
            <GiftOutlined style={{ fontSize: 44, color: '#2f6bff' }} />
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: '#1d2129' }}>
              新用户体验代金券 ¥{FREE_VOUCHER_AMOUNT}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#86909c' }}>
              领取后即可抵扣模型调用费用，主流模型任您选择！
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ---------------- 用量统计（统计分析 › 用量统计，概览页「查看详情」落地页） ---------------- */

/** 概览页四项指标同源：本月的调用、消耗、模型、密钥口径在下方统计卡直接复用 */
type UsageRange = 'today' | 'week' | 'month' | 'quarter'

const defaultUsageRange = (r: UsageRange): [Dayjs, Dayjs] => {
  const end = dayjs()
  if (r === 'today') return [end, end]
  if (r === 'week') return [end.subtract(6, 'day'), end]
  if (r === 'month') return [end.subtract(29, 'day'), end]
  return [end.subtract(89, 'day'), end]
}

/** 确定性伪随机序列：把总量按周期权重拆到每一天，末位补齐尾差，保证合计与统计卡一致 */
const spreadSeries = (total: number, days: number, seed: number, decimals: number) => {
  const weights = Array.from({ length: days }, (_, i) => 0.6 + ((i * 37 + seed * 13) % 10) / 10)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const p = 10 ** decimals
  const out = weights.map((w) => Math.round((w / weightSum) * total * p) / p)
  const diff = Math.round((total - out.reduce((a, b) => a + b, 0)) * p) / p
  out[out.length - 1] = Math.round((out[out.length - 1] + diff) * p) / p
  return out
}

interface ModelUsageRow {
  model: string
  group: string
  calls: number
  tokens: number
  cost: number
}

/** 当月按模型维度的用量明细：调用合计 227、消耗合计 ¥299.37，与概览指标严格一致 */
const MONTH_MODEL_USAGE: ModelUsageRow[] = [
  { model: 'DeepSeek-V4-Flash', group: '低价省钱组', calls: 138, tokens: 1286400, cost: 91.24 },
  { model: 'DeepSeek-V4', group: '默认分组', calls: 41, tokens: 742800, cost: 63.18 },
  { model: 'Kimi-K3', group: '默认分组', calls: 24, tokens: 518600, cost: 58.9 },
  { model: 'GLM-5.2', group: '默认分组', calls: 12, tokens: 208500, cost: 42.36 },
  { model: 'Qwen3.8-Max', group: '高效代码组', calls: 8, tokens: 152300, cost: 28.42 },
  { model: 'Doubao-Seed-2.0', group: '默认分组', calls: 4, tokens: 61200, cost: 15.27 },
]

function UsageStatCard({ icon, iconBg, label, value, sub }: { icon: ReactNode; iconBg: string; label: string; value: string; sub: ReactNode }) {
  return (
    <div style={{ border: '1px solid #eef0f4', borderRadius: 8, padding: '16px 16px 14px', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: iconBg,
            color: '#2f6bff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {label}
        </Text>
      </div>
      <div style={{ marginTop: 10, fontSize: 24, fontWeight: 600, color: '#1d2129', lineHeight: '32px' }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: '#86909c' }}>{sub}</div>
    </div>
  )
}

function UsageStats() {
  const [period, setPeriod] = useState<UsageRange>('month')
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => defaultUsageRange('month'))
  const [metric, setMetric] = useState<'calls' | 'cost'>('calls')
  const [hover, setHover] = useState<number | null>(null)

  const today = dayjs()
  const monthStart = today.startOf('month')
  /** 原型演示数据仅覆盖当月已过去的天数（1 号 ~ 今天） */
  const elapsedDays = today.date()
  const overlapStart = range[0].isBefore(monthStart) ? monthStart : range[0]
  const overlapEnd = range[1].isAfter(today) ? today : range[1]
  const overlapDays = overlapEnd.isBefore(overlapStart) ? 0 : overlapEnd.diff(overlapStart, 'day') + 1

  /** 明细表按「区间与当月的交集天数 ÷ 当月已过天数」等比折算 */
  const ratio = elapsedDays > 0 ? overlapDays / elapsedDays : 0
  const rows: ModelUsageRow[] = useMemo(
    () =>
      MONTH_MODEL_USAGE.map((row) => ({
        ...row,
        calls: Math.max(1, Math.round(row.calls * ratio)),
        tokens: Math.round(row.tokens * ratio),
        cost: Math.round(row.cost * ratio * 100) / 100,
      })),
    [ratio],
  )
  const totalCalls = rows.reduce((sum, r) => sum + r.calls, 0)
  const totalTokens = rows.reduce((sum, r) => sum + r.tokens, 0)
  const totalCost = Math.round(rows.reduce((sum, r) => sum + r.cost, 0) * 100) / 100

  /** 趋势取所选区间与当月的交集；区间完全落在往月时演示数据为空 */
  const trend = useMemo(() => {
    if (overlapDays === 0) return null
    return {
      days: overlapDays,
      labels: Array.from({ length: overlapDays }, (_, i) => overlapStart.add(i, 'day').format('M/D')),
      calls: spreadSeries(totalCalls, overlapDays, 7, 0),
      cost: spreadSeries(totalCost, overlapDays, 3, 2),
    }
  }, [overlapDays, overlapStart, totalCalls, totalCost])

  const chartValues = trend ? (metric === 'calls' ? trend.calls : trend.cost) : []
  const chartMax = chartValues.length > 0 ? Math.max(...chartValues) : 0
  const W = 720
  const H = 208
  const PAD = { top: 16, bottom: 26, left: 8, right: 8 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const n = chartValues.length
  const barW = n > 0 ? Math.min(26, plotW / n - 6) : 0
  const valueAt = (i: number) => (plotH > 0 && chartMax > 0 ? (chartValues[i] / chartMax) * plotH : 0)
  const points = chartValues.map((v, i) => `${PAD.left + ((i + 0.5) / n) * plotW},${PAD.top + plotH - valueAt(i)}`).join(' ')
  const areaPoints = n > 0 ? `${PAD.left + plotW / (2 * n)},${PAD.top + plotH} ${points} ${PAD.left + plotW - plotW / (2 * n)},${PAD.top + plotH}` : ''

  const columns: ColumnsType<ModelUsageRow> = [
    { title: '模型', dataIndex: 'model', key: 'model', render: (v: string) => <Text strong>{v}</Text> },
    { title: '所属分组', dataIndex: 'group', key: 'group' },
    { title: '调用次数', dataIndex: 'calls', key: 'calls', align: 'right', render: (v: number) => v.toLocaleString() },
    {
      title: 'Token 消耗',
      dataIndex: 'tokens',
      key: 'tokens',
      align: 'right',
      render: (v: number) => `${(v / 10000).toFixed(1)} 万`,
    },
    {
      title: '消耗金额',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
  ]

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1d2129' }}>用量统计</div>
      <div style={{ marginTop: 6, fontSize: 13, color: '#86909c' }}>查看当前账号的 API 调用与消耗情况</div>

      <Card variant="borderless" style={{ marginTop: 16, borderRadius: 8, border: '1px solid #eef0f4' }} styles={{ body: { padding: 16 } }}>
        <Space size={12} wrap>
          <Space size={8}>
            <Text>统计时间</Text>
            <DatePicker.RangePicker
              allowClear={false}
              value={range}
              onChange={(v) => {
                if (v && v[0] && v[1]) setRange([v[0], v[1]])
              }}
              disabledDate={(d) => d.isAfter(dayjs(), 'day')}
              style={{ width: 260 }}
            />
          </Space>
          <Segmented<UsageRange>
            value={period}
            onChange={(v) => {
              setPeriod(v)
              setRange(defaultUsageRange(v))
            }}
            options={[
              { label: '今日', value: 'today' },
              { label: '近7天', value: 'week' },
              { label: '近30天', value: 'month' },
              { label: '近90天', value: 'quarter' },
            ]}
          />
          <Button
            onClick={() => {
              setPeriod('month')
              setRange(defaultUsageRange('month'))
            }}
          >
            重置
          </Button>
        </Space>
      </Card>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <UsageStatCard
          icon={<FundProjectionScreenOutlined />}
          iconBg="#eaf1ff"
          label="API调用次数"
          value={totalCalls.toLocaleString()}
          sub="区间调用合计，与趋势图一致"
        />
        <UsageStatCard
          icon={<WalletOutlined />}
          iconBg="#fff4e8"
          label="消耗金额"
          value={`¥${totalCost.toFixed(2)}`}
          sub="含代金券抵扣部分"
        />
        <UsageStatCard
          icon={<ThunderboltOutlined />}
          iconBg="#eaf9f0"
          label="Token 消耗"
          value={`${(totalTokens / 10000).toFixed(1)} 万`}
          sub="输入与输出合计"
        />
        <UsageStatCard icon={<AppstoreOutlined />} iconBg="#f3eeff" label="活跃模型" value={String(rows.length)} sub="共 29 个可用模型" />
      </div>

      <SectionTitle top={24}>用量趋势</SectionTitle>
      <Card variant="borderless" style={{ borderRadius: 8, border: '1px solid #eef0f4' }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            按天统计（演示数据）
          </Text>
          <Segmented
            size="small"
            value={metric}
            onChange={(v) => setMetric(v as 'calls' | 'cost')}
            options={[
              { label: 'API调用次数', value: 'calls' },
              { label: '消耗金额', value: 'cost' },
            ]}
          />
        </div>
        {trend === null ? (
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="所选区间不在本月内，原型演示数据仅覆盖当月" />
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              style={{ display: 'block', width: '100%', height: 208 }}
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="usageAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(47,107,255,0.22)" />
                  <stop offset="100%" stopColor="rgba(47,107,255,0.02)" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((i) => {
                const y = PAD.top + (plotH * i) / 4
                return <line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#eef0f4" strokeWidth="1" />
              })}
              {chartValues.map((v, i) => {
                const h = valueAt(i)
                const x = PAD.left + ((i + 0.5) / n) * plotW - barW / 2
                return (
                  <rect
                    key={i}
                    x={x}
                    y={PAD.top + plotH - h}
                    width={barW}
                    height={h}
                    rx={2}
                    fill={hover === i ? '#2f6bff' : 'rgba(47,107,255,0.3)'}
                  />
                )
              })}
              <polyline points={points} fill="none" stroke="#2f6bff" strokeWidth="2" strokeLinejoin="round" />
              <polygon points={areaPoints} fill="url(#usageAreaFill)" />
              {chartValues.map((_, i) => {
                const step = Math.max(1, Math.ceil(n / 12))
                if (i % step !== 0 && i !== n - 1) return null
                const x = PAD.left + ((i + 0.5) / n) * plotW
                return (
                  <text key={i} x={x} y={H - 8} textAnchor="middle" fontSize="11" fill="#86909c">
                    {trend.labels[i]}
                  </text>
                )
              })}
              {chartValues.map((_, i) => {
                const x = PAD.left + ((i + 0.5) / n) * plotW - plotW / (2 * n)
                return (
                  <rect
                    key={i}
                    x={x}
                    y={PAD.top}
                    width={plotW / n}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                  />
                )
              })}
            </svg>
            {hover !== null && hover < n && (
              <div
                style={{
                  position: 'absolute',
                  left: `${((hover + 0.5) / n) * 100}%`,
                  top: 0,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  background: 'rgba(29,33,41,0.9)',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                {trend.labels[hover]} · {metric === 'calls' ? `${chartValues[hover]} 次` : `¥${chartValues[hover].toFixed(2)}`}
              </div>
            )}
          </div>
        )}
      </Card>

      <SectionTitle top={24}>模型用量明细</SectionTitle>
      <Card variant="borderless" style={{ borderRadius: 8, border: '1px solid #eef0f4' }} styles={{ body: { padding: 16 } }}>
        <Table<ModelUsageRow>
          rowKey="model"
          size="middle"
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 'max-content' }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>合计</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text type="secondary">—</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong>{totalCalls.toLocaleString()}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <Text strong>{(totalTokens / 10000).toFixed(1)} 万</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <Text strong>¥{totalCost.toFixed(2)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  )
}

/* ---------------- Token 工厂 ---------------- */

interface TokenFactoryPageProps {
  /** 评审模式放行的二级菜单；不传表示全部展示 */
  allowedMenus?: FactoryMenu[]
  /** 概览页「充值余额」跳转到费用管理，未传时回落到 Token 工厂内部提示 */
  onGoRecharge?: () => void
}

export default function TokenFactoryPage({ allowedMenus, onGoRecharge }: TokenFactoryPageProps) {
  /** 评审范围裁剪后的菜单组：组内无可见项时整组隐藏 */
  const groups = useMemo(() => {
    if (!allowedMenus || allowedMenus.length === 0) return MENU_GROUPS
    return MENU_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => allowedMenus.includes(i.key)),
    })).filter((g) => g.items.length > 0)
  }, [allowedMenus])
  /** 不在评审范围内的菜单（含页面内跳转）统一回落到第一个可见项；「概览」是菜单首项，进入 Token 工厂默认即概览页 */
  const fallbackMenu = groups[0]?.items[0]?.key ?? 'plaza'

  const [menu, setMenu] = useState<FactoryMenu>(fallbackMenu)
  /** 详情态提升到菜单层：点击左侧「模型广场」可从详情页跳回广场 */
  const [detailId, setDetailId] = useState<string | null>(null)
  /** 密钥列表提升到菜单层：切换左侧菜单不丢失本次会话的增删改 */
  const [accountKeys, setAccountKeys] = useState<ApiKeyRow[]>(INITIAL_ACCOUNT_KEYS)

  const onMenuClick = (key: FactoryMenu) => {
    /** 评审范围内的页面才会切换：概览页内的跳转指向未放行菜单时给出提示，避免点了没反应 */
    if (allowedMenus && allowedMenus.length && !allowedMenus.includes(key)) {
      message.info('该页面不在本次评审范围内')
      return
    }
    setMenu(key)
    setDetailId(null)
  }

  const activeMenu: FactoryMenu =
    allowedMenus && allowedMenus.length && !allowedMenus.includes(menu) ? fallbackMenu : menu

  return (
    <div style={{ display: 'flex', height: '100%', background: '#fff' }}>
      <div
        style={{
          width: 200,
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #eef0f4',
          padding: '12px 0',
        }}
      >
        {groups.map((group) => (
          <div key={group.title || 'top'}>
            {group.title && <div style={{ padding: '10px 20px 6px', fontSize: 12, color: '#86909c' }}>{group.title}</div>}
            {group.items.map((item) => {
              const active = activeMenu === item.key
              return (
                <div
                  key={item.key}
                  onClick={() => onMenuClick(item.key)}
                  style={{
                    margin: group.title ? '2px 8px' : '8px 8px 2px',
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: active ? '#2f6bff' : '#333',
                    background: active ? '#f0f7ff' : 'transparent',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {item.icon}
                  {item.label}
                  {item.dot}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
        {activeMenu === 'overview' ? (
          <OverviewSection
            onGoMyGroups={() => onMenuClick('myGroups')}
            onGoApiKey={() => onMenuClick('apiKey')}
            onGoRecharge={
              onGoRecharge ??
              (() => message.info('请从顶部「费用」进入账户概览完成充值'))
            }
            onGoUsage={() => onMenuClick('usage')}
            onGoPlaza={() => onMenuClick('plaza')}
          />
        ) : activeMenu === 'plaza' ? (
          <ModelPlaza
            detailId={detailId}
            onDetailChange={setDetailId}
            onGoMyGroups={() => onMenuClick('myGroups')}
          />
        ) : activeMenu === 'apiKey' ? (
          <ApiKeyManage keys={accountKeys} onChange={setAccountKeys} />
        ) : activeMenu === 'experience' ? (
          <ExperiencePlayground
            keys={accountKeys}
            onOpenModelDetail={(m) => {
              setMenu('plaza')
              setDetailId(m.id)
            }}
          />
        ) : activeMenu === 'myGroups' ? (
          <MyModelGroups
            onOpenModelDetail={(model) => {
              setMenu('plaza')
              setDetailId(model.id)
            }}
          />
        ) : activeMenu === 'usage' ? (
          <UsageStats />
        ) : (
          <div style={{ padding: '120px 24px', textAlign: 'center' }}>
            <Empty description={`「${MENU_LABELS[activeMenu]}」不在本次原型范围内，当前仅演示模型广场、API Key 管理与模型分组`} />
          </div>
        )}
      </div>
    </div>
  )
}
