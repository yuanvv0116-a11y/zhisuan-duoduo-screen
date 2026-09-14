import { Modal, Tabs, Switch, Typography, Empty } from 'antd'
import type { ModelItem, Channel } from '../types'

const { Text } = Typography

interface Props {
  open: boolean
  model: ModelItem | null
  channels: Channel[]
  onClose: () => void
}

const labelStyle: React.CSSProperties = {
  width: 120,
  color: '#8c8c8c',
  flexShrink: 0,
  textAlign: 'left',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  padding: '8px 0',
  borderBottom: '1px solid #f0f0f0',
}

function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ flex: 1, color: '#333' }}>{children}</div>
    </div>
  )
}

function findChannel(channels: Channel[], channelId: string) {
  return channels.find((c) => c.id === channelId)
}

export default function ModelDetailModal({ open, model, channels, onClose }: Props) {
  if (!model) return null

  const basicPane = (
    <div>
      <KVRow label="模型名称">{model.name}</KVRow>
      <KVRow label="模型code">{model.modelCode || '—'}</KVRow>
      <KVRow label="模型生产商">{model.vendor || '—'}</KVRow>
      <KVRow label="模型分类">{model.type}</KVRow>
      <KVRow label="输入模态">
        {model.inputModals?.length ? model.inputModals.join('，') : '—'}
      </KVRow>
      <KVRow label="输出模态">
        {model.outputModals?.length ? model.outputModals.join('，') : '—'}
      </KVRow>
      <KVRow label="上下文窗口">{model.contextWindow ?? '—'}</KVRow>
      <KVRow label="最大输出Token数">{model.maxOutputToken ?? '—'}</KVRow>
      <KVRow label="是否支持深度思考">
        {model.deepThinking ? '支持' : '不支持'}
      </KVRow>
      <KVRow label="设为热门模型">{model.hot ? '热门' : '普通'}</KVRow>
      <KVRow label="是否上架">{model.online ? '已上架' : '未上架'}</KVRow>
      <KVRow label="排序">{model.sort ?? 99}</KVRow>
      <KVRow label="上架时间">{model.onlineAt || '—'}</KVRow>
      <KVRow label="文档标签">
        {model.docTags?.length ? model.docTags.join('，') : '—'}
      </KVRow>
      <KVRow label="模型简介">
        <span style={{ color: '#666', lineHeight: 1.6 }}>{model.intro || '—'}</span>
      </KVRow>
    </div>
  )

  const endpointsPane = (
    <div>
      {model.configEndpoints?.length ? (
        model.configEndpoints.map((ep) => (
          <KVRow key={ep} label={ep}>
            <Text>✓</Text>
          </KVRow>
        ))
      ) : (
        <Empty description="暂无配置端点" />
      )}
    </div>
  )

  const apiPane = (
    <div>
      {!model.apiConfigs?.length ? (
        <Empty description="暂无 API 配置" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {model.apiConfigs.map((cfg, idx) => {
            const channel = findChannel(channels, cfg.channelId)
            const cred =
              channel?.apiCredentials?.find((x) => x.id === cfg.credentialId) ??
              channel?.apiCredentials?.[0]
            const modelMultiplier = cfg.modelMultiplier ?? 1
            return (
              <div
                key={cfg.id}
                style={{
                  border: '1px solid #eef0f4',
                  borderRadius: 8,
                  padding: 16,
                  background: '#fafbfc',
                }}
              >
                {model.apiConfigs!.length > 1 && (
                  <div style={{ marginBottom: 8, fontWeight: 600, color: '#2f6bff' }}>
                    配置 {idx + 1}
                  </div>
                )}
                <KVRow label="渠道名称">{channel?.name || '—'}</KVRow>
                <KVRow label="API名称">{cred?.apiName || '—'}</KVRow>
                <KVRow label="API地址">{cred?.apiUrl || '—'}</KVRow>
                <KVRow label="是否可用">
                  <Switch checked={cfg.channelEnabled ?? true} disabled size="small" />
                </KVRow>
                <KVRow label="渠道模型">{cfg.modelCode || cfg.channelModelId || '—'}</KVRow>
                <KVRow label="Model code">{cfg.modelCode || '—'}</KVRow>
                <KVRow label="倍率名称">{cfg.multiplierName?.trim() || '—'}</KVRow>
                <KVRow label="模型倍率">{modelMultiplier}x</KVRow>
                {cfg.endpointMappings?.length ? (
                  <KVRow label="端点配置">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cfg.endpointMappings.map((m) => (
                        <div key={m.endpointKey}>
                          {m.endpointKey}：{m.mappingUrl || '—'}
                        </div>
                      ))}
                    </div>
                  </KVRow>
                ) : (
                  <KVRow label="端点配置">—</KVRow>
                )}
                <KVRow label="是否开启队列">
                  <Switch checked={cfg.queueEnabled} disabled size="small" />
                </KVRow>
                {cfg.queueEnabled && (
                  <>
                    <KVRow label="排队上限">{cfg.queueLimit ?? '—'}</KVRow>
                    <KVRow label="超时时间">
                      {cfg.timeout ?? '—'} 毫秒
                    </KVRow>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <Modal
      title="模型详情"
      width={760}
      centered
      open={open}
      onCancel={onClose}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="关闭"
      onOk={onClose}
      destroyOnHidden
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      <Tabs
        items={[
          { key: 'basic', label: '基本信息', children: basicPane },
          { key: 'endpoints', label: '配置端点', children: endpointsPane },
          { key: 'api', label: 'API配置', children: apiPane },
          {
            key: 'params',
            label: '参数配置',
            children: <Empty description="参数配置待补充" style={{ padding: '40px 0' }} />,
          },
          {
            key: 'features',
            label: '功能配置',
            children: <Empty description="功能配置待补充" style={{ padding: '40px 0' }} />,
          },
        ]}
      />
    </Modal>
  )
}
