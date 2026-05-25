import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowingMonk Client Hub",
  description: "Internal weekly command center for GrowingMonk client operations.",
  icons: {
    icon: "/favicon-32.png",
    shortcut: "/favicon-32.png",
    apple: "/favicon-32.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
