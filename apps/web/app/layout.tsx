import type { Metadata } from "next";
import "./globals.css";
import ConsentGate from "./consent-gate";

export const metadata: Metadata = {
  title: "market013.app",
  description: "Compare preços e encontre a cesta mais econômica.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><ConsentGate>{children}</ConsentGate></body>
    </html>
  );
}
