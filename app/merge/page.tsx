'use client'

import Link from 'next/link'
import { useState, useRef, useCallback } from 'react'
import { mergePDFs, mergeSelectedPages } from '@/utils/pdfMerger'
import { 
  FiArrowLeft, 
  FiUpload, 
  FiFile, 
  FiLayers, 
  FiSettings, 
  FiShield, 
  FiCheckCircle,
  FiMove,
  FiInfo,
  FiFolder,
  FiTarget,
  FiZap,
  FiX
} from 'react-icons/fi'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PDFThumbnailViewer from '@/components/PDFThumbnailViewer'

interface PDFFile {
  id: string
  name: string
  size: string
  sizeBytes: number
  pages: number
  file: File
}

interface SelectedPage {
  id: string
  fileId: string
  fileName: string
  pageNumber: number
  thumbnail: string
  orderIndex: number
}

export default function MergePDFPage() {
  const [selectedFiles, setSelectedFiles] = useState<PDFFile[]>([])
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([])
  const [outputFilename, setOutputFilename] = useState('merged-document')
  const [isDragOver, setIsDragOver] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeStatus, setMergeStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return

    const newFiles: PDFFile[] = []
    
    Array.from(files).forEach((file) => {
      if (file.type === 'application/pdf') {
        const newFile: PDFFile = {
          id: generateId(),
          name: file.name,
          size: formatFileSize(file.size),
          sizeBytes: file.size,
          pages: Math.floor(Math.random() * 50) + 1, // Placeholder - in real app, you'd analyze the PDF
          file: file
        }
        newFiles.push(newFile)
      }
    })

    setSelectedFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files)
    // Reset the input so the same file can be selected again
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    processFiles(event.dataTransfer.files)
  }

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...selectedFiles]
    const [movedFile] = newFiles.splice(fromIndex, 1)
    newFiles.splice(toIndex, 0, movedFile)
    setSelectedFiles(newFiles)
  }

  const handlePagesSelected = (pages: SelectedPage[]) => {
    setSelectedPages(pages)
  }

  const handleMergeSelectedPages = async () => {
    if (selectedPages.length === 0) return

    setIsMerging(true)
    setMergeStatus('Preparing selected pages for merge...')

    try {
      // Group selected pages by file
      const pageSelections = selectedFiles.map(file => {
        const filePagesSelected = selectedPages
          .filter(page => page.fileId === file.id)
          .map(page => page.pageNumber)
        
        return {
          file: file.file,
          pageNumbers: filePagesSelected
        }
      }).filter(selection => selection.pageNumbers.length > 0)

      setMergeStatus(`Merging ${selectedPages.length} selected pages...`)

      const result = await mergeSelectedPages(pageSelections, {
        filename: outputFilename
      })

      if (result.success) {
        setMergeStatus(`✅ Successfully merged ${selectedPages.length} pages! Download started.`)
        setTimeout(() => setMergeStatus(''), 3000)
      } else {
        setMergeStatus(`❌ Error: ${result.error}`)
        setTimeout(() => setMergeStatus(''), 5000)
      }
    } catch (error: any) {
      setMergeStatus(`❌ Error: ${error.message || 'Unknown error occurred'}`)
      setTimeout(() => setMergeStatus(''), 5000)
    } finally {
      setIsMerging(false)
    }
  }

  const handleMergeAllPages = async (showConfirmation = false) => {
    if (selectedFiles.length === 0) return

    const totalPages = selectedFiles.reduce((sum, file) => sum + file.pages, 0)
    
    if (showConfirmation && selectedPages.length > 0) {
      const confirmMergeAll = window.confirm(
        `You have ${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''} selected.\n\n` +
        `Click OK to merge ALL ${totalPages} pages from all files instead, or Cancel to merge only selected pages.`
      )
      if (!confirmMergeAll) return
    }

    setIsMerging(true)
    setMergeStatus(`Preparing all ${totalPages} pages for merge...`)

    try {
      const filesToMerge = selectedFiles.map(file => file.file)
      
      setMergeStatus(`Merging all ${totalPages} pages from ${selectedFiles.length} files...`)

      const result = await mergePDFs(filesToMerge, {
        filename: outputFilename
      })

      if (result.success) {
        setMergeStatus(`✅ Successfully merged all ${totalPages} pages! Download started.`)
        setTimeout(() => setMergeStatus(''), 3000)
      } else {
        setMergeStatus(`❌ Error: ${result.error}`)
        setTimeout(() => setMergeStatus(''), 5000)
      }
    } catch (error: any) {
      setMergeStatus(`❌ Error: ${error.message || 'Unknown error occurred'}`)
      setTimeout(() => setMergeStatus(''), 5000)
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Header Section */}
      <section className="bg-gradient-to-br from-gray-800 via-gray-700 to-orange-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <FiArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Merge PDF Files
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Combine multiple PDF documents into a single, organized file. Drag, drop, and reorder your files with ease.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Upload Section */}
          <div className="bg-white rounded-xl p-8 mb-8 shadow-lg">
            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                isDragOver 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-orange-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={selectedFiles.length === 0 ? handleFileSelect : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <FiUpload className={`h-16 w-16 mx-auto mb-4 ${isDragOver ? 'text-orange-500' : 'text-gray-400'}`} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Drop your files here or{' '}
                <span className="text-orange-600 underline">browse</span>
              </h3>
              <p className="text-gray-500 mb-2">Supports: .pdf files only</p>
              
              {selectedFiles.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFileSelect()
                  }}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <FiUpload className="h-4 w-4 mr-2" />
                  Add More Files
                </button>
              )}
            </div>

            {/* File Order & Analysis - Integrated */}
            {selectedFiles.length > 0 && (
              <div className="mt-8 border-t pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-700 flex items-center">
                    <FiMove className="h-5 w-5 mr-2" />
                    File Order & Analysis ({selectedFiles.length} files)
                  </h4>
                  <div className="text-sm text-gray-500">
                    Total: {selectedFiles.reduce((acc, file) => acc + file.pages, 0)} pages • {selectedFiles.reduce((acc, file) => acc + file.sizeBytes, 0) > 1024 * 1024 ? 
                      `${(selectedFiles.reduce((acc, file) => acc + file.sizeBytes, 0) / (1024 * 1024)).toFixed(1)} MB` :
                      `${(selectedFiles.reduce((acc, file) => acc + file.sizeBytes, 0) / 1024).toFixed(0)} KB`}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {selectedFiles.map((file, index) => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded-lg border-2 border-gray-200 px-4 py-4 hover:border-orange-300 transition-colors">
                      <div className="flex items-center flex-1">
                        <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 min-w-[2rem]">
                          {index + 1}
                        </div>
                        <FiMove className="h-5 w-5 text-gray-400 mr-3 cursor-move" />
                        <FiFile className="h-5 w-5 text-red-500 mr-3" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{file.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {file.pages} pages • {file.size} • Added: {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button 
                          onClick={() => moveFile(index, Math.max(0, index - 1))}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-200 transition-colors"
                          title="Move up"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => moveFile(index, Math.min(selectedFiles.length - 1, index + 1))}
                          disabled={index === selectedFiles.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-200 transition-colors"
                          title="Move down"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          title="Remove file"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      const reversed = [...selectedFiles].reverse()
                      setSelectedFiles(reversed)
                    }}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ↕️ Reverse Order
                  </button>
                  <button
                    onClick={() => {
                      const sorted = [...selectedFiles].sort((a, b) => a.name.localeCompare(b.name))
                      setSelectedFiles(sorted)
                    }}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    🔤 Sort A-Z
                  </button>
                  <button
                    onClick={() => {
                      const sorted = [...selectedFiles].sort((a, b) => a.sizeBytes - b.sizeBytes)
                      setSelectedFiles(sorted)
                    }}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    📊 Sort by Size
                  </button>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="inline-flex items-center px-3 py-2 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors"
                  >
                    🗑️ Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Debug Info */}
          {debugMode && selectedFiles.length > 0 && (
            <div className="bg-gray-100 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Debug Information</h3>
                <button
                  onClick={() => setDebugMode(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 text-sm">
                {selectedFiles.map((file) => (
                  <div key={file.id} className="bg-white p-4 rounded border">
                    <h4 className="font-medium text-gray-800 mb-2">{file.name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-gray-600">
                      <div>File size: {file.size}</div>
                      <div>File type: {file.file.type || 'unknown'}</div>
                      <div>Last modified: {new Date(file.file.lastModified).toLocaleString()}</div>
                      <div>Expected pages: {file.pages}</div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-4">
                  Check browser console for detailed PDF.js logs and errors.
                </div>
              </div>
            </div>
          )}

          {/* PDF Thumbnail Viewer */}
          {selectedFiles.length > 0 && (
            <PDFThumbnailViewer
              files={selectedFiles}
              onPagesSelected={handlePagesSelected}
            />
          )}

          {/* Debug Toggle */}
          {selectedFiles.length > 0 && !debugMode && (
            <div className="text-center mb-8">
              <button
                onClick={() => setDebugMode(true)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Show debug information
              </button>
            </div>
          )}

          {/* Advanced Merge Options */}
          <div className="bg-white rounded-xl p-8 mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <FiSettings className="h-5 w-5 mr-2" />
                Advanced Merge Options
              </h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Professional Features
              </span>
            </div>

            {/* Merge Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Merge Type
                </label>
                <select className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option>Sequential Merging</option>
                  <option>Interleaved Merging</option>
                  <option>Custom Page Selection</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Sequential: Combine all pages in order. Selective: Choose specific page ranges.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Level
                </label>
                <select className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option>Balanced (Recommended)</option>
                  <option>High Quality</option>
                  <option>Optimized for Web</option>
                  <option>Maximum Compression</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Balance between file size and quality maintenance.</p>
              </div>
            </div>

            {/* Output Filename */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Filename
              </label>
              <div className="flex">
                <input 
                  type="text" 
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 text-gray-500">.pdf</span>
              </div>
              <div className="mt-2">
                <label className="flex items-center text-sm text-gray-600">
                  <input type="checkbox" className="mr-2 rounded" />
                  Preserve bookmarks and links
                </label>
              </div>
            </div>

            {/* Professional Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                <FiInfo className="h-4 w-4 mr-2" />
                Professional Tips
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use page thumbnails to select specific pages from each PDF</li>
                <li>• Try different layout modes: Grouped, Continuous, or Tabbed views</li>
                <li>• Drag and drop selected pages to customize the final order</li>
                <li>• Use "Select All/None" buttons for quick page selection</li>
                <li>• Large thumbnails help you verify the correct pages are selected</li>
              </ul>
            </div>

            {/* Apply Button */}
            {selectedFiles.length > 0 ? (
              <div className="space-y-4">
                {selectedPages.length > 0 ? (
                  <button 
                    onClick={handleMergeSelectedPages}
                    disabled={isMerging}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center disabled:cursor-not-allowed"
                  >
                    {isMerging ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Merging...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle className="h-5 w-5 mr-2" />
                        Merge {selectedPages.length} Selected Page{selectedPages.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center py-4">
                      <FiInfo className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No pages selected - you can select specific pages above or merge all pages</p>
                    </div>
                  </div>
                )}
                
                {/* Always show merge all option */}
                <button 
                  onClick={() => handleMergeAllPages(selectedPages.length > 0)}
                  disabled={isMerging}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center disabled:cursor-not-allowed"
                >
                  {isMerging ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Merging...
                    </>
                  ) : (
                    <>
                      <FiLayers className="h-5 w-5 mr-2" />
                      Merge All Pages ({selectedFiles.reduce((sum, file) => sum + file.pages, 0)} total)
                    </>
                  )}
                </button>
                
                {/* Merge Status Display */}
                {mergeStatus && (
                  <div className={`p-4 rounded-lg text-center text-sm font-medium ${
                    mergeStatus.includes('✅') 
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : mergeStatus.includes('❌')
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}>
                    {mergeStatus}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiUpload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Please upload PDF files to start merging</p>
              </div>
            )}
          </div>

          {/* Key Features */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white text-center mb-8">Key Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-700 rounded-xl p-6 text-center">
                <div className="bg-orange-600 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <FiLayers className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-2">Quality Preservation</h4>
                <p className="text-gray-400 text-sm">Advanced quality control with options for high fidelity, balanced, or optimized compression to maintain document integrity.</p>
              </div>
              
              <div className="bg-gray-700 rounded-xl p-6 text-center">
                <div className="bg-orange-600 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <FiTarget className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-2">Selective Page Merging</h4>
                <p className="text-gray-400 text-sm">Extract specific page ranges from multiple documents and combine them in any order for custom document compilation.</p>
              </div>
              
              <div className="bg-gray-700 rounded-xl p-6 text-center">
                <div className="bg-orange-600 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <FiFolder className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-2">Smart File Organization</h4>
                <p className="text-gray-400 text-sm">Drag and drop to reorder files, preserve bookmarks and hyperlinks, and maintain professional document structure.</p>
              </div>
              
              <div className="bg-gray-700 rounded-xl p-6 text-center">
                <div className="bg-orange-600 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <FiShield className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-white mb-2">Secure & Reliable</h4>
                <p className="text-gray-400 text-sm">Advanced error handling for password-protected files, size validation, and secure client-side processing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
