import "./globals.css"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">

        <Navbar />

        <main className="max-w-6xl mx-auto p-4">
          {children}
        </main>

        <Footer />

      </body>
    </html>
  )
}