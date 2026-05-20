import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnProduction ERP — Control de Logística y Eventos",
  description: "Sistema transaccional y logístico de nivel empresarial para el control del ciclo de vida de eventos e inventario físico serializado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
