"use client"

import { useEffect, useState } from "react"
import { imageService } from "@/services/imageService"

interface Image {
    image_id: number
    url: string
}

interface Props {
    entityId: number
    entityType: "hotel" | "flight" | "train" | "bus"
}

export default function ImageGallery({
    entityId,
    entityType,
}: Props) {

    const [images, setImages] = useState<Image[]>([])

    useEffect(() => {

        const loadImages = async () => {

            try {

                const data = await imageService.getImages(
                    entityType,
                    entityId
                )

                setImages(data)

            } catch (error) {
                console.error(error)
            }
        }

        loadImages()

    }, [entityId, entityType])

    if (images.length === 0) {
        return null
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

            {images.map((img) => (
                <img
                    key={img.image_id}
                    src={img.url}
                    className="rounded-lg object-cover w-full h-48"
                />
            ))}

        </div>
    )
}