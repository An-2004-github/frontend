import api from "@/lib/axios"

interface Image {
    image_id: number
    url: string
}

export const imageService = {

    async getImages(
        entityType: string,
        entityId: number
    ): Promise<Image[]> {

        const res = await api.get("/images", {
            params: {
                entity_type: entityType,
                entity_id: entityId,
            },
        })

        return res.data
    },

}