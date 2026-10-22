import { ArrowLeftOutlined } from '@ant-design/icons'
import { SHOW_ENTERPRISE } from '../constants'
import RequirementDot from '../components/RequirementDot'

interface Props {
  onBack: () => void
}

interface Block {
  type: 'p' | 'ul' | 'ol' | 'table' | 'quote' | 'code'
  text?: string
  items?: string[]
  subItems?: (string | string[])[]
  header?: string[]
  rows?: string[][]
  code?: string
  quote?: string
}

interface Section {
  title: string
  subtitle?: string
  blocks: Block[]
}

const SECTIONS: Section[] = [
  {
    title: '一、产品简介',
    blocks: [
      {
        type: 'p',
        text: 'Token Plan 套餐是智算多多推出的AI大模型订阅服务，支持文本生成、图像生成、视频生成等多种模型能力，兼容主流AI编程与智能体工具，提供团队管理后台与数据安全保障，确保调用平稳运行。',
      },
      {
        type: 'p',
        text: '通过统一计量体系，同一订阅可在多种AI工具中使用，无需为不同模型分别计费，简化企业AI算力管理。',
      },
    ],
  },
  {
    title: '二、核心特性',
    blocks: [
      {
        type: 'table',
        header: ['特性', '说明'],
        rows: [
          ['多模型灵活切换', '支持多模型按需切换'],
          ['兼容多种工具', '适配主流编程工具及热门 Agent 工具'],
          ['多档位套餐', '匹配不同使用强度'],
          ['团队管理', '提供管理后台，支持成员用量设置与分析'],
          ['预算可控', '支持按月或按年订阅，用量透明，预算可控'],
          ['数据安全', '承诺不使用对话数据进行模型训练，满足企业级数据隐私要求'],
        ],
      },
    ],
  },
  {
    title: '三、支持的模型',
    blocks: [
      {
        type: 'p',
        text: '请查看控制台「Token Plan  》我的订阅」页面，列表持续更新中。列表中模型及权益可能会根据运营情况进行调整，请以控制台页面最新展示或智算多多官方通知为准。',
      },
    ],
  },
  {
    title: '四、套餐与定价',
    subtitle: '4.1 Token Plan 版本',
    blocks: [
      {
        type: 'p',
        text: SHOW_ENTERPRISE
          ? 'Token Plan套餐分为个人版和企业版，每个个人账号仅支持购买1个个人套餐；每个企业账号支持购买个人套餐和企业套餐各1个。每种套餐提供多个档位，匹配不同使用强度，具体以页面展示为准。'
          : 'Token Plan套餐为个人版，每个个人账号仅支持购买1个个人套餐。每种套餐提供多个档位，匹配不同使用强度，具体以页面展示为准。',
      },
    ],
  },
  {
    title: '',
    blocks: [
      {
        type: 'p',
        text: '当用量超出套餐额度时，可购买加油包，补充额度。持有多个流量时，优先抵扣最近到期的用量包。',
      },
    ],
  },
  {
    title: '五、计费机制',
    subtitle: '5.1 计费说明',
    blocks: [
      { type: 'p', text: '不同模型的计费类型与单价不同，实际消耗以用量明细为准。' },
    ],
  },
  {
    title: '抵扣顺序',
    blocks: [
      {
        type: 'ol',
        items: [
          '优先从套餐的额度中抵扣',
          '套餐额度用尽后，从加油包中抵扣（持有多个时优先抵扣最近到期的）',
          '全部额度用尽后，从账户扣除相应费用（原价扣除），直至账户余额用尽停止使用。',
        ],
      },
    ],
  },
  {
    title: '六、购买流程',
    blocks: [
      {
        type: 'ol',
        items: [
          '登录智算多多平台控制台',
          '进入「Token Plan 」购买页面',
          '选择套餐类型订阅周期（按月/按年）',
          '确认订单信息并完成支付',
          '订阅成功后，在我的订阅中添加API KEY ',
          '查看可用模型，开始使用',
        ],
      },
    ],
  },
  {
    title: '续费',
    blocks: [
      {
        type: 'ul',
        items: [
          '手动续费：点击「续费」按钮，续费周期与订阅时一致',
        ],
      },
    ],
  },
  {
    title: '退订',
    blocks: [
      { type: 'p', text: '已有用量消耗后不可退订。未开始使用且未过期，7日内可联系客服退款。' },
    ],
  },
  {
    title: '七、创建 API Key',
    subtitle: '7.1 操作步骤',
    blocks: [
      {
        type: 'ol',
        items: [
          '登录智算多多平台控制台',
          '进入「Token Plan 」→「我的订阅」',
          '创建API Key，每个账户支持创建10个。',
        ],
      },
      {
        type: 'quote',
        quote: '安全提醒：API Key 是您调用服务的唯一凭证，请妥善保管，切勿分享给他人。',
      },
    ],
  },
  {
    title: '八、调用规则',
    blocks: [
      { type: 'code', code: '购买订阅 →  创建 API Key → 配置工具 → 发起调用 → 消耗额度' },
    ],
  },
  {
    title: '调用地址',
    blocks: [{ type: 'p', text: '可查看模型详情中配置规则' }],
  },
  {
    title: '调用限制',
    blocks: [
      {
        type: 'table',
        header: ['限制项', '说明'],
        rows: [
          ['使用范围', '仅限在兼容的 AI 编程和智能体工具中交互式使用'],
          ['频率限制', '每个 API Key 有调用频率限制，超出将返回限流错误'],
        ],
      },
    ],
  },
  {
    title: '使用规范',
    blocks: [
      {
        type: 'ul',
        items: [
          '仅限本人使用：API Key 仅限本人使用，不可共享或公开泄露',
          '合规使用：不得用于违法违规用途，不得生成违法或不良信息',
          '内容标识：在传播 AI 生成内容时，应以显著方式进行标识',
          '禁止行为：',
        ],
        subItems: [
          '不得对模型进行反向工程、解构或提取源代码',
          '不得利用本服务开发与智算多多存在竞争关系的产品',
          '不得将 API 调用额度转售、分许可或进行商业性分发',
          '不得利用本服务生成恶意软件、病毒或网络攻击工具',
          '不得通过技术手段突破模型的安全对齐机制（越狱行为）',
        ],
      },
      {
        type: 'quote',
        quote: '违规后果：违规使用可能导致订阅暂停或 API Key 封禁，已支付费用不予退还。',
      },
    ],
  },
  {
    title: '九、查看用量与数据',
    blocks: [
      {
        type: 'p',
        text: '登录控制台 » Token Plan ，在「我的订阅」页面可查看：',
      },
      {
        type: 'ul',
        items: [
          '总额度使用百分比',
          '额度重置时间',
          '额度分配情况',
          '加油包的状态和到期时间',
        ],
      },
    ],
  },
  {
    title: '团队管理',
    blocks: [
      {
        type: 'p',
        text: '企业账户可在账号管理中开通团队管理，支持为团队成员分配用量',
      },
    ],
  },
  {
    title: '十、联系我们',
    blocks: [
      {
        type: 'p',
        text: '如您在使用过程中有任何疑问或需要技术支持，可通过以下方式联系我们：',
      },
      {
        type: 'ul',
        items: ['官方网站：https://zsdodo.com/', '技术支持邮箱：service@zsdodo.com'],
      },
      {
        type: 'quote',
        quote:
          '免责声明：本指南仅供参考，具体服务内容、价格及规则以智算多多平台实际展示及双方签署的协议为准。智算多多保留根据运营需要对产品及服务进行调整的权利。',
      },
    ],
  },
]

