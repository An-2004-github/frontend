"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { destinationService, Destination } from "@/services/detinationService";

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputStyle?: React.CSSProperties;
    cityMode?: boolean;
    /** Khi truyền vào, danh sách này sẽ thay thế danh sách lấy từ API */
    cities?: string[];
}

let _cache: Destination[] | null = null;

export default function DestinationInput({
    value,
    onChange,
    placeholder = "Nhập địa điểm...",
    className = "",
    inputStyle,
    cityMode = false,
    cities: citiesOverride,
}: Props) {
    const [destinations, setDestinations] = useState<Destination[]>(_cache ?? []);
    const [open, setOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Fetch một lần, cache lại
    useEffect(() => {
        if (_cache) return;
        destinationService.getDestinations({ limit: 100 })
            .then(data => { _cache = data; setDestinations(data); })
            .catch(() => {});
    }, []);

    // Tính vị trí dropdown theo input (portal render ra body)
    useEffect(() => {
        if (!open || !inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownStyle({
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 99999,
        });
    }, [open]);

    // Cập nhật vị trí khi scroll/resize
    useEffect(() => {
        if (!open) return;
        const update = () => {
            if (!inputRef.current) return;
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: "fixed",
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 99999,
            });
        };
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [open]);

    // Đóng khi click ngoài
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (wrapRef.current && !wrapRef.current.contains(target)) {
                // Kiểm tra xem click có nằm trong dropdown portal không
                const portal = document.getElementById("di-portal-root");
                if (portal && portal.contains(target)) return;
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Lấy danh sách tỉnh/thành phố duy nhất (ưu tiên prop override)
    const cities = citiesOverride ?? [...new Set(destinations.map(d => d.city))].sort();

    const filtered = value.trim().length === 0
        ? cities
        : cities.filter(city => city.toLowerCase().includes(value.toLowerCase()));

    const handleSelect = (city: string) => {
        onChange(city);
        setOpen(false);
    };

    const dropdown = open ? (
        <div id="di-portal-root" style={dropdownStyle}>
            <style>{`
                .di-dropdown {
                    background: #fff;
                    border: 1.5px solid #c8d8ff;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,82,204,0.18);
                    overflow: hidden;
                }
                .di-dropdown-list {
                    max-height: 280px; overflow-y: auto;
                }
                .di-dropdown-list::-webkit-scrollbar { width: 4px; }
                .di-dropdown-list::-webkit-scrollbar-thumb { background: #c8d8ff; border-radius: 4px; }
                .di-item {
                    display: flex; align-items: center; gap: 0.6rem;
                    padding: 0.6rem 0.85rem; cursor: pointer;
                    transition: background 0.12s; border-bottom: 1px solid #f0f4ff;
                    font-family: 'DM Sans', sans-serif;
                }
                .di-item:last-child { border-bottom: none; }
                .di-item:hover { background: #f0f4ff; }
                .di-item-icon { font-size: 1rem; flex-shrink: 0; }
                .di-item-city { font-size: 0.88rem; font-weight: 600; color: #1a3c6b; }
                .di-item-name { font-size: 0.75rem; color: #6b8cbf; }
                .di-empty { padding: 0.75rem 0.85rem; font-size: 0.85rem; color: #6b8cbf; text-align: center; }
            `}</style>
            <div className="di-dropdown">
                <div className="di-dropdown-list">
                    {filtered.length > 0 ? filtered.map(city => (
                        <div
                            key={city}
                            className="di-item"
                            onMouseDown={() => handleSelect(city)}
                        >
                            <span className="di-item-icon">📍</span>
                            <div className="di-item-city">{city}</div>
                        </div>
                    )) : (
                        <div className="di-empty">Không tìm thấy địa điểm</div>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div ref={wrapRef} style={{ position: "relative" }}>
            <style>{`
                .di-input {
                    width: 100%; border: 1.5px solid #dde3f0; border-radius: 10px;
                    padding: 0.7rem 2.2rem 0.7rem 0.9rem;
                    font-size: 0.9rem; font-family: 'DM Sans', sans-serif;
                    color: #1a3c6b; outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    background: #fff;
                }
                .di-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
                .di-input::placeholder { color: #b0bcd8; font-weight: 300; }
                .di-pin {
                    position: absolute; right: 0.7rem; top: 50%;
                    transform: translateY(-50%); font-size: 0.85rem;
                    color: #6b8cbf; pointer-events: none;
                }
            `}</style>

            <input
                ref={inputRef}
                className={`di-input ${className}`}
                style={inputStyle}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                autoComplete="off"
            />
            <span className="di-pin">📍</span>

            {typeof window !== "undefined" && createPortal(dropdown, document.body)}
        </div>
    );
}
