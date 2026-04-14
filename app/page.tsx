import Link from "next/link";
import Image from "next/image";
import SearchBar from "@/components/search/SearchBar";
import BannerSlider from "@/components/BannerSlider";
import DestinationRecommendations from "@/components/recommendation/DestinationRecommendations";
import DestinationsSection from "@/components/DestinationsSection";
import HeroBackground from "@/components/HeroBackground";

export default function Home() {
  return (
    <div className="flex flex-col w-full -mt-8"> {/* Kéo banner sát lên Navbar */}

      {/* 1. HERO BANNER & SEARCH BAR */}
      <section className="relative h-[550px] md:h-[600px] flex items-center justify-center w-full">
        {/* Ảnh nền linh động từ Admin Banner (display_order = 1) */}
        <div className="absolute inset-0 z-0">
          <HeroBackground />
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

        {/* PROMOTIONAL BANNERS */}
        <BannerSlider />

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

        {/* 3. ĐIỂM ĐẾN NỔI BẬT */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <DestinationsSection />
        </section>

        {/* 4. GỢI Ý ĐỊA ĐIỂM (NCF Recommendation) */}
        <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <DestinationRecommendations />
        </section>

      </div>
    </div>
  );
}