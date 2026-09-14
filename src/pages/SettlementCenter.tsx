import { useMemo } from 'react'
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd'
import { useChannels } from '../store'
import {
  SETTLEMENT_METHODS,
  settlementLabel,
  billingLabel,
} from '../constants'
import type { Channel } from '../types'

const { Title, Text } = Typography

interface ModelRow {
  key: string
  channel: string
  modelName: string
  endpoint: string
  billing: string
  settlement: string
}

export default function SettlementCenter() {
  const { channels } = useChannels()

  const stats = useMemo(() => {
    const totalModels = channels.reduce((s, c) => s + c.models.length, 0)
    const enabledApiCount = channels.reduce(
      (s, c) =>
        s + (c.apiCredentials ?? []).filter((x) => x.status === 'enabled').length,
      0,
    )
    const byMethod = SETTLEMENT_METHODS.map((m) => ({
      ...m,
      count: channels.filter((c) => c.settlement.method === m.value).length,
    }))
    return { totalModels, enabledApiCount, byMethod }
  }, [channels])

  const rows: ModelRow[] = useMemo(() => {
    const out: ModelRow[] = []
    channels.forEach((c: Channel) => {
      c.models.forEach((m) => {
        out.push({
          key: `${c.id}-${m.id}`,
          channel: c.name,
          modelName: m.modelName,
          endpoint:
            c.apiCredentials?.[0]?.apiName || c.apiCredentials?.[0]?.apiUrl || '—',
          billing: billingLabel(m.billingType),
          settlement: settlementLabel(c.settlement.method),
        })
      })
    })
    return out
  }, [channels])

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="渠道总数" value={channels.length} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="启用 API" value={stats.enabledApiCount} suffix="组" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="接入模型" value={stats.totalModels} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="结算方式数"
              value={SETTLEMENT_METHODS.length}
              suffix="种"
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }} title="结算方式分布">
        <Row gutter={16}>
          {stats.byMethod.map((m) => (
            <Col span={6} key={m.value}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Text strong>{m.label}</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color="blue">{m.count} 个渠道</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {m.desc}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card style={{ marginTop: 16 }} title="模型计费与结算明细">
        <Table<ModelRow>
          rowKey="key"
          dataSource={rows}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: '暂无模型，请先在渠道管理中接入模型' }}
          columns={[
            { title: '所属渠道', dataIndex: 'channel', width: 160 },
            { title: '模型', dataIndex: 'modelName', width: 160 },
            {
              title: '接入地址',
              dataIndex: 'endpoint',
              render: (v) => <Tag>{v}</Tag>,
            },
            {
              title: '计费方式',
              dataIndex: 'billing',
              render: (v) => <Tag color="geekblue">{v}</Tag>,
            },
            {
              title: '结算方式',
              dataIndex: 'settlement',
              render: (v) => <Tag color="blue">{v}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  )
}
