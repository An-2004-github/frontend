"use client"

import React from "react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
}

export default function Modal({
    isOpen,
    onClose,
    children,
}: ModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl min-w-[300px] relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-3 text-gray-500"
                >
                    ✕
                </button>

                {children}
            </div>
        </div>
    )
}