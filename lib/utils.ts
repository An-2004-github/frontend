// lib/utils.ts

/**
 * Format số tiền thành định dạng VNĐ (VD: 1.500.000 ₫)
 */
export const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
};

/**
 * Format chuỗi ISO thời gian thành định dạng thân thiện (VD: 08:30 - 25/12/2023)
 */
export const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    }) + ' - ' + date.toLocaleDateString('vi-VN');
};