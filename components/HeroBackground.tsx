"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function HeroBackground() {
    const [bgImage, setBgImage] = useState("/images/bg.jpg");

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/banners`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Lấy banner có display_order = 1
                    const heroBanner = data.find(b => b.display_order === 1 && b.is_active === 1);
                    if (heroBanner && heroBanner.image_url) {
                        setBgImage(heroBanner.image_url);
                    }
                }
            })
            .catch(() => {});
    }, []);

    return (
        <Image
            src={bgImage}
            alt="Travel Background"
            fill
            priority
            className="object-cover"
            unoptimized
        />
    );
}
