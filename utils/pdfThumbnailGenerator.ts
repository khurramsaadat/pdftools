import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker - use a working CDN or disable worker
if (typeof window !== 'undefined') {
  // Try jsDelivr CDN which usually has better CORS support
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js`
    console.log('PDF.js worker configured with jsDelivr CDN')
  } catch (error) {
    console.warn('Failed to configure PDF.js worker:', error)
    // Fallback - this will disable worker and use main thread (slower but works)
    pdfjsLib.GlobalWorkerOptions.workerSrc = null
  }
}

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
      this.cache.delete(firstKey)
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
    for (const key of this.cache.keys()) {
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
      URL.createObjectURL &&
      typeof Promise !== 'undefined'
    )
  } catch {
    return false
  }
}

// Get PDF information without rendering
export async function getPDFInfo(file: File): Promise<PDFInfo> {
  try {
    // First check if file is actually a PDF
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('File is not a PDF')
    }

    console.log(`Analyzing PDF: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`)
    
    const arrayBuffer = await file.arrayBuffer()
    
    // Check if file has PDF header
    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 5))
    const header = String.fromCharCode(...uint8Array)
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF header')
    }

    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      // Add timeout to prevent hanging
      timeout: 30000
    })
    
    const pdf = await loadingTask.promise
    console.log(`PDF loaded successfully: ${pdf.numPages} pages`)

    const metadata = await pdf.getMetadata().catch((metaError) => {
      console.warn('Could not load PDF metadata:', metaError)
      return null
    })
    
    return {
      pageCount: pdf.numPages,
      isPasswordProtected: false,
      isCorrupted: false,
      title: metadata?.info?.Title || file.name,
      author: metadata?.info?.Author
    }
  } catch (error: any) {
    console.error(`PDF analysis error for ${file.name}:`, error)
    
    // Safely get error message
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorName = error?.name || ''
    
    console.log(`Error details - Name: "${errorName}", Message: "${errorMessage}"`)
    
    // Check specific error types
    if (errorName === 'PasswordException' || errorMessage.toLowerCase().includes('password')) {
      return {
        pageCount: 0,
        isPasswordProtected: true,
        isCorrupted: false
      }
    }
    
    if (errorName === 'InvalidPDFException' || 
        errorMessage.toLowerCase().includes('invalid pdf') ||
        errorMessage.toLowerCase().includes('header')) {
      return {
        pageCount: 0,
        isPasswordProtected: false,
        isCorrupted: true
      }
    }

    if (errorName === 'MissingPDFException') {
      return {
        pageCount: 0,
        isPasswordProtected: false,
        isCorrupted: true
      }
    }

    // Network or timeout errors
    if (errorName === 'AbortException' || errorMessage.toLowerCase().includes('timeout')) {
      throw new Error('PDF loading timed out. File may be too large or corrupted.')
    }
    
    // Default to corrupted for any other error
    console.log(`Treating as corrupted PDF due to unhandled error type`)
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
  options: ThumbnailOptions = { scale: 1.0, width: 200, height: 280 }
): Promise<ThumbnailResult> {
  try {
    // Check browser support
    if (!isPDFJSSupported()) {
      return {
        success: false,
        error: 'PDF.js is not supported in this browser'
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

    // Load PDF
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    })
    
    const pdf = await loadingTask.promise

    // Check if page exists
    if (pageNumber > pdf.numPages || pageNumber < 1) {
      return {
        success: false,
        error: `Page ${pageNumber} does not exist. PDF has ${pdf.numPages} pages.`
      }
    }

    // Get the page
    const page = await pdf.getPage(pageNumber)
    
    // Calculate viewport
    const viewport = page.getViewport({ scale: options.scale })
    
    // Create canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      return {
        success: false,
        error: 'Could not get canvas 2D context'
      }
    }

    // Set canvas dimensions to maintain aspect ratio
    const aspectRatio = viewport.width / viewport.height
    const targetAspectRatio = options.width / options.height
    
    if (aspectRatio > targetAspectRatio) {
      // PDF is wider, fit to width
      canvas.width = options.width
      canvas.height = options.width / aspectRatio
    } else {
      // PDF is taller, fit to height  
      canvas.height = options.height
      canvas.width = options.height * aspectRatio
    }

    // Scale viewport to canvas size
    const scaleX = canvas.width / viewport.width
    const scaleY = canvas.height / viewport.height
    const finalScale = Math.min(scaleX, scaleY) * options.scale

    const scaledViewport = page.getViewport({ scale: finalScale })
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height

    // Render
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
      enableWebGL: false,
      renderInteractiveForms: false
    }

    await page.render(renderContext).promise

    // Convert to data URL
    const thumbnail = canvas.toDataURL('image/jpeg', 0.8) // Use JPEG with 80% quality for smaller size
    
    // Cache the result
    thumbnailCache.set(cacheKey, thumbnail)

    // Cleanup
    page.cleanup()

    return {
      success: true,
      thumbnail,
      pageCount: pdf.numPages
    }

  } catch (error: any) {
    console.error('Thumbnail generation error:', error)
    
    // Handle specific PDF.js errors
    if (error.name === 'PasswordException') {
      return {
        success: false,
        error: 'PDF is password protected'
      }
    }
    
    if (error.name === 'InvalidPDFException') {
      return {
        success: false,
        error: 'Invalid or corrupted PDF file'
      }
    }
    
    if (error.name === 'MissingPDFException') {
      return {
        success: false,
        error: 'PDF file is missing or empty'
      }
    }

    return {
      success: false,
      error: `Failed to generate thumbnail: ${error.message || 'Unknown error'}`
    }
  }
}

// Generate error placeholder thumbnail
export function generateErrorThumbnail(errorType: 'password' | 'corrupted' | 'unsupported' | 'missing', width = 200, height = 280): string {
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
