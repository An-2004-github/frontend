"use client";
import { Inter } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ChatBot from "@/components/ChatBot";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useAuthInit } from "@/hooks/useAuthInit";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthInit();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <html lang="vi">
      <body className={`${inter.className} bg-slate-50 text-slate-900 flex flex-col min-h-screen`}>
        <GoogleOAuthProvider clientId="600520983957-j74rtlmpkj0ia8ifv19uihnn0h8la03o.apps.googleusercontent.com">

          {!isAdmin && <Navbar />}

          <main className={isAdmin ? "" : "grow container mx-auto px-4 py-8"}>
            {children}
          </main>

          {!isAdmin && <Footer />}
          {!isAdmin && <ChatBot />}

        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