const STYLES = {
  pageContent: {
    maxWidth: 960 as const,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  h1: {
    fontSize: 26,
    fontWeight: 600,
    color: '#1a1a1a',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  date: {
    textAlign: 'center' as const,
    color: '#999',
    fontSize: 13,
    marginBottom: 40,
  },
  content: {
    fontSize: 14,
    lineHeight: 1.8,
    color: '#333',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #eef0f4',
  },
  subTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#2f6bff',
    margin: '16px 0 8px',
  },
  p: { marginBottom: 10 },
  ul: { marginBottom: 10, paddingLeft: 24 },
  ol: { marginBottom: 10, paddingLeft: 24 },
  li: { marginBottom: 4 },
  subUl: { margin: '4px 0 8px', paddingLeft: 24, listStyleType: 'circle' as const },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: 14,
    fontSize: 13,
  },
  th: {
    padding: '10px 14px',
    background: '#f7f9fc',
    border: '1px solid #eef0f4',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: '#111827',
  },
  td: {
    padding: '10px 14px',
    border: '1px solid #eef0f4',
    color: '#333',
  },
  quote: {
    padding: '12px 16px',
    marginBottom: 14,
    background: '#fff7e6',
    borderLeft: '4px solid #faad14',
    borderRadius: 4,
    fontSize: 13,
    color: '#874d00',
    lineHeight: 1.7,
  },
  code: {
    padding: '14px 20px',
    marginBottom: 14,
    background: '#f6f8fa',
    borderRadius: 8,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 13,
    color: '#111827',
    letterSpacing: 0.3,
  },
}

