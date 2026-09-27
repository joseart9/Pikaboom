import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import "./globals.css";

const display = Lilita_One({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"], weight: ["600", "800", "900"] });

export const metadata: Metadata = {
  title: "Pikaboom",
  description: "Minijuegos de fiesta con una bomba. ¡Pasa el teléfono antes de que explote!",
  appleWebApp: { capable: true, title: "Pikaboom", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2b0a57",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
