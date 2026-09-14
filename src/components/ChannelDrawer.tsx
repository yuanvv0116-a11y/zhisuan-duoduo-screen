import { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Space,
  Typography,
  message,
} from 'antd'
import type { Channel } from '../types'
import RequirementDot from './RequirementDot'

const { Text } = Typography

interface Props {
  open: boolean
  channel: Channel | null
  onClose: () => void
  onSubmit: (data: Channel) => void
}

const emptyChannel = (): Channel => ({
  id: '',
  name: '',
  apiCredentials: [],
  contact: '',
  phone: '',
  remark: '',
  operator: '',
  createdAt: '',
  settlement: { method: 'prepaid', currency: 'CNY', taxRate: 6 },
  models: [],
})

export default function ChannelModal({
  open,
  channel,
  onClose,
  onSubmit,
}: Props) {
  const [form] = Form.useForm()
  const [draft, setDraft] = useState<Channel>(emptyChannel())

  useEffect(() => {
    if (open) {
      const init = channel ? structuredClone(channel) : emptyChannel()
      setDraft(init)
      form.setFieldsValue({
        name: init.name,
        contact: init.contact,
        phone: init.phone,
        remark: init.remark,
      })
    }
  }, [open, channel, form])

  const handleSave = async () => {
    try {
      const base = await form.validateFields()
      onSubmit({
        ...draft,
        name: base.name,
        contact: base.contact,
        phone: base.phone,
        remark: base.remark,
      })
    } catch {
      message.error('请检查必填项')
    }
  }

  return (
    <Modal
      title={
        channel ? (
          '编辑渠道'
        ) : (
          <Space size={6}>
            新增渠道
            <RequirementDot
              title="新增渠道"
              sections={[
                {
                  label: '',
                  items: [
                    '1.增加渠道联系人，选填，50字内；',
                    '2.增加联系方式，选填，50字内；',
                    '3.API 名称、API 地址、API Key、备注、状态不在本弹窗填写，保存渠道后在渠道列表操作列点击「添加API」进行配置，一个渠道可配置多组。',
                    '4.渠道状态去掉：启用/停用改由每组 API 配置维护，在「添加API」弹窗或列表子行中设置。',
                  ],
                },
              ]}
            />
          </Space>
        )
      }
      width={520}
      centered
      open={open}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      onOk={handleSave}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark>
        <Form.Item
          name="name"
          label="渠道名称"
          rules={[{ required: true, message: '请输入渠道名称' }]}
        >
          <Input placeholder="如：阿里云百炼" />
        </Form.Item>

        <div
          style={{
            background: '#f7f8fa',
            border: '1px solid #eef0f4',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            保存渠道后，可在渠道列表操作列点击「添加API」
          </Text>
        </div>

        <Form.Item name="contact" label="渠道联系人">
          <Input placeholder="选填，如：张工" />
        </Form.Item>
        <Form.Item name="phone" label="联系方式">
          <Input placeholder="选填，电话 / 邮箱 / 微信等" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="选填，渠道说明、对接注意事项等" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
