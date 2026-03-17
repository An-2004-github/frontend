"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Hotel } from "@/types/hotel"
import { hotelService } from "@/services/hotelService"
import HotelList from "@/components/hotel/HotelList"

export default function SearchResults() {
    const params = useSearchParams()
    const destination = params.get("destination") || ""

    const [hotels, setHotels] = useState<Hotel[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadHotels = async () => {
            try {
                setLoading(true)
                setError(null)
                // ✅ Dùng đúng tên method: getHotels({ search })
                const data = await hotelService.getHotels({ search: destination })
                setHotels(data)
            } catch (err) {
                console.error(err)
                setError("Không thể tải dữ liệu. Vui lòng thử lại.")
            } finally {
                setLoading(false)
            }
        }

        loadHotels()
    }, [destination])

    if (loading) return (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9a8870" }}>
            <div style={{
                width: 36, height: 36, border: "3px solid #f0ebe3",
                borderTopColor: "#d4a050", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 1rem"
            }} />
            <p>Đang tìm kiếm khách sạn...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )

    if (error) return (
        <div style={{
            background: "#fff5f5", border: "1px solid #fcc", color: "#c0392b",
            padding: "1.5rem", borderRadius: "12px", textAlign: "center"
        }}>
            ⚠ {error}
        </div>
    )

    return (
        <div>
            {destination && (
                <p style={{ marginBottom: "1rem", color: "#9a8870", fontSize: "0.9rem" }}>
                    Kết quả cho: <strong style={{ color: "#1a1208" }}>{destination}</strong>
                    {" "}· {hotels.length} khách sạn
                </p>
            )}
            <HotelList hotels={hotels} />
        </div>
    )
}
