import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FormInstance } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { CopyOutlined, LinkOutlined } from '@ant-design/icons'
import SearchField from '../components/SearchField'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import { maskName } from '../components/SecretCell'
import PromoCampaignModelConfig from './PromoCampaignModelConfig'
import {
  addPromoCampaign,
  buildCampaignInviteUrl,
  deletePromoCampaign,
  getCampaignPhase,
  setPromoCampaignShowInList,
  setPromoCampaignStatus,
  updatePromoCampaign,
  usePromoCampaigns,
  usePromoCommissions,
  usePromoInvitees,
  usePromoPartners,
} from '../store'
import type { CampaignPhase, PromoCampaign, PromoCampaignScope } from '../types'
import { CAMPAIGN_PHASE_LABEL, PROMO_CAMPAIGN_SCOPE_LABEL, roundAmount } from '../types'

const { Text } = Typography

const copyText = async (value: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      message.success('已复制')
      return
    } catch {
      /** 剪贴板 API 被拒绝时走 execCommand 兜底 */
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    message.success('已复制')
  } catch {
    message.error('复制失败')
  }
}

interface CampaignForm {
  name: string
  range: [Dayjs, Dayjs]
  scope: PromoCampaignScope
  defaultRate?: number | null
  webPromo: boolean
  showInList: boolean
}

const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

/** 活动数据弹窗里的分销员行：消费人数与金额取该分销员在本活动的分佣明细 */
interface CampaignPartnerRow {
  partnerId: string
  partnerName: string
  partnerAccountId: string
  consumedCount: number
  consumeAmount: number
  commissionAmount: number
}

/** 配置返佣模型页挂到 URL 的查询参数：刷新可回跳、切菜单时由路由切换自然退出 */
const CAMPAIGN_PARAM = 'campaign'

const readCampaignIdFromUrl = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get(CAMPAIGN_PARAM)
  } catch {
    return null
  }
}

