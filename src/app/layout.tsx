import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://placeholder-url.vercel.app'),
  title: "SpriteLab",
  description: "A fast, web-based pixel art editor. Draw, crop, and auto-process sprites directly in your browser.",
  applicationName: "SpriteLab",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "SpriteLab - Pixel Art Editor",
    description: "A fast, web-based pixel art editor. Draw, crop, and auto-process sprites directly in your browser.",
    url: "https://placeholder-url.vercel.app",
    siteName: "SpriteLab",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "SpriteLab Preview Image (PNG)",
      },
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "SpriteLab Preview Image (JPG)",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpriteLab - Pixel Art Editor",
    description: "A fast, web-based pixel art editor. Draw, crop, and auto-process sprites directly in your browser.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
