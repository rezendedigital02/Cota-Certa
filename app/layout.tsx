import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cota Certa — AMT para bomba caneta",
  description:
    "Ferramenta de balcao: marque o poco e o reservatorio no mapa e descubra em segundos quantos metros a bomba caneta precisa vencer.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
