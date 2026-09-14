import { useEffect, useState } from 'react'
import { Modal, Radio, InputNumber, Switch, Typography, Row, Col, Empty, Space, message } from 'antd'
import type { CostPriceType, ModelCostConfig } from '../types'

const { Text } = Typography

interface CostModelRef {
  id: string
  costConfig?: ModelCostConfig
}

interface Props {
  open: boolean
  model: CostModelRef | null
  onClose: () => void
  onSubmit: (id: string, config: ModelCostConfig) => void
}

const PRICE_TYPES: { value: CostPriceType; label: string }[] = [
  { value: 'token', label: '按token计费' },
  { value: 'token_busy_idle', label: '按token忙闲时计费' },
  { value: 'token_ladder', label: '按token阶梯计费' },
  { value: 'image_quality', label: '按图片质量计费' },
  { value: 'image_token', label: '按图片token计费' },
  { value: 'video_quality', label: '按视频质量计费' },
  { value: 'video_quality_token', label: '按视频质量token计费' },
  { value: 'vidu_image_quality', label: 'vidu按图片质量计费' },
  { value: 'video_ai_points', label: '按拍我AI视频积分计费' },
]

const emptyConfig = (): ModelCostConfig => ({
  priceType: 'token',
  inputPrice: undefined,
  outputPrice: undefined,
  cachedEnabled: true,
  cachedPrice: undefined,
  cacheCreatePrice: undefined,
  cacheReadPrice: undefined,
  showReferencePrice: false,
})

export default function ModelCostModal({ open, model, onClose, onSubmit }: Props) {
  const [config, setConfig] = useState<ModelCostConfig>(emptyConfig())

  useEffect(() => {
    if (open) {
      setConfig(model?.costConfig ? structuredClone(model.costConfig) : emptyConfig())
    }
  }, [open, model])

  const patch = (p: Partial<ModelCostConfig>) => setConfig((prev) => ({ ...prev, ...p }))

  const handleSave = () => {
    if (!model) return
    if (config.priceType === 'token') {
      if (config.inputPrice == null || config.outputPrice == null) {
        message.error('请填写输入价格和输出价格')
        return
      }
      if (config.cachedEnabled) {
        if (
          config.cachedPrice == null ||
          config.cacheCreatePrice == null ||
          config.cacheReadPrice == null
        ) {
          message.error('请完善 Cached 相关价格')
          return
        }
      }
    }
    onSubmit(model.id, config)
    message.success('定价已保存')
  }

  const tokenPane = (
    <div>
      <div style={{ marginBottom: 16, color: '#5a6474' }}>
        按Token消耗计费：所有请求使用相同的输入和输出价格
      </div>
      <Row gutter={24}>
        <Col span={12}>
          <div style={{ marginBottom: 6 }}>
            <Text type="danger">*</Text> 输入价格（¥/Mt）
          </div>
          <InputNumber
            min={0}
            style={{ width: '100%', marginBottom: 16 }}
            value={config.inputPrice}
            onChange={(v) => patch({ inputPrice: v ?? undefined })}
          />
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: 6 }}>
            <Text type="danger">*</Text> 输出价格（¥/Mt）
          </div>
          <InputNumber
            min={0}
            style={{ width: '100%', marginBottom: 16 }}
            value={config.outputPrice}
            onChange={(v) => patch({ outputPrice: v ?? undefined })}
          />
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>
          <Text type="danger">*</Text> 输是否开启Cached
        </span>
        <Switch
          checked={config.cachedEnabled}
          onChange={(checked) => patch({ cachedEnabled: checked })}
        />
      </div>

      {config.cachedEnabled && (
        <>
          <div style={{ marginBottom: 6 }}>
            <Text type="danger">*</Text> Cached价格（¥/Mt）
          </div>
          <InputNumber
            min={0}
            style={{ width: '100%', marginBottom: 16 }}
            value={config.cachedPrice}
            onChange={(v) => patch({ cachedPrice: v ?? undefined })}
          />

          <Row gutter={24}>
            <Col span={12}>
              <div style={{ marginBottom: 6 }}>
                <Text type="danger">*</Text> 显式缓存创建价格（¥/Mt）
              </div>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                value={config.cacheCreatePrice}
                onChange={(v) => patch({ cacheCreatePrice: v ?? undefined })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 6 }}>
                <Text type="danger">*</Text> 显式缓存读取价格（¥/Mt）
              </div>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                value={config.cacheReadPrice}
                onChange={(v) => patch({ cacheReadPrice: v ?? undefined })}
              />
            </Col>
          </Row>
        </>
      )}
    </div>
  )

  return (
    <Modal
      title="价格配置"
      width={720}
      centered
      open={open}
      onCancel={onClose}
      okText="保存定价"
      cancelText="取消"
      onOk={handleSave}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16, color: '#8c8c8c' }}>请根据多种价格类型进行价格配置</div>

      <Radio.Group
        value={config.priceType}
        onChange={(e) => patch({ priceType: e.target.value })}
        style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}
      >
        {PRICE_TYPES.map((t) => (
          <Radio key={t.value} value={t.value}>
            {t.label}
          </Radio>
        ))}
      </Radio.Group>

      {config.priceType === 'token' ? (
        tokenPane
      ) : (
        <Empty description="该计费类型的价格配置待补充" />
      )}

      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>是否展示参考价格</span>
        <Switch
          checked={config.showReferencePrice ?? false}
          onChange={(checked) => patch({ showReferencePrice: checked })}
        />
      </div>
    </Modal>
  )
}
