import { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Switch,
  Space,
  message,
} from 'antd'
import type { Channel } from '../types'
import RequirementDot from './RequirementDot'

interface Props {
  open: boolean
  channel: Channel | null
  onClose: () => void
  onSubmit: (data: Channel) => void
}

const emptyChannel = (): Channel => ({
  id: '',
  name: '',
  apiName: '',
  apiUrl: '',
  apiKey: '',
  status: 'enabled',
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
        apiName: init.apiName,
        apiUrl: init.apiUrl,
        apiKey: init.apiKey,
        contact: init.contact,
        phone: init.phone,
        remark: init.remark,
        status: init.status === 'enabled',
      })
    }
  }, [open, channel, form])

  const handleSave = async () => {
    try {
      const base = await form.validateFields()
      onSubmit({
        ...draft,
        name: base.name,
        apiName: base.apiName,
        apiUrl: base.apiUrl,
        apiKey: base.apiKey,
        contact: base.contact,
        phone: base.phone,
        remark: base.remark,
        status: base.status ? 'enabled' : 'disabled',
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
        <Form.Item
          name="apiName"
          label="API 名称"
          rules={[{ required: true, message: '请输入 API 名称' }]}
        >
          <Input placeholder="如：阿里云-华东主站" />
        </Form.Item>
        <Form.Item
          name="apiUrl"
          label="API 地址"
          rules={[{ required: true, message: '请输入 API 地址' }]}
        >
          <Input placeholder="https://api.example.com/v1" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label="API Key"
          rules={[{ required: true, message: '请输入 API Key' }]}
        >
          <Input.Password placeholder="sk-..." autoComplete="new-password" />
        </Form.Item>

        <Form.Item name="contact" label="渠道联系人">
          <Input placeholder="选填，如：张工" />
        </Form.Item>
        <Form.Item name="phone" label="联系方式">
          <Input placeholder="选填，电话 / 邮箱 / 微信等" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="选填，渠道说明、对接注意事项等" />
        </Form.Item>

        <Form.Item
          name="status"
          label="渠道状态"
          valuePropName="checked"
        >
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}