import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conciliación & Stock | ListaJev",
  description: "Plataforma de conciliación determinista de inventarios y catálogos comerciales"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-zinc-100 font-sans antialiased text-zinc-900 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
