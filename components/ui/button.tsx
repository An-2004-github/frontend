import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger"
}

export default function Button({
    children,
    variant = "primary",
    ...props
}: ButtonProps) {

    const baseStyle =
        "px-4 py-2 rounded-lg font-medium transition duration-200"

    let variantStyle = ""

    if (variant === "primary") {
        variantStyle = "bg-blue-600 text-white hover:bg-blue-700"
    }

    if (variant === "secondary") {
        variantStyle = "bg-gray-200 hover:bg-gray-300"
    }

    if (variant === "danger") {
        variantStyle = "bg-red-500 text-white hover:bg-red-600"
    }

    return (
        <button className={`${baseStyle} ${variantStyle}`} {...props}>
            {children}
        </button>
    )
}