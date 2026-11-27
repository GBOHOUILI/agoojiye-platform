import "./globals.css";
import type { Metadata, Viewport } from "next";
import { DemoStoreProvider } from "@/hooks/demo-store";
export const metadata: Metadata = { title: "AGOOJIYÉ — Plateforme de gestion (démonstration, données fictives)" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body><DemoStoreProvider>{children}</DemoStoreProvider></body></html>;
}
