"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Props {
    value: string;          // comma-separated URLs
    onChange: (csv: string) => void;
    label?: string;
    max?: number;
}

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    ?? "";
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export default function CloudinaryMultiUpload({ value, onChange, label, max = 3 }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const urls = value ? value.split(",").map(u => u.trim()).filter(Boolean) : [];

    const uploadFile = async (file: File): Promise<string> => {
        const fd = new FormData();
        fd.append("file",          file);
        fd.append("upload_preset", PRESET);
        fd.append("folder",        "vivu");
        const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message ?? "Upload thất bại");
        return data.secure_url as string;
    };

    const handleFiles = async (files: FileList) => {
        if (!CLOUD || !PRESET) { setError("Chưa cấu hình Cloudinary"); return; }
        const remaining = max - urls.length;
        if (remaining <= 0) { setError(`Tối đa ${max} ảnh`); return; }
        const toUpload = Array.from(files).slice(0, remaining);
        setUploading(true); setError(null);
        try {
            const newUrls = await Promise.all(toUpload.map(uploadFile));
            onChange([...urls, ...newUrls].join(","));
        } catch (e: unknown) {
            setError((e as Error).message ?? "Upload thất bại");
        } finally {
            setUploading(false);
        }
    };

    const removeUrl = (idx: number) => {
        const next = urls.filter((_, i) => i !== idx);
        onChange(next.join(","));
    };

    return (
        <div>
            {label && (
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#6b8cbf", marginBottom: 4, textTransform: "uppercase" }}>
                    {label}
                </label>
            )}

            {/* Thumbnails */}
            {urls.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {urls.map((url, idx) => (
                        <div key={idx} style={{ position: "relative", width: 90, height: 68, borderRadius: 8, overflow: "hidden", border: "1px solid #e8f0fe", flexShrink: 0 }}>
                            <Image src={url} alt={`ảnh ${idx + 1}`} fill style={{ objectFit: "cover" }} unoptimized />
                            <button
                                type="button"
                                onClick={() => removeUrl(idx)}
                                style={{
                                    position: "absolute", top: 2, right: 2,
                                    background: "rgba(0,0,0,0.55)", color: "#fff",
                                    border: "none", borderRadius: "50%",
                                    width: 20, height: 20, cursor: "pointer",
                                    fontSize: "0.75rem", lineHeight: "20px", textAlign: "center", padding: 0,
                                }}
                            >×</button>
                            <div style={{ position: "absolute", bottom: 2, left: 4, fontSize: "0.65rem", color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                                {idx + 1}/{max}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Drop zone — chỉ hiện khi chưa đủ ảnh */}
            {urls.length < max && (
                <div
                    onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => !uploading && inputRef.current?.click()}
                    style={{
                        border: "2px dashed #c8d8ff", borderRadius: 10,
                        padding: "0.85rem", textAlign: "center",
                        cursor: uploading ? "wait" : "pointer",
                        background: "#f8faff", transition: "border-color 0.15s",
                        marginBottom: "0.5rem",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#0052cc")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#c8d8ff")}
                >
                    {uploading ? (
                        <div style={{ color: "#0052cc", fontSize: "0.82rem" }}>
                            <div style={{ width: 22, height: 22, border: "3px solid #c8d8ff", borderTopColor: "#0052cc", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.4rem" }} />
                            Đang tải lên...
                        </div>
                    ) : (
                        <div style={{ color: "#6b8cbf", fontSize: "0.82rem" }}>
                            📁 Kéo thả hoặc <span style={{ color: "#0052cc", fontWeight: 600 }}>chọn ảnh</span>
                            <div style={{ fontSize: "0.72rem", marginTop: 3 }}>{urls.length}/{max} ảnh · JPG, PNG, WEBP</div>
                        </div>
                    )}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
            />

            {error && <div style={{ fontSize: "0.75rem", color: "#c0392b", marginTop: 2 }}>⚠️ {error}</div>}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
