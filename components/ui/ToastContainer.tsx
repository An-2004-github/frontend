"use client";

import { useToastStore } from "@/store/toastStore";

const BG: Record<string, string> = {
    success: "#e6f9f0",
    error:   "#fff0f0",
    warning: "#fffbe6",
    info:    "#e8f0fe",
};
const BORDER: Record<string, string> = {
    success: "#b7dfbb",
    error:   "#ffcdd2",
    warning: "#ffe082",
    info:    "#c8d8ff",
};
const COLOR: Record<string, string> = {
    success: "#00875a",
    error:   "#c0392b",
    warning: "#7b5700",
    info:    "#0052cc",
};
const ICON: Record<string, string> = {
    success: "✓",
    error:   "✕",
    warning: "⚠",
    info:    "ℹ",
};

export default function ToastContainer() {
    const { toasts, remove } = useToastStore();

    return (
        <>
            <style>{`
                @keyframes toast-in  { from { opacity: 0; transform: translateY(12px) scale(0.96); } to { opacity: 1; transform: none; } }
                .vivu-toast { animation: toast-in 0.22s ease; }
            `}</style>
            <div style={{
                position: "fixed", bottom: "1.5rem", right: "1.25rem",
                zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.6rem",
                pointerEvents: "none",
            }}>
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="vivu-toast"
                        style={{
                            display: "flex", alignItems: "flex-start", gap: "0.65rem",
                            background: BG[t.type], border: `1px solid ${BORDER[t.type]}`,
                            borderRadius: 10, padding: "0.7rem 1rem",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                            maxWidth: 340, minWidth: 220, pointerEvents: "all",
                        }}
                    >
                        <span style={{
                            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                            background: COLOR[t.type], color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.75rem", fontWeight: 800, marginTop: 1,
                        }}>
                            {ICON[t.type]}
                        </span>
                        <span style={{ fontSize: "0.875rem", color: "#1a3c6b", lineHeight: 1.45, flex: 1 }}>
                            {t.message}
                        </span>
                        <button
                            onClick={() => remove(t.id)}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: "#6b8cbf", fontSize: "0.9rem", lineHeight: 1,
                                padding: 0, marginTop: 1, flexShrink: 0,
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
