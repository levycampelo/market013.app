import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "market013.app",
  description: "Compare preços e encontre a cesta mais econômica.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