export default function PromoRebateConfig() {
  const campaigns = usePromoCampaigns()
  const commissions = usePromoCommissions()
  const invitees = usePromoInvitees()
  const partners = usePromoPartners()

  const [nameKw, setNameKw] = useState('')
  const [phaseKw, setPhaseKw] = useState<'all' | CampaignPhase>('all')
  const [query, setQuery] = useState<{ name: string; phase: 'all' | CampaignPhase }>({ name: '', phase: 'all' })

  const [editing, setEditing] = useState<PromoCampaign | null>(null)
  const [form] = Form.useForm<CampaignForm>()
  const [adding, setAdding] = useState(false)
  const [addForm] = Form.useForm<CampaignForm>()
  const [statsFor, setStatsFor] = useState<PromoCampaign | null>(null)
  const [shareFor, setShareFor] = useState<PromoCampaign | null>(null)

  /** 当前配置返佣模型的活动 id；初始化自 URL，进入/退出时同步回 URL（卸载清理，保证切菜单后不残留） */
  const [configuringId, setConfiguringId] = useState<string | null>(() => readCampaignIdFromUrl())
  const configuringCampaign = configuringId ? campaigns.find((c) => c.id === configuringId) ?? null : null

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (configuringId) params.set(CAMPAIGN_PARAM, configuringId)
    else params.delete(CAMPAIGN_PARAM)
    const qs = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [configuringId])

  /** 注意：不要在此组件卸载时清理 campaign 参数——切菜单时 App 层已统一清掉；
   * 且 StrictMode 下「挂载→卸载→重挂载」会把参数抹掉，导致 state 初始化读不到、URL 回跳失效 */

  useEffect(() => {
    if (configuringId && !campaigns.some((c) => c.id === configuringId)) setConfiguringId(null)
  }, [configuringId, campaigns])

  const handleSearch = () => setQuery({ name: nameKw.trim(), phase: phaseKw })
  const handleReset = () => {
    setNameKw('')
    setPhaseKw('all')
    setQuery({ name: '', phase: 'all' })
  }

  const filtered = useMemo(() => {
    const kw = query.name.toLowerCase()
    return campaigns.filter((c) => {
      const matchName = !kw || c.name.toLowerCase().includes(kw)
      const matchPhase = query.phase === 'all' || getCampaignPhase(c) === query.phase
      return matchName && matchPhase
    })
  }, [campaigns, query])

  /**
   * 「分销数据」按活动 id 实时聚合：消费人数与两个累计金额取该活动的分佣明细；
   * 分销员数量取「在本活动有消耗计佣 ∪ 邀请过被邀请人归属该活动」的去重数，
   * 与弹窗下方分销员列表的行集合同一口径；
   * 不再使用活动记录上写死的静态业绩字段（两者曾长期对不上）。
   */
  const campaignPerf = useMemo(() => {
    if (!statsFor) return null
    const list = commissions.filter((c) => c.campaignId === statsFor.id && c.kind === 'consume')
    const partnerSet = new Set<string>()
    const inviteeSet = new Set<string>()
    let consumeAmount = 0
    let commissionAmount = 0
    list.forEach((c) => {
      partnerSet.add(c.partnerId)
      const key = c.inviteeAccountId || c.inviteeName
      if (key && key !== '—') inviteeSet.add(key)
      consumeAmount += c.consumeAmount ?? 0
      commissionAmount += c.amount
    })
    const campaignInvitees = invitees.filter((i) => i.campaignId === statsFor.id)
    campaignInvitees.forEach((i) => partnerSet.add(i.partnerId))
    return {
      partnerCount: partnerSet.size,
      consumedCount: inviteeSet.size,
      consumeAmount,
      commissionAmount,
    }
  }, [commissions, invitees, statsFor])

  const campaignMetrics: { label: string; value: string; color?: string }[] = useMemo(() => {
    if (!campaignPerf) return []
    return [
      { label: '分销员数量', value: `${campaignPerf.partnerCount}` },
      { label: '消费人数', value: `${campaignPerf.consumedCount}` },
      { label: '累计消费', value: money(campaignPerf.consumeAmount) },
      { label: '累计分佣', value: money(campaignPerf.commissionAmount), color: '#52c41a' },
    ]
  }, [campaignPerf])

  /**
   * 「分销数据」弹窗里的分销员明细：行集合 = 在本活动有消耗计佣的分销员 ∪ 邀请过被邀请人归属该活动的分销员，
   * 保证「只邀请了人、还没产生消费」的分销员也能看到。各指标与上方统计卡同一口径（分佣明细 + 被邀请人名单）：
   * 消费人数 = 该分销员在本活动有计佣的被邀请人去重数；
   * 计佣费用 = 该分销员在本活动产生的现金消耗合计；佣金总额 = 该分销员在本活动的返佣金额合计。
   */
  const campaignPartnerRows = useMemo<CampaignPartnerRow[]>(() => {
    if (!statsFor) return []
    const consumeList = commissions.filter((c) => c.campaignId === statsFor.id && c.kind === 'consume')
    const inviteeList = invitees.filter((i) => i.campaignId === statsFor.id)
    const ids = new Set<string>()
    consumeList.forEach((c) => ids.add(c.partnerId))
    inviteeList.forEach((i) => ids.add(i.partnerId))
    const rows = Array.from(ids).map((pid) => {
      const myComs = consumeList.filter((c) => c.partnerId === pid)
      const consumedSet = new Set<string>()
      let consumeAmount = 0
      let commissionAmount = 0
      myComs.forEach((c) => {
        const key = c.inviteeAccountId || c.inviteeName
        if (key && key !== '—') consumedSet.add(key)
        consumeAmount += c.consumeAmount ?? 0
        commissionAmount += c.amount
      })
      const partner = partners.find((p) => p.id === pid)
      return {
        partnerId: pid,
        partnerName: partner?.nickname ?? myComs[0]?.partnerName ?? '—',
        partnerAccountId: partner?.accountId ?? '—',
        consumedCount: consumedSet.size,
        consumeAmount,
        commissionAmount,
      }
    })
    return rows.sort((a, b) => b.commissionAmount - a.commissionAmount)
  }, [commissions, invitees, partners, statsFor])

  const openAdd = () => {
    addForm.resetFields()
    addForm.setFieldsValue({ scope: 'partial', webPromo: false, showInList: true })
    setAdding(true)
  }

  const openEdit = (campaign: PromoCampaign) => {
    setEditing(campaign)
    form.setFieldsValue({
      name: campaign.name,
      range: [dayjs(campaign.startAt), dayjs(campaign.endAt)],
      scope: campaign.scope ?? 'partial',
      defaultRate: campaign.defaultRate ?? null,
      webPromo: campaign.webPromo,
      showInList: campaign.showInList ?? true,
    })
  }

  const submit = async (formInstance: FormInstance, isEdit: boolean) => {
    const values = await formInstance.validateFields()
    const payload = {
      name: values.name,
      startAt: values.range[0].format('YYYY-MM-DD'),
      endAt: values.range[1].format('YYYY-MM-DD'),
      scope: (values.scope ?? 'partial') as PromoCampaignScope,
      defaultRate: values.scope === 'all' ? values.defaultRate ?? undefined : undefined,
      webPromo: !!values.webPromo,
      showInList: values.showInList ?? true,
    }
    const res = isEdit && editing ? updatePromoCampaign(editing.id, payload) : addPromoCampaign(payload)
    if (!res.ok) {
      message.error(res.msg)
      return
    }
    message.success(isEdit ? res.msg : '保存成功 请在活动列表点击「配置返佣模型」，为该活动添加分销模型与返佣比例')
    if (isEdit) setEditing(null)
    else setAdding(false)
  }

  const handlePauseResume = (campaign: PromoCampaign) => {
    const next = campaign.status === 'on' ? 'off' : 'on'
    const res = setPromoCampaignStatus(campaign.id, next)
    if (!res.ok) {
      message.error(res.msg)
      return
    }
    message.success(res.msg)
  }

  const handleShowInList = (campaign: PromoCampaign, next: boolean) => {
    const res = setPromoCampaignShowInList(campaign.id, next)
    if (!res.ok) {
      message.error(res.msg)
      return
    }
    message.success(res.msg)
  }

  const handleDelete = (campaign: PromoCampaign) => {
    const res = deletePromoCampaign(campaign.id)
    if (!res.ok) {
      message.error(res.msg)
      return
    }
    message.success(res.msg)
  }

  const columns: ColumnsType<PromoCampaign> = [
    {
      title: '活动名称',
      dataIndex: 'name',
      fixed: 'left',
      width: 220,
      ellipsis: { showTitle: false },
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      key: 'state',
      width: 100,
      render: (_, row) => {
        const phase = getCampaignPhase(row)
        if (phase === 'ended') {
          return <Tag>已结束</Tag>
        }
        if (row.status === 'off') {
          return <Tag color="orange">已暂停</Tag>
        }
        return phase === 'pending' ? <Tag color="blue">未开始</Tag> : <Tag color="green">进行中</Tag>
      },
    },
    {
      title: '活动时间',
      key: 'period',
      width: 200,
      render: (_, row) => <Text>{`${row.startAt} ~ ${row.endAt}`}</Text>,
    },
    {
      title: '官网上架',
      key: 'webPromo',
      width: 120,
      render: (_, row) =>
        row.webPromo ? (
          <Tooltip title="该活动在官网「推广合伙人」页展示模型返佣比例">
            <Tag color="volcano">官网上架</Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '列表展示',
      key: 'showInList',
      width: 110,
      render: (_, row) => (
        <Tooltip title="关闭后，控制台「推广合伙人」的活动列表不再展示该活动，已有推广链接仍可访问">
          <Switch
            size="small"
            checked={row.showInList ?? true}
            checkedChildren="是"
            unCheckedChildren="否"
            onChange={(checked) => handleShowInList(row, checked)}
          />
        </Tooltip>
      ),
    },
    {
      title: '适用范围',
      key: 'scope',
      width: 130,
      render: (_, row) => {
        const sc = row.scope ?? 'partial'
        return (
          <Tooltip title={sc === 'all' && row.defaultRate ? `全部模型默认按 ${row.defaultRate}% 配置，可在「配置返佣模型」中逐个调整` : undefined}>
            <Tag color={sc === 'all' ? 'blue' : 'default'}>{PROMO_CAMPAIGN_SCOPE_LABEL[sc]}</Tag>
          </Tooltip>
        )
      },
    },
    { title: '最近操作人', dataIndex: 'operator', width: 110 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 170,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Space size={8}>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openEdit(row)}>
              编辑
            </Button>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setConfiguringId(row.id)}>
              配置返佣模型
            </Button>
            {getCampaignPhase(row) !== 'ended' && (
              <Popconfirm
                title={row.status === 'on' ? '确认暂停该活动的计佣？' : '确认恢复该活动的计佣？'}
                description={
                  row.status === 'on'
                    ? '暂停后该活动不再产生返佣，活动数据保留，可随时恢复。'
                    : '恢复后该活动将继续正常分销与计佣。'
                }
                okText={row.status === 'on' ? '暂停' : '恢复'}
                cancelText="取消"
                onConfirm={() => handlePauseResume(row)}
              >
                <Button type="link" size="small" danger={row.status === 'on'} style={{ padding: 0 }}>
                  {row.status === 'on' ? '暂停' : '恢复'}
                </Button>
              </Popconfirm>
            )}
            {getCampaignPhase(row) !== 'ended' && (
              <RequirementDot
                title="暂停 · 需求说明"
                sections={[
                  {
                    label: '需求内容',
                    items: [
                      '如活动已暂停，则招募合伙人页面，分销商分享的邀请页，在点击登录时均提示“活动已停止”；',
                      '如活动已结束，则招募合伙人页面，分销商分享的邀请页，直接展示一个空页面，中间大字提示“该活动已结束“',
                    ],
                  },
                ]}
              />
            )}
          </Space>
          <Space size={8}>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setShareFor(row)}>
              招募合伙人
            </Button>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setStatsFor(row)}>
              分销数据
            </Button>
            <Popconfirm
              title="确认删除该分销活动？"
              description="删除后活动及其分销配置将一并移除，不可恢复。"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(row)}
            >
              <Button type="link" size="small" danger style={{ padding: 0 }}>
                删除
              </Button>
            </Popconfirm>
            <RequirementDot
              title="删除 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '活动删除后，所有分享页面都展示活动不存在；',
                    '历史分佣数据不可删除。',
                  ],
                },
              ]}
            />
          </Space>
        </Space>
      ),
    },
  ]

  if (configuringCampaign) {
    return <PromoCampaignModelConfig campaign={configuringCampaign} onBack={() => setConfiguringId(null)} />
  }

  return (
    <>
      <PageShell
        breadcrumb={['分销管理', '分销活动']}
        searchFields={
          <>
            <SearchField label="活动名称">
              <Input
                placeholder="请输入活动名称"
                allowClear
                style={{ width: 220 }}
                value={nameKw}
                onChange={(e) => setNameKw(e.target.value)}
                onPressEnter={handleSearch}
              />
            </SearchField>
            <SearchField label="活动状态">
              <Select
                style={{ width: 130 }}
                value={phaseKw}
                onChange={setPhaseKw}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'pending', label: CAMPAIGN_PHASE_LABEL.pending },
                  { value: 'ongoing', label: CAMPAIGN_PHASE_LABEL.ongoing },
                  { value: 'ended', label: CAMPAIGN_PHASE_LABEL.ended },
                ]}
              />
            </SearchField>
          </>
        }
        onSearch={handleSearch}
        onReset={handleReset}
        onAdd={openAdd}
        addText="新增分销活动"
        listTitle="分销活动"
        total={filtered.length}
        totalUnit="个活动"
        titleExtra={
          <RequirementDot
            title="分销活动 · 需求说明"
            sections={[
              {
                label: '需求内容',
                items: [
                  '1.列表根据活动创建时间倒序展示，信息如图；',
                  '2.可根据活动名称模糊搜索、根据活动状态搜索；',
                  '3.状态：\n<开始时间：未开始\n>=开始时间，且<=结束时间 ：进行中\n>结束时间：已结束；\n进行中可以操作暂定，记为已暂停；点击恢复，恢复到应有状态；如暂停后，一直未恢复，超过了结束时间，则直接记为已结束状态。不展示恢复按钮。',
                  '4.仅有一条记录可以展示官网上架，可以均不展示。\n如某个活动设为官网上架，则原来被设置展示在官网的活动将被取消官网上架。',
                  '5.列表展示是控制活动是否展示在控制台》推广合伙人页面。\n点击列表展示开启〉本活动在列表展示，同时关闭其他活动的列表展示，且开启本活动的官网上架，关闭其他活动的官网上架；\n支持关闭官网上架。支持关闭所有活动的列表展示（关闭时也关闭官网上架），此时所有活动都无处展示。',
                ],
              },
            ]}
          />
        }
      >
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
        />
      </PageShell>

      <Modal
        centered
        destroyOnClose
        width={560}
        title="编辑分销活动"
        open={!!editing}
        okText="保存"
        cancelText="取消"
        onOk={() => submit(form, true)}
        onCancel={() => setEditing(null)}
      >
        <Form form={form} layout="vertical">
          <CampaignFields form={form} />
        </Form>
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={560}
        title={
          <Space size={8}>
            新增分销活动
            <RequirementDot
              title="新增分销活动 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.活动名称，必填，30字内，不限制输入内容。不可重复。重复提示“当前名称已存在”；',
                    '2.活动开始时间应大于等于当日，结束时间大于等于开始时间。 开始时间均设置为00:00，结束时间设置为23:59\n即，设置10-1～10-1，则活动时间为10-1 00:00 ～ 10-1 23:59',
                    '3.如果适用范围是全平台模型，则全平台已上架模型都适用，此处需要注意，模型可能随时上架下架，所以分佣时应该是快照。新上架模型未修改分佣时，均按照默认返佣比例处理，支持在列表》配置返佣模型中修改分佣比例。 \n如选择的为部分模型，则需要在列表》配置返佣模型中添加模型并配置佣金比例。',
                    '4.开启在官网上架，则官网中展示活动配置的返佣模型比例信息。如已有其他活动设置在官网展示，则保存时，取消其他活动的官网展示。',
                    '5.是否展示在活动列表控制是否展示在控制台推广合伙人页面。',
                    '保存后验证以上，成功后提示保存成功，返回列表并刷新',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={adding}
        okText="保存"
        cancelText="取消"
        onOk={() => submit(addForm, false)}
        onCancel={() => setAdding(false)}
      >
        <Form form={addForm} layout="vertical">
          <CampaignFields form={addForm} />
        </Form>
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={520}
        title={
          <Space size={8}>
            分享链接
            <RequirementDot
              title="分享链接 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: ['招募合伙人链接应带有活动标识；'],
                },
                {
                  label: '落地页面展示',
                  items: [
                    '1.展示活动名称及活动时间范围；',
                    '2.合伙人未登录时，展示登录按钮，登录后跳转到控制台推广合伙人页面。页面下方展示当前活动的返佣模型信息，按照返佣比例倒序展示，加倍的展示加倍；默认展示10条，超过10条展示更多。可展开收起；',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={!!shareFor}
        footer={
          <Button onClick={() => setShareFor(null)}>关闭</Button>
        }
        onCancel={() => setShareFor(null)}
      >
        {shareFor && (
          <>
            <Text type="secondary">
              将此活动页链接分享给分销商，对方打开后登录即可领取专属分销链接并转发分享。
            </Text>
            <Space.Compact style={{ width: '100%', marginTop: 16 }}>
              <Input
                readOnly
                value={buildCampaignInviteUrl(shareFor.id)}
                prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
              />
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => copyText(buildCampaignInviteUrl(shareFor.id))}
              >
                复制
              </Button>
            </Space.Compact>
            {shareFor.status === 'off' && (
              <div style={{ marginTop: 12 }}>
                <Text type="danger">该活动已暂停计佣，分享后活动页将提示不在活动期。</Text>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={720}
        title={
          <Space size={8}>
            分销数据
            <RequirementDot
              title="分销数据 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.分销员数量是所有该活动产生的分佣人员去重复；',
                    '2.消费人数为 所有产生返佣的消费的用户去重复；',
                    '3.累计消费是本活动返佣过程里用户实际消费；',
                    '4.累计分佣，是本活动的佣金总和；',
                    '5.列表以分销员为维度统计信息；',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={!!statsFor}
        footer={
          <Button onClick={() => setStatsFor(null)}>关闭</Button>
        }
        onCancel={() => setStatsFor(null)}
      >
        {statsFor && campaignPerf && (
          <>
            <div style={{ marginBottom: 12 }}>
              <Text type="danger" style={{ fontSize: 12 }}>
                此处只以返佣信息为维度统计
              </Text>
            </div>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              {campaignMetrics.map((metric) => (
                <Col key={metric.label} flex="1 1 0">
                  <Card size="small" style={{ height: '100%' }} styles={{ body: { padding: '12px 16px' } }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {metric.label}
                    </Text>
                    <div style={{ fontSize: 20, fontWeight: 600, color: metric.color }}>{metric.value}</div>
                  </Card>
                </Col>
              ))}
            </Row>
            <Table<CampaignPartnerRow>
              rowKey="partnerId"
              size="small"
              columns={[
                {
                  title: '分销员',
                  dataIndex: 'partnerName',
                  fixed: 'left',
                  width: 180,
                  render: (v: string, row) => (
                    <Space direction="vertical" size={0}>
                      <span>{maskName(v)}</span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {row.partnerAccountId}
                      </Text>
                    </Space>
                  ),
                },
                { title: '消费人数', dataIndex: 'consumedCount', width: 120, align: 'right' },
                {
                  title: '计佣费用',
                  dataIndex: 'consumeAmount',
                  width: 120,
                  align: 'right',
                  render: (v: number) => money(v),
                },
                {
                  title: '佣金总额',
                  dataIndex: 'commissionAmount',
                  fixed: 'right',
                  width: 120,
                  align: 'right',
                  render: (v: number) => <Text style={{ fontWeight: 500 }}>{money(v)}</Text>,
                },
              ]}
              dataSource={campaignPartnerRows}
              scroll={{ x: 'max-content' }}
              pagination={{
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条记录`,
              }}
            />
          </>
        )}
      </Modal>
    </>
  )
}

/** 活动公共字段：名称 / 活动时间范围 / 适用范围 / 是否在官网上架（活动状态由时间范围自动判断，不手填） */
function CampaignFields({ form }: { form: FormInstance<CampaignForm> }) {
  const scope = Form.useWatch('scope', form)
  return (
    <>
      <Form.Item
        name="name"
        label="活动名称"
        rules={[{ required: true, message: '请填写活动名称' }]}
      >
        <Input placeholder="请输入活动名称" maxLength={30} showCount allowClear />
      </Form.Item>
      <Form.Item
        name="range"
        label="活动时间范围"
        rules={[{ required: true, message: '请选择活动时间范围' }]}
      >
        <DatePicker.RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item
        name="scope"
        label="适用范围"
        rules={[{ required: true, message: '请选择适用范围' }]}
        extra={
          scope === 'partial' ? (
            <Text type="danger" style={{ fontSize: 12 }}>
              保存后可在列表点击「配置返佣模型」，添加返佣模型并修改返佣比例
            </Text>
          ) : undefined
        }
      >
        <Radio.Group
          options={[
            { value: 'all', label: '全平台模型' },
            { value: 'partial', label: '部分模型' },
          ]}
        />
      </Form.Item>
      {scope === 'all' && (
        <Form.Item
          name="defaultRate"
          label="默认返佣比例"
          rules={[{ required: true, message: '请配置默认返佣比例' }]}
          extra={
            <Text type="danger" style={{ fontSize: 12 }}>
              平台所有模型倍率将按该比例配置，新增模型自动配置为默认比例，可在「配置返佣模型」中逐个调整
            </Text>
          }
        >
          <InputNumber min={0} max={50} precision={0} addonAfter="%" placeholder="0 ~ 50" style={{ width: 160 }} />
        </Form.Item>
      )}
      <Form.Item
        name="webPromo"
        label="是否在官网上架"
        valuePropName="checked"
        extra="开启后，官网「推广合伙人」页展示本活动的模型返佣比例"
      >
        <Switch checkedChildren="是" unCheckedChildren="否" />
      </Form.Item>
      <Form.Item
        name="showInList"
        label="是否在活动列表展示"
        valuePropName="checked"
        extra="关闭后，控制台「推广合伙人」的活动列表不再展示该活动，已有推广链接仍可访问"
      >
        <Switch checkedChildren="是" unCheckedChildren="否" />
      </Form.Item>
    </>
  )
}

