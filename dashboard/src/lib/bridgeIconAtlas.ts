/** Build a tiny raster atlas for IconLayer (bridge ok vs closure). */
export function createBridgeIconAtlas(): {
  url: string
  mapping: Record<
    string,
    { x: number; y: number; width: number; height: number; mask: boolean }
  >
} {
  const w = 256
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      url: '',
      mapping: {
        bridge: { x: 0, y: 0, width: 128, height: 128, mask: true },
        closed: { x: 128, y: 0, width: 128, height: 128, mask: true },
      },
    }
  }
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(64, 64, 36, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(150, 36)
  ctx.lineTo(236, 100)
  ctx.moveTo(236, 36)
  ctx.lineTo(150, 100)
  ctx.stroke()
  return {
    url: canvas.toDataURL(),
    mapping: {
      bridge: { x: 0, y: 0, width: 128, height: 128, mask: true },
      closed: { x: 128, y: 0, width: 128, height: 128, mask: true },
    },
  }
}
