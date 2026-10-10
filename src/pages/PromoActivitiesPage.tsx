import { useMemo } from 'react'
import { Button, Empty, Tag, Typography, message } from 'antd'
import {
  ClockCircleOutlined,
  FireOutlined,
  LinkOutlined,
  RiseOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { isPromoCampaignActive, promoEffectiveRate, usePromoRebateRules } from '../store'
import type { ModelRebateRule } from '../types'
import { PROMO_ACTIVITY_PAGE_LABEL } from '../types'

const { Title, Paragraph } = Typography

interface Props {
  onGoConsole?: () => void
}

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2f6bff 0%, #597ef7 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const PROMO_MODEL_INTRO: Record<string, string> = {
  'DODO-OG-G-6-Astra': '旗舰大模型，长上下文与复杂推理之选',
  'DODO-OG-G-5-6-Sol': '全场景均衡，高性价比之选',
  'DODO-Vision-4': '视觉理解与多模态图文分析',
  'DODO-Veo-Fast': '快速视频生成，出片更快',
  'DeepSeek-V4': '开源实力派，强推理、低价格',
  'GLM-5.3': '对话与工具调用全能选手',
  'Kimi-K3': '超长上下文智能助手',
  'Qwen3.8-Max': '生态成熟的通用大模型',
  'Doubao-Seed-2.0': '多模态通用大模型',
}

const fmtDate = (d?: string) => (d ? d.replace(/-/g, '.') : '')

function ActivityCard({ rule, onGoConsole }: { rule: ModelRebateRule; onGoConsole?: () => void }) {
  const inCampaign = isPromoCampaignActive(rule)
  const nowRate = promoEffectiveRate(rule)
  const isExternal = rule.page === 'external'

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 16,
        border: inCampaign ? '1px solid #ffbb96' : '1px solid #e8edf6',
        background: inCampaign ? 'linear-gradient(180deg, #fff9f3 0%, #ffffff 46%)' : '#fff',
        boxShadow: '0 20px 48px rgba(15,35,95,.07)',
        padding: '26px 28px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {inCampaign && (
        <span
          style={{
            position: 'absolute',
            top: 18,
            right: -34,
            transform: 'rotate(38deg)',
            background: 'linear-gradient(90deg, #fa541c 0%, #fa8c16 100%)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            padding: '4px 40px',
          }}
        >
          限时加倍中
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            background: inCampaign ? '#fff1e6' : '#eef4ff',
            color: inCampaign ? '#fa541c' : '#2f6bff',
          }}
        >
          <RocketOutlined />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#141a26' }}>{rule.modelName}</div>
          <div style={{ fontSize: 13, color: '#8a93a6', marginTop: 2 }}>
            {PROMO_MODEL_INTRO[rule.modelName] ?? (rule.category === 'self' ? '智算多多主推模型' : '平台接入的主流模型')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Tag style={{ borderRadius: 999, margin: 0 }}>{rule.multiplierName}</Tag>
        <Tag color={isExternal ? 'purple' : 'blue'} style={{ borderRadius: 999, margin: 0 }}>
          {PROMO_ACTIVITY_PAGE_LABEL[rule.page]}
        </Tag>
        <Tag color={rule.category === 'self' ? 'geekblue' : 'default'} style={{ borderRadius: 999, margin: 0 }}>
          {rule.category === 'self' ? '主推模型' : '三方模型'}
        </Tag>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          padding: '14px 16px',
          borderRadius: 12,
          background: inCampaign ? '#fff4ea' : '#f6f8fc',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#8a93a6', marginBottom: 4 }}>
            {inCampaign ? '加倍返佣比例' : '返佣比例'}
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1,
              color: inCampaign ? '#d4380d' : '#141a26',
            }}
          >
            {nowRate}
            <span style={{ fontSize: 16, fontWeight: 700 }}>%</span>
          </span>
        </div>
        {inCampaign && (
          <div style={{ fontSize: 13, color: '#8a5a2b' }}>
            <RiseOutlined style={{ marginRight: 4 }} />
            标准 {rule.rate}% · 活动期内按加倍比例计佣
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, color: '#6b7385' }}>
        <ClockCircleOutlined style={{ marginRight: 6 }} />
        {rule.campaign && rule.campaignStartAt && rule.campaignEndAt
          ? `推广时间：${fmtDate(rule.campaignStartAt)} - ${fmtDate(rule.campaignEndAt)}`
          : '推广时间：长期有效'}
      </div>

      {isExternal ? (
        <Button
          block
          href={rule.activityUrl}
          target="_blank"
          rel="noreferrer"
          icon={<LinkOutlined />}
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          前往活动页面
        </Button>
      ) : (
        <Button
          block
          type="primary"
          icon={<FireOutlined />}
          style={{ borderRadius: 8, fontWeight: 600 }}
          onClick={() => {
            if (onGoConsole) {
              onGoConsole()
              return
            }
            message.info('请前往控制台 · 推广合伙人 获取专属推广链接')
          }}
        >
          立即推广赚佣金
        </Button>
      )}
    </div>
  )
}

export default function PromoActivitiesPage({ onGoConsole }: Props) {
  const rules = usePromoRebateRules()
  const activeRules = useMemo(() => rules.filter((r) => r.status === 'on'), [rules])
  const sorted = useMemo(
    () =>
      activeRules
        .slice()
        .sort(
          (a, b) =>
            Number(isPromoCampaignActive(b)) - Number(isPromoCampaignActive(a)) ||
            promoEffectiveRate(b) - promoEffectiveRate(a),
        ),
    [activeRules],
  )
  const campaignCount = useMemo(() => activeRules.filter((r) => isPromoCampaignActive(r)).length, [activeRules])

  return (
    <div style={{ background: '#fff' }}>
      <section
        style={{
          background:
            'radial-gradient(56% 46% at 50% -8%, #e7efff 0%, rgba(231,239,255,0) 70%), linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
          padding: '88px 24px 64px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {campaignCount > 0 && (
            <div style={{ marginBottom: 28 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 18px',
                  borderRadius: 999,
                  background: '#fff7f0',
                  border: '1px solid #ffbb96',
                  color: '#d4380d',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#fa541c',
                    display: 'inline-block',
                  }}
                />
                {campaignCount} 场限时加倍返佣活动进行中
              </span>
            </div>
          )}
          <div
            style={{
              color: '#2f6bff',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 6,
              marginBottom: 20,
            }}
          >
            推 广 活 动 中 心
          </div>
          <Title level={1} style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.25, margin: 0 }}>
            正在推广的<span style={gradientText}>返佣活动</span>
          </Title>
          <Paragraph
            style={{
              color: '#7c8698',
              fontSize: 18,
              lineHeight: 1.9,
              marginTop: 20,
              marginBottom: 0,
            }}
          >
            精选模型限时加倍返佣，选好模型即可开推；活动比例、推广时间一目了然
          </Paragraph>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 88px' }}>
        {sorted.length === 0 ? (
          <Empty description="暂无进行中的推广活动" style={{ padding: '80px 0' }} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 24,
            }}
          >
            {sorted.map((r) => (
              <ActivityCard key={r.id} rule={r} onGoConsole={onGoConsole} />
            ))}
          </div>
        )}
        <div style={{ textAlign: 'center', color: '#98a1b3', fontSize: 13, marginTop: 40 }}>
          活动期内消耗按加倍返佣比例计佣，活动结束自动回落；计佣只算现金消耗，代金券抵扣部分不计佣。
        </div>
      </section>
    </div>
  )
}
