import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Aplikasi Internal Gedung A.A. Maramis - LMAN",
  description: "Sistem Manajemen Sewa Ruangan Internal Gedung A.A. Maramis. Khusus untuk Pegawai Lembaga Manajemen Aset Negara (LMAN).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <AuthProvider>
          {children}
        </AuthProvider>
        <ThemeToggle />
      </body>
    </html>
  );
}
