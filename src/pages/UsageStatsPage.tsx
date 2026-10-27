import { useMemo, useState } from 'react'
import { Button, DatePicker, Empty, Segmented, Select, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { MODEL_DATA } from './MySubscriptionPage'
import RequirementDot from '../components/RequirementDot'

const { RangePicker } = DatePicker

const COLOR_CACHED = '#6366f1'
const COLOR_UNCACHED = '#f6a92c'
const COLOR_OUTPUT = '#57b98a'

type UsagePoint = {
  date: string
  hour?: number
  cached: number
  uncached: number
  output: number
}

type UsageBucket = {
  date: string
  label: string
  cached: number
  uncached: number
  output: number
}

const MODEL_USAGE: Record<string, { hourly: UsagePoint[]; daily: UsagePoint[] }> = {
  'qwen3.8-max': {
    hourly: [{ date: '2026-08-24', hour: 10, cached: 20, uncached: 60, output: 90 }],
    daily: [{ date: '2026-08-24', cached: 20, uncached: 60, output: 90 }],
  },
}

type QueryMode = '按小时查询' | '按天查询'

const DEFAULT_RANGE: Record<QueryMode, [string, string]> = {
  按小时查询: ['2026-08-24 00:00', '2026-08-24 23:59'],
  按天查询: ['2026-08-18', '2026-08-24'],
}

const MAX_DAYS = 30

const ALL_MODELS = '__all__'

const CHART_H = 340
const Y_LABEL_W = 70

function fmtTick(v: number): string {
  return v === 0 ? '0' : v.toFixed(2)
}

interface Props {
  onBack: () => void
}

export default function UsageStatsPage({ onBack }: Props) {
  const [models, setModels] = useState<string[]>([ALL_MODELS])
  const [mode, setMode] = useState<QueryMode>('按小时查询')
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs(DEFAULT_RANGE['按小时查询'][0]),
    dayjs(DEFAULT_RANGE['按小时查询'][1]),
  ])
  // 点击「搜索」后才生效的查询条件（不做实时过滤）
  const [applied, setApplied] = useState<{
    models: string[]
    mode: QueryMode
    range: [dayjs.Dayjs, dayjs.Dayjs]
  }>({ models, mode, range })

  const handleModeChange = (v: QueryMode) => {
    setMode(v)
    const [s, e] = DEFAULT_RANGE[v]
    setRange([dayjs(s), dayjs(e)])
  }

  const buckets = useMemo(() => {
    const [start, end] = applied.range
    const activeModels = applied.models.includes(ALL_MODELS) ? MODEL_DATA.map((m) => m.model) : applied.models
    if (applied.mode === '按小时查询') {
      const list: UsageBucket[] = Array.from({ length: 24 }, (_, h) => ({
        date: '',
        label: `${h}:00`,
        cached: 0,
        uncached: 0,
        output: 0,
      }))
      activeModels.forEach((m) => {
        (MODEL_USAGE[m]?.hourly ?? []).forEach((p) => {
          const dt = dayjs(p.date).hour(p.hour ?? 0)
          if (dt.isBefore(start) || dt.isAfter(end)) return
          const b = list[p.hour ?? 0]
          b.cached += p.cached
          b.uncached += p.uncached
          b.output += p.output
        })
      })
      return list
    }
    const list: UsageBucket[] = []
    let cur = start.startOf('day')
    const endDay = end.startOf('day')
    while (!cur.isAfter(endDay, 'day') && list.length < MAX_DAYS) {
      list.push({
        date: cur.format('YYYY-MM-DD'),
        label: `${cur.month() + 1}/${cur.date()}`,
        cached: 0,
        uncached: 0,
        output: 0,
      })
      cur = cur.add(1, 'day')
    }
    activeModels.forEach((m) => {
      (MODEL_USAGE[m]?.daily ?? []).forEach((p) => {
        const b = list.find((x) => x.date === p.date)
        if (!b) return
        b.cached += p.cached
        b.uncached += p.uncached
        b.output += p.output
      })
    })
    return list
  }, [applied])

  const totalCached = buckets.reduce((s, b) => s + b.cached, 0)
  const totalUncached = buckets.reduce((s, b) => s + b.uncached, 0)
  const totalOutput = buckets.reduce((s, b) => s + b.output, 0)
  const totalTokens = totalCached + totalUncached + totalOutput
  const totalInput = totalCached + totalUncached
  const hitRate = totalInput > 0 ? `${Math.round((totalCached / totalInput) * 100)}%` : '-'
  const maxTotal = Math.max(0, ...buckets.map((b) => b.cached + b.uncached + b.output))
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((p) => maxTotal * p)

  return (
    <div style={{ background: '#fff', minHeight: '100%' }}>
      {/* 顶部返回栏 */}
      <div style={{ width: '100%', background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px' }}>
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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 40px' }}>
        {/* 工具栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <Select
            mode="multiple"
            showSearch
            placeholder="选择模型"
            value={models}
            onChange={(v) => {
              if (v.includes(ALL_MODELS) && !models.includes(ALL_MODELS)) setModels([ALL_MODELS])
              else if (models.includes(ALL_MODELS) && v.length > 1)
                setModels(v.filter((x) => x !== ALL_MODELS))
              else if (v.length === 0) setModels([ALL_MODELS])
              else setModels(v)
            }}
            maxTagCount="responsive"
            style={{ width: 280 }}
            options={[
              { label: '全部', value: ALL_MODELS },
              ...MODEL_DATA.map((m) => ({ label: m.model, value: m.model })),
            ]}
          />
          <Segmented
            options={['按小时查询', '按天查询']}
            value={mode}
            onChange={(v) => handleModeChange(v as QueryMode)}
          />
          <RangePicker
            value={range}
            showTime={mode === '按小时查询' ? { format: 'HH:mm' } : undefined}
            format={mode === '按小时查询' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'}
            onChange={(v) => {
              if (!v || !v[0] || !v[1]) return
              if (mode === '按天查询' && v[1].diff(v[0], 'day') >= MAX_DAYS) {
                message.error(`最多查询${MAX_DAYS}天`)
                return
              }
              setRange([v[0], v[1]])
            }}
          />
          <Button type="primary" onClick={() => setApplied({ models, mode, range })}>
            搜索
          </Button>
          <RequirementDot
            title="用量统计 · 查询条件需求说明"
            sections={[
              {
                label: '',
                items: [
                  '1.默认按小时查询，当前时间至前24h数据；',
                  '2.按小时搜索最多选择24h；',
                  '3.点击按天查询，默认搜索最近7天。按天搜索最多支持选择30天；',
                  '4.缓存命中率=缓存token/总token',
                  '5.模型默认该账户使用的全部，支持搜索其中某一个。',
                ],
              },
            ]}
          />
        </div>

        {/* 统计卡 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          <div style={{ flex: 1, background: '#f2f3f5', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ color: '#475569', fontSize: 14, marginBottom: 8 }}>总 token 数</div>
            <div style={{ color: '#1f2937', fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>
              {totalTokens}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
              输入: {totalInput}　输出: {totalOutput}　缓存: {totalCached}
            </div>
          </div>
          <div style={{ flex: 1, background: '#f2f3f5', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ color: '#475569', fontSize: 14, marginBottom: 8 }}>缓存命中率</div>
            <div style={{ color: '#1f2937', fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>
              {hitRate}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
              缓存/总输入 token： {totalCached} / {totalInput}
            </div>
          </div>
        </div>

        {/* 图表 */}
        <div style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>Tokens</div>
        {maxTotal === 0 ? (
          <div style={{ padding: '60px 0' }}>
            <Empty description="暂无数据" />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex' }}>
              {/* Y 轴刻度 */}
              <div style={{ width: Y_LABEL_W, position: 'relative', height: CHART_H }}>
                {ticks.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: `calc(${i * 25}% - 8px)`,
                      color: '#64748b',
                      fontSize: 13,
                    }}
                  >
                    {fmtTick(t)}
                  </span>
                ))}
              </div>
              {/* 绘图区 */}
              <div style={{ flex: 1, position: 'relative', height: CHART_H }}>
                {ticks.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${i * 25}%`,
                      borderTop: '1px dashed #e5e7eb',
                    }}
                  />
                ))}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>
                  {buckets.map((b) => {
                    const total = b.cached + b.uncached + b.output
                    const barH = (total / maxTotal) * CHART_H
                    const barW = applied.mode === '按小时查询' ? 20 : 36
                    return (
                      <div key={b.label} style={{ flex: 1, position: 'relative', height: '100%' }}>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: barW,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div
                            style={{ height: (b.output / maxTotal) * CHART_H, background: COLOR_OUTPUT }}
                          />
                          <div
                            style={{
                              height: (b.uncached / maxTotal) * CHART_H,
                              background: COLOR_UNCACHED,
                            }}
                          />
                          <div
                            style={{
                              height: (b.cached / maxTotal) * CHART_H,
                              background: COLOR_CACHED,
                            }}
                          />
                        </div>
                        {total > 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: barH + 8,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              color: '#475569',
                              fontSize: 14,
                            }}
                          >
                            {total}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            {/* X 轴标签 */}
            <div style={{ display: 'flex' }}>
              <div style={{ width: Y_LABEL_W }} />
              <div style={{ flex: 1, display: 'flex', marginTop: 10 }}>
                {buckets.map((b) => (
                  <span
                    key={b.label}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      color: '#475569',
                      fontSize: applied.mode === '按小时查询' ? 11 : 13,
                    }}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 图例 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 24 }}>
          {(
            [
              ['输入', COLOR_UNCACHED],
              ['缓存', COLOR_CACHED],
              ['输出', COLOR_OUTPUT],
            ] as const
          ).map(([label, color]) => (
            <span
              key={label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13 }}
            >
              <span style={{ width: 12, height: 3, borderRadius: 2, background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
