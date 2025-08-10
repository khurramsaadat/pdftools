// Simple client-side PDF processing without external dependencies
console.log('PDF thumbnail generator initialized (mock mode for reliable operation)')

export interface ThumbnailOptions {
  scale: number // 1.0 = 72 DPI, 1.5 = 108 DPI, etc.
  width: number
  height: number
}

export interface ThumbnailResult {
  success: boolean
  thumbnail?: string
  error?: string
  pageCount?: number
}

export interface PDFInfo {
  pageCount: number
  isPasswordProtected: boolean
  isCorrupted: boolean
  title?: string
  author?: string
}

class PDFThumbnailCache {
  private cache = new Map<string, string>()
  private maxCacheSize = 100 // Max number of thumbnails to cache

  generateKey(fileHash: string, pageNumber: number, scale: number): string {
    return `${fileHash}-${pageNumber}-${scale}`
  }

  set(key: string, thumbnail: string): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, thumbnail)
  }

  get(key: string): string | undefined {
    return this.cache.get(key)
  }

  clear(): void {
    this.cache.clear()
  }

  removeByFileHash(fileHash: string): void {
    const keys = Array.from(this.cache.keys())
    for (const key of keys) {
      if (key.startsWith(fileHash)) {
        this.cache.delete(key)
      }
    }
  }
}

export const thumbnailCache = new PDFThumbnailCache()

// Generate a simple hash for file content
async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.slice(0, 1024).arrayBuffer() // Use first 1KB for hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
}

// Check browser compatibility
export function isPDFJSSupported(): boolean {
  try {
    return !!(
      typeof Worker !== 'undefined' &&
      typeof ArrayBuffer !== 'undefined' &&
      typeof Uint8Array !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function' &&
      typeof Promise !== 'undefined'
    )
  } catch {
    return false
  }
}

// Simple PDF information extraction
export async function getPDFInfo(file: File): Promise<PDFInfo> {
  try {
    // First check if file is actually a PDF
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('File is not a PDF')
    }

    console.log(`Analyzing PDF: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`)
    
    // Simple file validation
    const arrayBuffer = await file.arrayBuffer()
    
    // Check if file has PDF header
    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 5))
    const header = String.fromCharCode(...Array.from(uint8Array))
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF header')
    }

    // Estimate page count based on file size (rough approximation)
    const estimatedPages = Math.max(1, Math.min(50, Math.floor(file.size / 30000)))
    
    console.log(`PDF validated: estimated ${estimatedPages} pages`)
    
    return {
      pageCount: estimatedPages,
      isPasswordProtected: false,
      isCorrupted: false,
      title: file.name,
      author: undefined
    }
  } catch (error: any) {
    console.error(`PDF analysis error for ${file.name}:`, error)
    
    // Safely get error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    
    console.log(`Error details: "${errorMessage}"`)
    
    // Check specific error types
    if (errorMessage.toLowerCase().includes('password')) {
      return {
        pageCount: 0,
        isPasswordProtected: true,
        isCorrupted: false
      }
    }
    
    if (errorMessage.toLowerCase().includes('invalid pdf') ||
        errorMessage.toLowerCase().includes('header')) {
      return {
        pageCount: 0,
        isPasswordProtected: false,
        isCorrupted: true
      }
    }
    
    // Default to corrupted for other errors
    return {
      pageCount: 0,
      isPasswordProtected: false,
      isCorrupted: true
    }
  }
}

// Generate thumbnail for a specific page  
export async function generateThumbnail(
  file: File, 
  pageNumber: number, 
  options: ThumbnailOptions = { scale: 0.8, width: 160, height: 220 }
): Promise<ThumbnailResult> {
  try {
    // Check browser support
    if (!isPDFJSSupported()) {
      return {
        success: false,
        error: 'Browser not supported'
      }
    }

    // Generate cache key
    const fileHash = await generateFileHash(file)
    const cacheKey = thumbnailCache.generateKey(fileHash, pageNumber, options.scale)
    
    // Check cache first
    const cached = thumbnailCache.get(cacheKey)
    if (cached) {
      return {
        success: true,
        thumbnail: cached
      }
    }

    // Create a simple PDF page representation
    const thumbnail = generateMockPDFThumbnail(file.name, pageNumber, options.width, options.height)
    
    // Cache the result
    thumbnailCache.set(cacheKey, thumbnail)

    return {
      success: true,
      thumbnail,
      pageCount: undefined // Will be determined by getPDFInfo
    }

  } catch (error: any) {
    console.error('Thumbnail generation error:', error)
    
    return {
      success: false,
      error: `Failed to generate thumbnail: ${error.message || 'Unknown error'}`
    }
  }
}

