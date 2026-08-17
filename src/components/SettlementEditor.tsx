import { Form, Select, InputNumber, Input, Card, Typography } from 'antd'
import type { SettlementConfig } from '../types'
import { SETTLEMENT_METHODS, CURRENCIES, BILLING_CYCLES } from '../constants'

const { Text } = Typography

interface Props {
  value: SettlementConfig
  onChange: (v: SettlementConfig) => void
}

export default function SettlementEditor({ value, onChange }: Props) {
  const set = (patch: Partial<SettlementConfig>) =>
    onChange({ ...value, ...patch })

  const activeMethod = SETTLEMENT_METHODS.find((s) => s.value === value.method)

  return (
    <Form layout="vertical">
      <Form.Item label="结算方式" required>
        <Select
          value={value.method}
          onChange={(v) => set({ method: v })}
          options={SETTLEMENT_METHODS.map((s) => ({
            value: s.value,
            label: s.label,
          }))}
        />
        {activeMethod && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {activeMethod.desc}
          </Text>
        )}
      </Form.Item>

      <Form.Item label="结算币种">
        <Select
          value={value.currency}
          onChange={(v) => set({ currency: v })}
          options={CURRENCIES}
        />
      </Form.Item>

      {(value.method === 'postpaid' || value.method === 'monthly') && (
        <Form.Item label="结算周期">
          <Select
            value={value.billingCycle}
            onChange={(v) => set({ billingCycle: v })}
            options={BILLING_CYCLES}
          />
        </Form.Item>
      )}

      {value.method === 'credit' && (
        <Form.Item label="授信额度">
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            addonAfter={value.currency}
            value={value.creditLimit}
            onChange={(v) => set({ creditLimit: v ?? undefined })}
          />
        </Form.Item>
      )}

      <Form.Item label="税率 (%)">
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          max={100}
          value={value.taxRate}
          onChange={(v) => set({ taxRate: v ?? undefined })}
        />
      </Form.Item>

      <Form.Item label="结算备注">
        <Input.TextArea
          rows={2}
          value={value.remark}
          onChange={(e) => set({ remark: e.target.value })}
          placeholder="如：每月1日出账，账期30天"
        />
      </Form.Item>

      <Card size="small" style={{ background: '#fafafa' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          支持的结算方式：预付费、后付费、授信额度、包年包月，覆盖算力平台主流结算模式。
        </Text>
      </Card>
    </Form>
  )
}
