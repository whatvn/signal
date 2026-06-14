import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal — Social Listening",
  description: "Real-time social media monitoring for ZaloPay",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