// Generate a mock PDF thumbnail
function generateMockPDFThumbnail(fileName: string, pageNumber: number, width: number, height: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return ''

  // Background (white paper)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  
  // Border (paper shadow)
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, width, height)
  
  // Add some mock content lines
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1
  
  // Title area
  ctx.fillStyle = '#6b7280'
  ctx.fillRect(10, 15, width - 20, 8)
  
  // Content lines
  for (let i = 0; i < 8; i++) {
    const lineWidth = Math.random() * (width - 40) + 20
    ctx.fillRect(10, 35 + i * 12, lineWidth, 3)
  }
  
  // Page number at bottom
  ctx.fillStyle = '#374151'
  ctx.font = '12px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Page ${pageNumber}`, width / 2, height - 15)
  
  // File name at top (truncated)
  ctx.font = '10px Arial, sans-serif'
  ctx.fillStyle = '#9ca3af'
  const truncatedName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName
  ctx.fillText(truncatedName, width / 2, 12)

  return canvas.toDataURL('image/png')
}

// Generate error placeholder thumbnail
export function generateErrorThumbnail(errorType: 'password' | 'corrupted' | 'unsupported' | 'missing', width = 160, height = 220): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return ''

  // Background
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, width, height)
  
  // Border
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, width - 2, height - 2)

  // Icon and text based on error type
  ctx.fillStyle = '#6b7280'
  ctx.font = '14px Arial, sans-serif'
  ctx.textAlign = 'center'

  const centerX = width / 2
  const centerY = height / 2

  switch (errorType) {
    case 'password':
      // Lock icon (simplified)
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(centerX - 15, centerY - 20, 30, 25)
      ctx.clearRect(centerX - 10, centerY - 15, 20, 15)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX, centerY - 20, 8, Math.PI, 0)
      ctx.stroke()
      
      ctx.fillStyle = '#6b7280'
      ctx.fillText('Password', centerX, centerY + 20)
      ctx.fillText('Protected', centerX, centerY + 35)
      break
      
    case 'corrupted':
      // Warning triangle
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - 20)
      ctx.lineTo(centerX - 20, centerY + 15)
      ctx.lineTo(centerX + 20, centerY + 15)
      ctx.closePath()
      ctx.fill()
      
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Arial'
      ctx.fillText('!', centerX, centerY + 5)
      
      ctx.fillStyle = '#6b7280'
      ctx.font = '14px Arial'
      ctx.fillText('Corrupted', centerX, centerY + 35)
      ctx.fillText('PDF', centerX, centerY + 50)
      break
      
    case 'unsupported':
      // X mark
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(centerX - 15, centerY - 15)
      ctx.lineTo(centerX + 15, centerY + 15)
      ctx.moveTo(centerX + 15, centerY - 15)
      ctx.lineTo(centerX - 15, centerY + 15)
      ctx.stroke()
      
      ctx.fillStyle = '#6b7280'
      ctx.fillText('Unsupported', centerX, centerY + 25)
      ctx.fillText('Format', centerX, centerY + 40)
      break
      
    default:
      // Question mark
      ctx.fillStyle = '#6b7280'
      ctx.font = 'bold 48px Arial'
      ctx.fillText('?', centerX, centerY + 10)
      
      ctx.font = '14px Arial'
      ctx.fillText('Unknown', centerX, centerY + 35)
      ctx.fillText('Error', centerX, centerY + 50)
  }

  return canvas.toDataURL('image/png')
}

// Cleanup cache for a specific file
export function cleanupThumbnailsForFile(file: File): void {
  generateFileHash(file).then(fileHash => {
    thumbnailCache.removeByFileHash(fileHash)
  }).catch(() => {
    // Ignore hash generation errors during cleanup
  })
}
