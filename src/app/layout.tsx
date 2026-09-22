import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sistema de Conciliación y Stock",
  description: "Plataforma de reconciliación determinista de catálogos y sincronización de stock"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
