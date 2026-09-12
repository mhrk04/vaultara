import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "~~/components/Providers";

export const metadata: Metadata = {
  title: "Vaultara — encrypted, onchain-shared storage",
  description:
    "Privacy-first decentralized Drive. Files encrypted in your browser, stored on IPFS, with revocable, ENS-addressed access grants recorded onchain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
