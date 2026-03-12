import Link from "next/link";
import Image from "next/image";
import SearchBar from "@/components/search/SearchBar";

export default function Home() {
  return (
    <div className="flex flex-col w-full -mt-8"> {/* Kéo banner sát lên Navbar */}

      {/* 1. HERO BANNER & SEARCH BAR */}
      <section className="relative h-[550px] md:h-[600px] flex items-center justify-center w-full">
        {/* Ảnh nền lấy từ thư mục public/images/bg.jpg của bạn */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/bg.jpg"
            alt="Travel Background"
            fill
            priority
            className="object-cover"
          />
          {/* Lớp phủ màu đen trong suốt để làm nổi bật chữ */}
          <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        {/* Nội dung Banner */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center mt-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 text-center drop-shadow-lg tracking-tight">
            Thế giới bao la, chờ bạn khám phá
          </h1>
          <p className="text-lg md:text-xl text-gray-100 mb-10 text-center drop-shadow-md max-w-2xl font-medium">
            Tìm kiếm và đặt ngay Khách sạn, Vé máy bay, Tàu hỏa và Xe khách với mức giá tốt nhất.
          </p>

          {/* Thanh tìm kiếm đặt đè lên banner */}
          <div className="w-full max-w-4xl transform translate-y-6 md:translate-y-12">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Tạo khoảng trống để nhường chỗ cho SearchBar (vì nó bị đẩy xuống bởi translate-y) */}
      <div className="h-16 md:h-24"></div>

      <div className="container mx-auto px-4 flex flex-col gap-16 pb-16">

        {/* 2. CÁC DỊCH VỤ NỔI BẬT */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Dịch vụ của chúng tôi</h2>
            <p className="text-gray-500">Mọi thứ bạn cần cho một chuyến đi hoàn hảo</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { title: "Khách sạn", desc: "Hơn 10,000 chỗ nghỉ", icon: "🏨", link: "/hotels", color: "text-blue-600", bg: "bg-blue-50" },
              { title: "Máy bay", desc: "Mọi hãng hàng không", icon: "✈️", link: "/flights", color: "text-sky-600", bg: "bg-sky-50" },
              { title: "Tàu hỏa", desc: "Xuyên Việt an toàn", icon: "🚆", link: "/trains", color: "text-green-600", bg: "bg-green-50" },
              { title: "Xe khách", desc: "Đa dạng điểm đến", icon: "🚌", link: "/buses", color: "text-teal-600", bg: "bg-teal-50" },
            ].map((service) => (
              <Link key={service.title} href={service.link} className="group outline-none">
                <div className="border border-gray-100 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-3 bg-white shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 group-hover:-translate-y-2 group-focus-visible:ring-2 ring-blue-500">
                  <div className={`text-4xl md:text-5xl w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full ${service.bg} ${service.color} transition-transform duration-300 group-hover:scale-110 mb-2`}>
                    {service.icon}
                  </div>
                  <h3 className="font-bold text-lg md:text-xl text-gray-800">{service.title}</h3>
                  <p className="text-xs md:text-sm text-gray-500 text-center">{service.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. ĐIỂM ĐẾN THỊNH HÀNH (Giao diện Demo đẹp mắt) */}
        <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Điểm đến thịnh hành</h2>
              <p className="text-gray-500">Các địa điểm được yêu thích nhất tháng này</p>
            </div>
            <Link href="/hotels" className="hidden md:block text-blue-600 font-semibold hover:underline">
              Xem tất cả &rarr;
            </Link>
          </div>

          {/* CSS Grid tạo bố cục ảnh kiểu Masonry/Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 h-[500px]">
            {/* Cột 1: Ảnh dọc to */}
            <div className="md:col-span-1 md:row-span-2 relative rounded-3xl overflow-hidden group cursor-pointer shadow-md">
              <div className="absolute inset-0 bg-gray-800">
                {/* Dùng CSS gradient tạm vì chưa có ảnh thật, bạn có thể thay bằng thẻ <Image> sau */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-emerald-400 opacity-80 group-hover:scale-105 transition-transform duration-500"></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-1">Đà Nẵng</h3>
                <p className="text-sm text-gray-200">1,240 khách sạn</p>
              </div>
            </div>

            {/* Cột 2 & 3: Các ảnh nhỏ hơn */}
            <div className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-500 opacity-80 group-hover:scale-105 transition-transform duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-1">Hà Nội</h3>
                <p className="text-sm text-gray-200">850 khách sạn</p>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500 opacity-80 group-hover:scale-105 transition-transform duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-1">TP. Hồ Chí Minh</h3>
                <p className="text-sm text-gray-200">2,100 khách sạn</p>
              </div>
            </div>

            <div className="md:col-span-2 relative rounded-3xl overflow-hidden group cursor-pointer shadow-md">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 opacity-80 group-hover:scale-105 transition-transform duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-1">Nha Trang</h3>
                <p className="text-sm text-gray-200">Bãi biển tuyệt đẹp & nghỉ dưỡng</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}