export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
};

export const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN");
};