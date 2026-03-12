import type { Metadata } from "next";
// Nếu bạn muốn dùng font Inter của Google:
import { Inter } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Cấu hình font
const inter = Inter({ subsets: ["latin", "vietnamese"] });

// Cấu hình SEO mặc định cho toàn bộ trang
export const metadata: Metadata = {
  title: "TravelApp - Đặt dịch vụ du lịch dễ dàng",
  description: "Nền tảng tìm kiếm và đặt phòng khách sạn, vé máy bay, tàu hỏa và xe khách.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      {/* min-h-screen: Đảm bảo trang web luôn cao ít nhất bằng màn hình 
                flex & flex-col: Đẩy Footer xuống dưới cùng nếu nội dung ngắn 
            */}
      <body className={`${inter.className} flex flex-col min-h-screen bg-gray-50 text-gray-900`}>

        {/* Component Navbar ở trên cùng */}
        <Navbar />

        {/* Phần nội dung động của từng trang sẽ render vào đây */}
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>

        {/* Component Footer ở dưới cùng */}
        <Footer />

      </body>
    </html>
  );
}