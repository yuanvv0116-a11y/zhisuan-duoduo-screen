import { useEffect, useState } from 'react'
import { Alert, Button, Modal, Skeleton, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import QRCode from 'qrcode'

const TEMPLATE_URL = new URL('../assets/poster-template.png', import.meta.url).href

/** 海报模板原始尺寸 */
const POSTER_W = 1024
const POSTER_H = 1536
/** 模板上二维码白色卡片的实测边界（绘制时先整卡铺白覆盖示例二维码） */
const QR_CARD = { x: 415, y: 1211, w: 191, h: 186, r: 6 }
/** 新二维码尺寸（卡片内居中，留出静区） */
const QR_SIZE = 168

type Props = {
  open: boolean
  /** 二维码内容：活动专属推广链接（可含邀请码） */
  link: string
  campaignName: string
  onClose: () => void
}

/** 下载海报：把活动专属链接二维码合成到官方海报模板的二维码位上 */
export default function PromoPosterModal({ open, link, campaignName, onClose }: Props) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let objectUrl: string | null = null
    setLoading(true)
    setError(null)
    setPosterUrl(null)
    const run = async () => {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('poster'))
        el.src = TEMPLATE_URL
      })
      const qrDataUrl = await QRCode.toDataURL(link, { margin: 1, width: QR_SIZE * 2, errorCorrectionLevel: 'M' })
      const qr = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('qr'))
        el.src = qrDataUrl
      })
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = POSTER_W
      canvas.height = POSTER_H
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas')
      ctx.drawImage(img, 0, 0, POSTER_W, POSTER_H)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(QR_CARD.x + QR_CARD.r, QR_CARD.y)
      ctx.arcTo(QR_CARD.x + QR_CARD.w, QR_CARD.y, QR_CARD.x + QR_CARD.w, QR_CARD.y + QR_CARD.h, QR_CARD.r)
      ctx.arcTo(QR_CARD.x + QR_CARD.w, QR_CARD.y + QR_CARD.h, QR_CARD.x, QR_CARD.y + QR_CARD.h, QR_CARD.r)
      ctx.arcTo(QR_CARD.x, QR_CARD.y + QR_CARD.h, QR_CARD.x, QR_CARD.y, QR_CARD.r)
      ctx.arcTo(QR_CARD.x, QR_CARD.y, QR_CARD.x + QR_CARD.w, QR_CARD.y, QR_CARD.r)
      ctx.closePath()
      ctx.fill()
      ctx.drawImage(
        qr,
        QR_CARD.x + Math.round((QR_CARD.w - QR_SIZE) / 2),
        QR_CARD.y + Math.round((QR_CARD.h - QR_SIZE) / 2),
        QR_SIZE,
        QR_SIZE,
      )
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('blob'))
            return
          }
          objectUrl = URL.createObjectURL(blob)
          if (cancelled) {
            URL.revokeObjectURL(objectUrl)
            resolve()
            return
          }
          setPosterUrl(objectUrl)
          setLoading(false)
          resolve()
        }, 'image/png')
      })
    }
    run().catch(() => {
      if (cancelled) return
      setError('海报生成失败，请重试')
      setLoading(false)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, link])

  const download = () => {
    if (!posterUrl) return
    const a = document.createElement('a')
    a.href = posterUrl
    a.download = `${campaignName}推广海报.png`
    a.click()
    message.success('海报已下载')
  }

  return (
    <Modal
      title="推广海报"
      open={open}
      centered
      width={440}
      destroyOnClose
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          关闭
        </Button>,
        <Button key="download" type="primary" icon={<DownloadOutlined />} disabled={!posterUrl} loading={loading} onClick={download}>
          下载海报
        </Button>,
      ]}
    >
      {error ? (
        <Alert type="error" showIcon message={error} />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', minHeight: 320 }}>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt="推广海报"
              style={{
                width: '100%',
                maxWidth: 340,
                maxHeight: 'calc(100vh - 300px)',
                objectFit: 'contain',
                borderRadius: 8,
                display: 'block',
              }}
            />
          ) : (
            <Skeleton.Image active style={{ width: 226, height: 339 }} />
          )}
        </div>
      )}
    </Modal>
  )
}
