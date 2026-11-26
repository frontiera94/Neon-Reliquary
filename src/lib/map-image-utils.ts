export interface PreparedMapImage {
  dataUrl: string
  width: number
  height: number
}

const MAX_DIMENSION_PX = 2048

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Impossibile leggere il file immagine'))
    }
    reader.onerror = () => reject(new Error('Errore lettura file immagine'))
    reader.readAsDataURL(file)
  })
}

/**
 * Reads an image file and compresses/resizes it to WebP/JPEG via HTMLCanvasElement
 * when available in the browser, falling back cleanly to the raw DataURL in test/JSDOM environments.
 */
export async function prepareMapImageFile(file: File): Promise<PreparedMapImage> {
  const rawDataUrl = await readFileAsDataUrl(file)

  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    return { dataUrl: rawDataUrl, width: 1600, height: 1000 }
  }

  // In JSDOM, Image.onload may not fire automatically unless mocked; guard with a short timeout
  return new Promise<PreparedMapImage>((resolve) => {
    let settled = false
    const finish = (res: PreparedMapImage) => {
      if (settled) return
      settled = true
      resolve(res)
    }

    const fallbackTimer = setTimeout(() => {
      finish({ dataUrl: rawDataUrl, width: 1600, height: 1000 })
    }, 350)

    const img = new Image()
    img.onload = () => {
      clearTimeout(fallbackTimer)
      const natW = img.naturalWidth || img.width || 1600
      const natH = img.naturalHeight || img.height || 1000
      const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(natW, natH))
      const outW = Math.max(64, Math.round(natW * scale))
      const outH = Math.max(64, Math.round(natH * scale))

      try {
        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          finish({ dataUrl: rawDataUrl, width: outW, height: outH })
          return
        }
        ctx.drawImage(img, 0, 0, outW, outH)
        let compressed = canvas.toDataURL('image/webp', 0.84)
        if (!compressed.startsWith('data:image/')) {
          compressed = rawDataUrl
        }
        finish({ dataUrl: compressed, width: outW, height: outH })
      } catch {
        finish({ dataUrl: rawDataUrl, width: outW, height: outH })
      }
    }
    img.onerror = () => {
      clearTimeout(fallbackTimer)
      finish({ dataUrl: rawDataUrl, width: 1600, height: 1000 })
    }
    img.src = rawDataUrl
  })
}
