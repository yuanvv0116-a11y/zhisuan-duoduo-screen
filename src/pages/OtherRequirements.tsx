import { Breadcrumb, Card, Typography, Button, Space, Divider, Switch } from 'antd'

const { Text, Paragraph, Title } = Typography

/** 控制台 / 费用页的原型 mockup，展示「申请退费」按钮位置与样式 */
function FeeConsoleMockup() {
  return (
    <div
      style={{
        marginTop: 12,
        border: '1px solid #eef0f4',
        borderRadius: 8,
        background: '#fff',
        padding: 16,
      }}
    >
      {/* 顶部导航模拟 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          paddingBottom: 12,
          borderBottom: '1px solid #eef0f4',
          marginBottom: 16,
        }}
      >
        <Text strong style={{ fontSize: 15 }}>
          控制台
        </Text>
        <Text type="secondary">Token工厂</Text>
        <Text type="secondary">应用广场</Text>
        <div style={{ flex: 1 }} />
        <Text type="secondary">费用</Text>
      </div>

      {/* 左侧菜单模拟 */}
      <div style={{ display: 'flex', gap: 24 }}>
        <div
          style={{
            width: 120,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <Text strong>费用管理</Text>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: '#f0f5ff',
              color: '#2f6bff',
              fontSize: 13,
            }}
          >
            账户概览
          </div>
          <Text type="secondary" style={{ fontSize: 13, paddingLeft: 10 }}>
            账户明细
          </Text>
          <Text type="secondary" style={{ fontSize: 13, paddingLeft: 10 }}>
            充值记录
          </Text>
          <Text type="secondary" style={{ fontSize: 13, paddingLeft: 10 }}>
            消费明细
          </Text>
          <Text type="secondary" style={{ fontSize: 13, paddingLeft: 10 }}>
            发票信息
          </Text>
        </div>

        {/* 右侧内容区 */}
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: 14 }}>
            账户概览
          </Text>
          <Divider style={{ margin: '12px 0' }} />

          {/* 净资产卡片 */}
          <div
            style={{
              background: '#fafafa',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text type="secondary" style={{ fontSize: 13 }}>
              账户净资产
            </Text>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 600, color: '#333' }}>
                ¥2,582.51
              </span>
            </div>
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    可用余额
                  </Text>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>¥2,582.51</div>
                </div>
                {/* 申请退费按钮 — 放在可用余额后面，小一点、不明显 */}
                <Button size="small" type="link" style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                  申请退费
                </Button>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  欠费金额
                </Text>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#ff4d4f' }}>
                  ¥0
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  余额预警
                </Text>
                <Switch size="small" />
              </div>
            </div>
          </div>

          {/* 充值区模拟 */}
          <div>
            <Text strong style={{ fontSize: 13 }}>
              账户充值
            </Text>
            <div
              style={{
                marginTop: 12,
                border: '1px solid #eef0f4',
                borderRadius: 8,
                padding: 16,
                background: '#fafafa',
              }}
            >
              <Space direction="vertical" size={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  在线充值
                </Text>
                <Space>
                  {['10元', '20元', '30元', '50元', '100元', '自定义金额'].map(
                    (label) => (
                      <Button
                        key={label}
                        size="small"
                        style={{
                          borderColor: label === '10元' ? '#2f6bff' : undefined,
                          color: label === '10元' ? '#2f6bff' : undefined,
                          background: label === '10元' ? '#f0f5ff' : undefined,
                        }}
                      >
                        {label}
                      </Button>
                    )
                  )}
                </Space>
              </Space>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const REQUIREMENTS: { title: string; items: string[]; mockup?: React.ReactNode }[] = [
  {
    title: '1. 【用户控制台】退费客服',
    items: [
      '在控制台、费用里增加一个退费客服入口，点击后展示客服的企业微信，支持关闭。',
      '加一个申请退费按钮，小一点，颜色浅一点。',
    ],
    mockup: <FeeConsoleMockup />,
  },
  {
    title: '2. 【管理后台】用户消费账单',
    items: [
      '在账单管理、用户消费账单中，增加「是否使用资源包」、「折扣」两列（导出时同步增加这两列）。',
      '并增加「是否使用资源包」筛选条件。',
    ],
  },
]

export default function OtherRequirements() {
  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: '其他需求' }]}
      />
      <Card variant="borderless" styles={{ body: { padding: 24 } }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 20 }}>
          其他需求
        </Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {REQUIREMENTS.map((req) => (
            <div key={req.title}>
              <Paragraph style={{ fontWeight: 600, marginBottom: 8 }}>
                {req.title}
              </Paragraph>
              <div
                style={{
                  background: '#fafafa',
                  border: '1px solid #eef0f4',
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                {req.items.map((item, idx) => (
                  <Paragraph
                    key={idx}
                    style={{
                      marginBottom:
                        idx === req.items.length - 1 && !req.mockup ? 0 : 8,
                    }}
                  >
                    <Text type="secondary" style={{ marginRight: 6 }}>
                      ·
                    </Text>
                    {item}
                  </Paragraph>
                ))}
                {req.mockup}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
