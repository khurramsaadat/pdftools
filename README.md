# PDF Converter Online

A modern, responsive web application built with Next.js for converting, merging, and editing PDF documents.

## Features

- **Convert PDFs**: Convert PDFs to Word, Image, and other formats
- **Merge PDFs**: Combine multiple PDF files into one document
- **Edit PDFs**: Add text, images, and annotations
- **Split PDFs**: Break large PDFs into smaller files
- **Secure**: Process files securely with automatic deletion
- **Fast**: Lightning-fast processing with modern technology
- **Free**: Completely free to use

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with dark mode
- **Icons**: React Icons (Feather Icons)
- **TypeScript**: Full TypeScript support
- **Responsive**: Mobile-first responsive design

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
pdf-converter-app/
├── app/                 # Next.js app directory
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── Navbar.tsx     # Navigation component
│   ├── Hero.tsx       # Hero section
│   ├── Features.tsx   # Features grid
│   └── Footer.tsx     # Footer component
├── public/            # Static assets
└── package.json       # Project dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.
