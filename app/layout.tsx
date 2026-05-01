"use client";
import { Inter } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ChatBot from "@/components/ChatBot";
import ToastContainer from "@/components/ui/ToastContainer";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useAuthInit } from "@/hooks/useAuthInit";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthInit();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = pathname?.startsWith("/admin");
  const isCheckout = !user && (pathname?.startsWith("/booking") || pathname?.startsWith("/payment"));

  return (
    <html lang="vi">
      <body className={`${inter.className} bg-slate-50 text-slate-900 flex flex-col min-h-screen`}>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>

          {!isAdmin && !isCheckout && <Navbar />}

          <main className={isAdmin || isCheckout ? "" : "grow container mx-auto px-4 py-8"}>
            {children}
          </main>

          {!isAdmin && !isCheckout && <Footer />}
          {!isAdmin && !isCheckout && <ChatBot />}
          <ToastContainer />

        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
