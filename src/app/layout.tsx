import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f2f2f7",
};

export const metadata: Metadata = {
  title: "RB Agronegócios",
  description: "Gestão de Veículos, Máquinas & Documentos",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RB Agro",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased light">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RB Agro" />
      </head>
      <body className="min-h-full flex flex-col bg-[#f2f2f7] text-zinc-900 selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
