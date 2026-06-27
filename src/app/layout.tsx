import type { Metadata } from "next";
import "./globals.css";
import NextAuthSessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "VulnScope",
  description: "AI-Powered Penetration Testing Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
      </body>
    </html>
  );
}
