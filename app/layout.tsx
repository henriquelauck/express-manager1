import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppProtegido from "@/components/AppProtegido";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Express Manager",
  description: "Sistema de gestão de entregas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <AppProtegido>{children}</AppProtegido>
      </body>
    </html>
  );
}