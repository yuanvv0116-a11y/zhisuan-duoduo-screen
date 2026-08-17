import { useState } from 'react'
import { Modal, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

export interface RequirementSection {
  /** 小节标题，如「输入格式」「验证规则」「交互逻辑」「默认值」「注意点」 */
  label: string
  /** 小节内容，字符串或多条要点 */
  items: string | string[]
}

interface Props {
  /** 需求点标题，如「API Key 脱敏展示」 */
  title: string
  /** 结构化需求内容 */
  sections: RequirementSection[]
}

export default function RequirementDot({ title, sections }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span
        className="req-dot"
        title="点击查看需求点"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      />
      <Modal
        title={title}
        open={open}
        onCancel={(e) => {
          e.stopPropagation()
          setOpen(false)
        }}
        footer={null}
        width={600}
        centered
        destroyOnHidden
      >
        {sections.map((sec) => (
          <div key={sec.label} style={{ marginBottom: 16 }}>
            {sec.label && (
              <Title level={5} style={{ marginBottom: 8 }}>
                {sec.label}
              </Title>
            )}
            {Array.isArray(sec.items) ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {sec.items.map((it, i) => (
                  <li key={i} style={{ marginBottom: 4, lineHeight: 1.7 }}>
                    <Text>{it}</Text>
                  </li>
                ))}
              </ul>
            ) : (
              <Paragraph style={{ margin: 0, lineHeight: 1.7 }}>{sec.items}</Paragraph>
            )}
          </div>
        ))}
      </Modal>
    </>
  )
}
