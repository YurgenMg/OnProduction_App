import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#060913",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "OnProduction ERP — Control de Logística y Eventos",
  description: "Sistema transaccional y logístico de nivel empresarial para el control del ciclo de vida de eventos e inventario físico serializado.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OnProduction",
  },
  applicationName: "OnProduction",
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {/* Background glow spots for rich premium aesthetics */}
        <div className="glow-background">
          <div className="glow-spot-1"></div>
          <div className="glow-spot-2"></div>
        </div>
        
        {children}
      </body>
    </html>
  );
}
