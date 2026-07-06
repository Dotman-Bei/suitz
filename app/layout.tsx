import type { Metadata, Viewport } from "next";

// Self-hosted fonts — bundled with the app, no runtime network fetch.
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { AppStoreProvider } from "@/components/providers/AppStore";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "suitz.",
  description:
    "The canonical home for Zama ERC-20 ↔ ERC-7984 wrapper pairs. Browse the onchain registry, faucet test tokens, wrap, decrypt and unwrap on Sepolia.",
  applicationName: "suitz",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Web3Provider>
          <AppStoreProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </AppStoreProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
