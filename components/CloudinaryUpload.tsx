"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Props {
    value: string;           // URL hiện tại
    onChange: (url: string) => void;
    label?: string;
}

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   ?? "";
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export default function CloudinaryUpload({ value, onChange, label }: Props) {
    const inputRef  = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error,     setError]     = useState<string | null>(null);

    const handleFile = async (file: File) => {
        if (!CLOUD || !PRESET) {
            setError("Chưa cấu hình Cloudinary (CLOUD_NAME / UPLOAD_PRESET)");
            return;
        }
        setUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("file",         file);
            fd.append("upload_preset", PRESET);
            fd.append("folder",       "vivu");

            const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
                method: "POST",
                body:   fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message ?? "Upload thất bại");
            onChange(data.secure_url);
        } catch (e: unknown) {
            setError((e as Error).message ?? "Upload thất bại");
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div>
            {label && (
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#6b8cbf", marginBottom: 4, textTransform: "uppercase" }}>
                    {label}
                </label>
            )}

            {/* Drop zone */}
            <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => !uploading && inputRef.current?.click()}
                style={{
                    border: "2px dashed #c8d8ff", borderRadius: 10,
                    padding: "1rem", textAlign: "center",
                    cursor: uploading ? "wait" : "pointer",
                    background: "#f8faff", transition: "border-color 0.15s",
                    marginBottom: "0.5rem",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#0052cc")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#c8d8ff")}
            >
                {uploading ? (
                    <div style={{ color: "#0052cc", fontSize: "0.85rem" }}>
                        <div style={{ width: 24, height: 24, border: "3px solid #c8d8ff", borderTopColor: "#0052cc", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.5rem" }} />
                        Đang tải lên...
                    </div>
                ) : (
                    <div style={{ color: "#6b8cbf", fontSize: "0.85rem" }}>
                        📁 Kéo thả ảnh vào đây hoặc <span style={{ color: "#0052cc", fontWeight: 600 }}>chọn file</span>
                        <div style={{ fontSize: "0.75rem", marginTop: 4 }}>JPG, PNG, WEBP · tối đa 10MB</div>
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />

            {/* URL input thủ công */}
            <input
                type="text"
                placeholder="Hoặc dán URL ảnh trực tiếp..."
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: "100%", padding: "0.55rem 0.75rem",
                    border: "1.5px solid #e8f0fe", borderRadius: 8,
                    fontSize: "0.82rem", boxSizing: "border-box",
                    color: "#1a3c6b",
                }}
            />

            {/* Preview */}
            {value && !error && (
                <div style={{ marginTop: "0.5rem", position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #e8f0fe", height: 120 }}>
                    <Image
                        src={value}
                        alt="preview"
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                    />
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        style={{
                            position: "absolute", top: 4, right: 4,
                            background: "rgba(0,0,0,0.55)", color: "#fff",
                            border: "none", borderRadius: "50%", width: 22, height: 22,
                            cursor: "pointer", fontSize: "0.8rem", lineHeight: "22px",
                        }}
                    >×</button>
                </div>
            )}

            {error && (
                <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#c0392b" }}>⚠️ {error}</div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
