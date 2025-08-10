import Link from 'next/link'
import { FiMail, FiTwitter, FiGithub, FiHeart } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 text-white mb-4">
              <span className="font-bold text-xl">PDF Converter Online</span>
            </Link>
            <p className="text-gray-400 mb-4 max-w-md">
              The most comprehensive online PDF toolkit. Convert, merge, edit, and manage your PDF documents with ease. Fast, secure, and completely free.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FiTwitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FiGithub className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FiMail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-white font-semibold mb-4">Convert</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/convert/pdf-to-word" className="text-gray-400 hover:text-white transition-colors">
                  PDF to Word
                </Link>
              </li>
              <li>
                <Link href="/convert/pdf-to-image" className="text-gray-400 hover:text-white transition-colors">
                  PDF to Image
                </Link>
              </li>
              <li>
                <Link href="/convert/word-to-pdf" className="text-gray-400 hover:text-white transition-colors">
                  Word to PDF
                </Link>
              </li>
              <li>
                <Link href="/convert/excel-to-pdf" className="text-gray-400 hover:text-white transition-colors">
                  Excel to PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Edit & Manage */}
          <div>
            <h3 className="text-white font-semibold mb-4">Edit & Manage</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/merge" className="text-gray-400 hover:text-white transition-colors">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link href="/split" className="text-gray-400 hover:text-white transition-colors">
                  Split PDF
                </Link>
              </li>
              <li>
                <Link href="/edit" className="text-gray-400 hover:text-white transition-colors">
                  Edit PDF
                </Link>
              </li>
              <li>
                <Link href="/protect" className="text-gray-400 hover:text-white transition-colors">
                  Protect PDF
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-400 text-sm">
                © 2024 PDF Converter Online. All rights reserved.
              </p>
              <div className="flex space-x-4">
                <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
                <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex items-center text-gray-400 text-sm mt-4 md:mt-0">
              <span>Made with</span>
              <FiHeart className="h-4 w-4 mx-1 text-red-500" />
              <span>for document productivity</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
