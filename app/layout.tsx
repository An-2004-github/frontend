"use client";
import "./globals.css";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useAuthInit } from "@/hooks/useAuthInit";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthInit();

  return (
    <html lang="vi">
      <body className="font-sans bg-slate-50 text-slate-900 flex flex-col min-h-screen">
        <GoogleOAuthProvider clientId="432427620604-dk7u0doioej55b63neos8rhm2uu4oe0i.apps.googleusercontent.com">

          <Navbar />

          <main className="grow container mx-auto px-4 py-8">
            {children}
          </main>

          <Footer />

        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
