# 👾 SpriteLab

**SpriteLab** is a premium, browser-based suite of high-performance tools designed for pixel artists and game developers. Whether you're starting from scratch or converting high-resolution assets into retro sprites, SpriteLab provides a seamless, professional-grade workflow.

![SpriteLab Banner](public/favicon.ico) *Note: Replace with a proper banner if available.*

---

## 🚀 Features

### 🖌️ Pixel Editor
A robust, canvas-based editor optimized for precision pixel art.
- **Auto-Magic Background Removal**: Instantly detects and removes solid backgrounds with a single click.
- **Dynamic Effects**:
  - **Pixel Outline**: Add a clean, consistent border to your sprites in any color.
  - **Drop Shadow**: Generate retro-style offset shadows to add depth.
- **Precision Canvas**: Support for zooming (scroll wheel), panning, and real-time brush/eraser tools.
- **Workflow Tools**:
  - **Undo/Redo**: Full history support with keyboard shortcuts (`Cmd/Ctrl + Z` and `Cmd/Ctrl + Y`).
  - **Auto-Crop**: Automatically shrinks the canvas to fit your sprite's exact boundaries.
  - **High-Res Export**: Download your work as PNG with custom scaling (e.g., 2x, 4x, 10x) to preserve pixel crispness.

### ⚡ Sprite Converter
Transform any logo, photo, or high-res illustration into a "cute" 8-bit sprite.
- **Smart Cropping**: Integrated image cropping to focus on the most important parts of your source image.
- **Retro Engine**:
  - **Adjustable Block Size**: Control the "pixelation" density.
  - **Color Posterization**: Limit the color palette (from 2 to 16 levels) for that authentic console feel.
  - **Intelligent Edge Outlining**: Automatically detects object boundaries and applies dark outlines to make your sprites pop.
- **Instant Preview**: Adjust settings in real-time and see the results immediately on a pixel-perfect canvas.

---

## 🛠️ Technology Stack

SpriteLab is built with modern, high-performance web technologies:

| Category | Technology |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Image Processing** | HTML5 Canvas API & [Cropper.js](https://fengyuanchen.github.io/cropperjs/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Animation** | WebGL-powered ASCII Shaders |

---

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- npm / pnpm / yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sprite-lab.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎨 Aesthetic Design
SpriteLab features a premium **Dark Mode** interface with:
- **Neon Accents**: Indigo and Fuchsia highlights for a modern "cyberpunk" feel.
- **Interactive Backgrounds**: A custom WebGL fragment shader that renders a dynamic ASCII blob on the landing page.
- **Glassmorphism**: Backdrop-blurred toolbars and panels for a sleek, layered look.

---

## 📄 License
MIT License. Created by [Adil Husain](https://github.com/adilhusain01).
