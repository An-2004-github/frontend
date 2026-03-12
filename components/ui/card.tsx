import React from "react"

interface CardProps {
    children: React.ReactNode
}

export default function Card({ children }: CardProps) {
    return (
        <div className="bg-white shadow-md rounded-xl p-4 border">
            {children}
        </div>
    )
}