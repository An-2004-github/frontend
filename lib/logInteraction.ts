/**
 * Fire-and-forget helpers để ghi lại hành vi người dùng.
 * Không throw error, không block UI.
 * Chỉ gọi khi user đã đăng nhập (backend tự reject nếu không có token).
 */

import api from "@/lib/axios";

/**
 * Ghi lại khi user tương tác với entity (view, click, book...).
 * @param entityType  'hotel' | 'flight' | 'bus'
 * @param entityId    ID của entity
 * @param action      'view_detail' | 'click' | 'view' | 'book'
 */
export function logInteraction(
    entityType: "hotel" | "flight" | "bus",
    entityId: number,
    action: "view_detail" | "click" | "view" | "book" | "view_list",
): void {
    api.post("/api/interactions/log", { entity_type: entityType, entity_id: entityId, action })
        .catch(() => {/* silent */});
}

/**
 * Ghi lại từ khóa tìm kiếm.
 * @param keyword  Từ khóa user nhập vào ô tìm kiếm
 */
export function logSearch(keyword: string): void {
    if (!keyword || keyword.trim().length < 2) return;
    api.post("/api/interactions/search", { keyword: keyword.trim() })
        .catch(() => {/* silent */});
}
