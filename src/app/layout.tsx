import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import { Haptics } from "@/components/Haptics";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const display = Lilita_One({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"], weight: ["600", "800", "900"] });

export const metadata: Metadata = {
  title: "Pikaboom",
  description: "Minijuegos de fiesta con una bomba. ¡Pasa el teléfono antes de que explote!",
  applicationName: "Pikaboom",
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: "Pikaboom", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4a1791", // must match the top edge of .pb-bg (status bar tint)
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
        <Haptics />
      </body>
    </html>
  );
}