function renderBlock(block: Block, key: number) {
  if (block.type === 'p' && block.text) {
    return (
      <p key={key} style={STYLES.p}>
        {block.text}
      </p>
    )
  }
  if (block.type === 'ul' && block.items) {
    const last = block.items[block.items.length - 1]
    const hasSub = /：|:$/.test(last ?? '')
    return (
      <ul key={key} style={STYLES.ul}>
        {block.items.map((item, i) => {
          const isLast = i === block.items!.length - 1
          return (
            <li key={i} style={STYLES.li}>
              {item}
              {isLast && hasSub && block.subItems && (
                <ul style={STYLES.subUl}>
                  {block.subItems.map((sub, j) => (
                    <li key={j} style={STYLES.li}>
                      {sub}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    )
  }
  if (block.type === 'ol' && block.items) {
    return (
      <ol key={key} style={STYLES.ol}>
        {block.items.map((item, i) => (
          <li key={i} style={STYLES.li}>
            {item}
          </li>
        ))}
      </ol>
    )
  }
  if (block.type === 'table' && block.header && block.rows) {
    return (
      <div key={key} style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={STYLES.table}>
          <thead>
            <tr>
              {block.header.map((h, i) => (
                <th key={i} style={STYLES.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={STYLES.td}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (block.type === 'quote' && block.quote) {
    return (
      <div key={key} style={STYLES.quote}>
        {block.quote}
      </div>
    )
  }
  if (block.type === 'code' && block.code) {
    return (
      <div key={key} style={STYLES.code}>
        {block.code}
      </div>
    )
  }
  return null
}

export default function UsageGuidePage({ onBack }: Props) {
  return (
    <div>
      {/* 顶部返回栏 */}
      <div
        style={{
          width: '100%',
          background: '#fff',
          borderBottom: '1px solid #e8ecf0',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '14px 24px',
          }}
        >
          <span
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 14,
              color: '#5a6474',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            <ArrowLeftOutlined />
            返回
          </span>
        </div>
      </div>

      {/* 正文 */}
      <div style={STYLES.pageContent}>
        <h1 style={STYLES.h1}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            智算多多 Token Plan 套餐 使用指南
            <RequirementDot
              title="使用指南页需求说明"
              sections={[
                {
                  label: '',
                  items: [
                    '1. 页面展示《Token Plan 套餐使用指南》全文，章节包含：产品简介、核心特性、支持的模型、套餐与定价、计费机制、购买流程、创建 API Key、调用规则、查看用量与数据、联系我们',
                    '2. 顶栏提供「返回」按钮回到上一页；指南标题与最后更新日期居中展示',
                    '3. 套餐版本说明与企业版开关联动：开启时描述个人/企业账号可购数量限制，关闭时仅描述个人版',
                    '4. 额度超出处理与抵扣顺序：套餐额度 → 加油包（持有多个时优先抵扣最近到期的）→ 现金账户按原价扣费直至余额用尽',
                    '5. 购买流程 6 步指引；续费为手动续费、周期与订阅一致；退订规则「已有用量消耗后不可退订，未开始使用且未过期 7 日内可联系客服退款」',
                    '6. 调用规则：调用链路（购买订阅 → 创建 API Key → 配置工具 → 发起调用 → 消耗额度）、每 Key 频率限制、使用规范（仅限本人/合规/内容标识/禁止行为）与违规后果',
                    '7. 支持的模型与套餐权益以控制台页面最新展示或智算多多官方通知为准',
                  ],
                },
              ]}
            />
          </span>
        </h1>
        <p style={STYLES.date}>最后更新：2026 年 8 月 23 日</p>

        <div style={STYLES.content}>
          {SECTIONS.map((section, i) => (
            <div key={i} style={STYLES.section}>
              <h2
                style={
                  /^\d+\.\d+/.test(section.title)
                    ? STYLES.subTitle
                    : STYLES.sectionTitle
                }
              >
                {section.title}
              </h2>
              {section.blocks.map((block, j) => renderBlock(block, j))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
