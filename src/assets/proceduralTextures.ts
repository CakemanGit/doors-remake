import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create a procedural texture canvas.')
  return [canvas, context]
}

export function createWoodTexture(): CanvasTexture {
  const [canvas, context] = createCanvas(512, 256)
  const plankWidth = 128
  const plankHeight = 64
  const shades = ['#513524', '#62412d', '#583a28', '#69462f', '#493020']

  for (let row = 0; row < 4; row += 1) {
    const offset = row % 2 === 0 ? 0 : plankWidth / 2
    for (let column = -1; column < 5; column += 1) {
      const x = column * plankWidth + offset
      const y = row * plankHeight
      context.fillStyle = shades[(row * 3 + column + 5) % shades.length]
      context.fillRect(x, y, plankWidth, plankHeight)
      context.strokeStyle = 'rgba(20, 12, 8, 0.7)'
      context.lineWidth = 3
      context.strokeRect(x + 1, y + 1, plankWidth - 2, plankHeight - 2)

      for (let grain = 0; grain < 5; grain += 1) {
        const grainY = y + 9 + grain * 11 + ((column + grain) % 3) * 2
        context.beginPath()
        context.moveTo(x + 8, grainY)
        context.bezierCurveTo(
          x + 34,
          grainY - 3,
          x + 78,
          grainY + 4,
          x + plankWidth - 8,
          grainY - 1,
        )
        context.strokeStyle = 'rgba(24, 13, 8, 0.18)'
        context.lineWidth = 1
        context.stroke()
      }
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(2, 3)
  return texture
}

export function createDarkWoodTexture(): CanvasTexture {
  const [canvas, context] = createCanvas(256, 512)
  const boards = ['#422c20', '#503525', '#493122', '#563a29']

  for (let column = 0; column < 4; column += 1) {
    const x = column * 64
    context.fillStyle = boards[column]
    context.fillRect(x, 0, 64, canvas.height)
    context.strokeStyle = 'rgba(18, 11, 8, 0.72)'
    context.lineWidth = 3
    context.strokeRect(x + 1, 1, 62, canvas.height - 2)

    for (let grain = 0; grain < 8; grain += 1) {
      const grainX = x + 8 + grain * 7
      context.beginPath()
      context.moveTo(grainX, 8)
      context.bezierCurveTo(
        grainX - 3,
        140,
        grainX + 4,
        360,
        grainX - 1,
        canvas.height - 8,
      )
      context.strokeStyle = 'rgba(20, 11, 7, 0.22)'
      context.lineWidth = 1
      context.stroke()
    }
  }

  for (const y of [64, 256, 448]) {
    context.strokeStyle = 'rgba(24, 14, 9, 0.65)'
    context.lineWidth = 8
    context.strokeRect(12, y, canvas.width - 24, 40)
    context.strokeStyle = 'rgba(132, 91, 52, 0.3)'
    context.lineWidth = 2
    context.strokeRect(18, y + 6, canvas.width - 36, 28)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  return texture
}

export function createWallpaperTexture(): CanvasTexture {
  const [canvas, context] = createCanvas(256, 256)
  context.fillStyle = '#a99a68'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let column = 0; column < 8; column += 1) {
    const x = column * 32
    context.fillStyle = column % 2 === 0 ? 'rgba(43, 50, 36, 0.16)' : 'rgba(230, 214, 158, 0.1)'
    context.fillRect(x, 0, 16, canvas.height)
    context.strokeStyle = 'rgba(54, 51, 35, 0.32)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x + 16, 0)
    context.lineTo(x + 16, canvas.height)
    context.stroke()
  }

  for (let y = 0; y <= canvas.height; y += 64) {
    for (let x = 16; x <= canvas.width; x += 64) {
      context.beginPath()
      context.ellipse(x, y, 9, 16, 0, 0, Math.PI * 2)
      context.strokeStyle = 'rgba(57, 54, 35, 0.3)'
      context.lineWidth = 1
      context.stroke()
      context.beginPath()
      context.arc(x, y, 3, 0, Math.PI * 2)
      context.fillStyle = 'rgba(222, 204, 143, 0.38)'
      context.fill()
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(2, 1)
  return texture
}

export function createRoomNumberTexture(roomNumber: number): CanvasTexture {
  const [canvas, context] = createCanvas(256, 96)
  context.fillStyle = '#2b2116'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#c9a45a'
  context.lineWidth = 7
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12)
  context.fillStyle = '#e8d291'
  context.font = 'bold 56px Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(roomNumber).padStart(3, '0'), canvas.width / 2, canvas.height / 2 + 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
