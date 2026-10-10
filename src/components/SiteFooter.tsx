import { MailOutlined, EnvironmentOutlined } from '@ant-design/icons'

function QrPlaceholder({ seed }: { seed: number }) {
  const cells: { x: number; y: number }[] = []
  const size = 21
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7)
      if (!inFinder && rand() > 0.52) cells.push({ x, y })
    }
  }
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width={7} height={7} fill="#fff" />
      <rect x={fx + 1} y={fy + 1} width={5} height={5} fill="#000" />
      <rect x={fx + 2} y={fy + 2} width={3} height={3} fill="#fff" />
    </g>
  )
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={64}
      height={64}
      style={{ display: 'block', background: '#fff', borderRadius: 4, padding: 4, boxSizing: 'content-box' }}
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="#000" />
      ))}
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
    </svg>
  )
}

const linkStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.65)',
  fontSize: 13,
  cursor: 'pointer',
}

const linkGroups: string[][] = [
  ['合作与生态', '隐私协议', '用户协议'],
  ['文档中心', '关于我们'],
]

export default function SiteFooter() {
  return (
    <footer
      style={{
        background: 'linear-gradient(180deg, #0a1220 0%, #05080f 100%)',
        padding: '48px 24px 0',
        marginTop: 30,
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 48,
          flexWrap: 'wrap',
          paddingBottom: 40,
        }}
      >
        <div style={{ display: 'flex', gap: 72, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: '#fff',
                  color: '#0a1220',
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                智
              </span>
              <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>智算多多</span>
            </div>
            <div style={{ display: 'flex', gap: 40 }}>
              {linkGroups.map((group) => (
                <div key={group[0]} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {group.map((t) => (
                    <span key={t} style={linkStyle}>
                      {t}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>联系我们</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <MailOutlined style={{ color: '#2f6bff' }} /> 官方邮箱：service@zsdodo.com
              </span>
              <span style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <EnvironmentOutlined style={{ color: '#2f6bff' }} /> 公司地址：北京市丰台区南四环西路188号总部基地三区国联股份数字经济总部
              </span>
            </div>
          </div>
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>关注我们</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: '公众号', seed: 20250592 },
              { label: '视频号', seed: 110106 },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <QrPlaceholder seed={item.seed} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '18px 0',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
        }}
      >
        © 2025 北京智算多多信息科技有限公司版权所有&nbsp;&nbsp;&nbsp;京ICP备 2025150592号-1&nbsp;&nbsp;&nbsp;京公网安备11010602202532号
      </div>
    </footer>
  )
}
