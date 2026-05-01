"use client";

import { useState, useRef, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
    role: "user" | "model";
    text: string;
    ts: number; // timestamp
    copying?: boolean;
}

const INIT_MSG: Message = {
    role: "model",
    ts: Date.now(),
    text: "Xin chào! 👋 Tôi là **VIVU Assistant** — trợ lý du lịch của bạn.\n\nTôi có thể giúp bạn:\n- 🏨 Tìm khách sạn theo điểm đến và ngày\n- ✈️ Gợi ý chuyến bay, tàu hỏa, xe khách\n- 🎟️ Tư vấn mã giảm giá phù hợp\n- 📋 Giải đáp chính sách đặt chỗ\n\nBạn cần hỗ trợ gì?",
};

const SUGGESTIONS = [
    "Gợi ý điểm du lịch hè 2026?",
    "Có mã giảm giá nào không?",
    "Chính sách hủy phòng?",
    "Tìm khách sạn Đà Nẵng cuối tuần này",
];

function getToken(): string {
    try {
        const raw = localStorage.getItem("auth-storage");
        if (raw) return JSON.parse(raw)?.state?.token ?? "";
    } catch { }
    return "";
}

function fmtTime(ts: number) {
    return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// ── Markdown renderer ─────────────────────────────────────────────
function renderMarkdown(text: string) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;
    let k = 0; // unique key counter

    while (i < lines.length) {
        const line = lines[i];

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s/, ""));
                i++;
            }
            elements.push(
                <ol key={k++} style={{ margin: "0.4rem 0", paddingLeft: "1.4rem" }}>
                    {items.map((it, j) => <li key={j} style={{ marginBottom: 2 }}>{renderInline(it)}</li>)}
                </ol>
            );
            continue;
        }

        // Bullet list
        if (/^[-*•]\s/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*•]\s/, ""));
                i++;
            }
            elements.push(
                <ul key={k++} style={{ margin: "0.4rem 0", paddingLeft: "1.4rem" }}>
                    {items.map((it, j) => <li key={j} style={{ marginBottom: 2 }}>{renderInline(it)}</li>)}
                </ul>
            );
            continue;
        }

        // Heading
        if (/^#{1,3}\s/.test(line)) {
            const lvl = line.match(/^(#+)/)![1].length;
            const txt = line.replace(/^#+\s/, "");
            const fs = lvl === 1 ? "1rem" : lvl === 2 ? "0.92rem" : "0.88rem";
            elements.push(<div key={k++} style={{ fontWeight: 700, fontSize: fs, margin: "0.5rem 0 0.2rem" }}>{renderInline(txt)}</div>);
            i++;
            continue;
        }

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
            elements.push(<hr key={k++} style={{ border: "none", borderTop: "1px solid #e8f0fe", margin: "0.5rem 0" }} />);
            i++;
            continue;
        }

        // Empty line
        if (line.trim() === "") {
            elements.push(<div key={k++} style={{ height: "0.35rem" }} />);
            i++;
            continue;
        }

        // Normal paragraph
        elements.push(<div key={k++}>{renderInline(line)}</div>);
        i++;
    }

    return elements;
}

// Danh sách tỉnh/thành phố Việt Nam để fallback auto-link
const VN_CITIES = [
    "Hà Nội","Hồ Chí Minh","Đà Nẵng","Hội An","Huế","Nha Trang","Đà Lạt",
    "Phú Quốc","Quy Nhơn","Vũng Tàu","Hạ Long","Sapa","Sa Pa","Ninh Bình",
    "Mũi Né","Phan Thiết","Cần Thơ","Hải Phòng","Buôn Ma Thuột","Pleiku",
    "Quảng Ninh","Quảng Nam","Bình Định","Khánh Hòa","Lâm Đồng","Kiên Giang",
    "Côn Đảo","Phong Nha","Mộc Châu","Cao Bằng","Hà Giang","Lai Châu",
];
// Regex match tên thành phố (dùng khi bold text không có link)
const CITY_RE = new RegExp(`\\b(${VN_CITIES.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");

function autoLinkCities(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    CITY_RE.lastIndex = 0;
    while ((match = CITY_RE.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        const city = match[1];
        parts.push(
            <a key={match.index} href={`/hotels?search=${encodeURIComponent(city)}`}
                style={{ color: "#0052cc", fontWeight: 600, textDecoration: "underline" }}>
                {city}
            </a>
        );
        last = match.index + city.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length > 1 ? parts : [text];
}

function normalizeHref(url: string): string {
    try {
        const parsed = new URL(url);
        // Strip domain khỏi mọi absolute URL — chỉ giữ path + query
        return parsed.pathname + parsed.search;
    } catch { }
    // Đã là relative path → giữ nguyên
    return url;
}

function renderInline(text: string): React.ReactNode[] {
    const parts = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*|`[^`]+`)/g);
    return parts.map((part, j) => {
        const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (link) {
            return (
                <a
                    key={j}
                    href={normalizeHref(link[2])}
                    style={{ color: "#0052cc", fontWeight: 600, textDecoration: "underline" }}
                >
                    {link[1]}
                </a>
            );
        }
        if (/^\*\*(.*?)\*\*$/.test(part)) {
            return <strong key={j}>{renderInline(part.slice(2, -2))}</strong>;
        }
        if (/^`[^`]+`$/.test(part)) return (
            <code key={j} style={{ background: "#f0f4ff", borderRadius: 4, padding: "0 4px", fontSize: "0.82rem", fontFamily: "monospace" }}>
                {part.slice(1, -1)}
            </code>
        );
        const linked = autoLinkCities(part);
        return linked.length > 1 ? <span key={j}>{linked}</span> : <span key={j}>{part}</span>;
    });
}

export default function ChatBot() {
    const STORAGE_KEY = "vivu-chat-v2";

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch { }
        return [INIT_MSG];
    });
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [unread, setUnread] = useState(0);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Persist messages
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); } catch { }
    }, [messages]);

    // Scroll
    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading, open]);

    useEffect(() => {
        if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
    }, [open]);

    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;
        setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
    };

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });


    // Copy message
    const copyMessage = async (text: string, idx: number) => {
        await navigator.clipboard.writeText(text);
        setMessages(prev => prev.map((m, i) => i === idx ? { ...m, copying: true } : m));
        setTimeout(() => setMessages(prev => prev.map((m, i) => i === idx ? { ...m, copying: false } : m)), 1500);
    };

    // Send with streaming
    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: Message = { role: "user", text: text.trim(), ts: Date.now() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        const botMsg: Message = { role: "model", text: "", ts: Date.now() };
        setMessages(prev => [...prev, botMsg]);

        const token = getToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        abortRef.current = new AbortController();

        const updateLast = (text: string) =>
            setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], text };
                return copy;
            });

        try {
            const res = await fetch(`${API_BASE}/api/chat/stream`, {
                method: "POST",
                headers,
                body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, text: m.text })) }),
                signal: abortRef.current.signal,
            });

            if (!res.ok || !res.body) throw new Error("stream failed");

            setStreaming(true);
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const raw = line.slice(6).trim();
                    if (raw === "[DONE]") break;
                    try {
                        const chunk = JSON.parse(raw);
                        if (chunk.text) {
                            fullText += chunk.text;
                            updateLast(fullText);
                        }
                    } catch { }
                }
            }

            // Nếu stream không có data → fallback
            if (!fullText) throw new Error("empty stream");

            if (!open) setUnread(u => u + 1);
        } catch (err: unknown) {
            if ((err as Error).name === "AbortError") return;

            // Fallback: gọi endpoint thường
            try {
                setStreaming(false);
                const res2 = await fetch(`${API_BASE}/api/chat`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, text: m.text })) }),
                });
                const json = await res2.json();
                updateLast(json.reply || "😞 Xin lỗi, có lỗi xảy ra.");
                if (!open) setUnread(u => u + 1);
            } catch {
                updateLast("😞 Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
            setStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    };

    const clearChat = () => {
        abortRef.current?.abort();
        setMessages([{ ...INIT_MSG, ts: Date.now() }]);
        setLoading(false);
        setStreaming(false);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=DM+Sans:wght@400;500&display=swap');

                .cb-fab {
                    position: fixed; bottom: 1.75rem; right: 1.75rem; z-index: 8000;
                    width: 58px; height: 58px; border-radius: 50%;
                    background: linear-gradient(135deg, #003580, #0052cc);
                    border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,82,204,.4);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; color: #fff;
                }
                .cb-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,82,204,.5); }
                .cb-badge {
                    position: absolute; top: -4px; right: -4px;
                    background: #e74c3c; color: #fff; border-radius: 99px;
                    font-size: 0.7rem; font-weight: 700; min-width: 20px; height: 20px;
                    display: flex; align-items: center; justify-content: center;
                    padding: 0 4px; border: 2px solid #fff; animation: cb-pulse 1.5s infinite;
                }
                @keyframes cb-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }

                .cb-window {
                    position: fixed; bottom: 5.5rem; right: 1.75rem; z-index: 8000;
                    width: 370px; height: 580px; max-height: 85vh;
                    background: #fff; border-radius: 22px;
                    box-shadow: 0 16px 60px rgba(0,0,0,.2);
                    display: flex; flex-direction: column; overflow: hidden;
                    animation: cb-slideUp .25s cubic-bezier(.34,1.56,.64,1);
                    font-family: 'DM Sans', sans-serif;
                }
                @keyframes cb-slideUp { from{opacity:0;transform:translateY(20px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }

                .cb-header {
                    background: linear-gradient(135deg, #003580, #0052cc);
                    padding: 0.9rem 1rem; display: flex; align-items: center; gap: 0.7rem;
                    flex-shrink: 0;
                }
                .cb-avatar {
                    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
                    background: rgba(255,255,255,.15); border: 2px solid rgba(255,255,255,.3);
                    display: flex; align-items: center; justify-content: center; font-size: 1.15rem;
                }
                .cb-header-info { flex: 1; min-width: 0; }
                .cb-header-name { font-family:'Nunito',sans-serif; font-weight:800; font-size:.92rem; color:#fff; }
                .cb-header-status { font-size:.68rem; color:rgba(255,255,255,.75); display:flex; align-items:center; gap:4px; }
                .cb-dot { width:6px; height:6px; background:#2ecc71; border-radius:50%; flex-shrink:0; }
                .cb-header-actions { display:flex; gap:4px; }
                .cb-icon-btn {
                    background: rgba(255,255,255,.15); border: none; color: #fff;
                    width: 28px; height: 28px; border-radius: 8px; cursor: pointer; font-size: .85rem;
                    display: flex; align-items: center; justify-content: center; transition: background .15s;
                }
                .cb-icon-btn:hover { background: rgba(255,255,255,.28); }

                .cb-messages {
                    flex: 1; overflow-y: auto; padding: .85rem 1rem;
                    display: flex; flex-direction: column; gap: .65rem;
                    background: #f8faff;
                    scrollbar-width: thin; scrollbar-color: #c8d8ff transparent;
                }
                .cb-messages::-webkit-scrollbar { width: 4px; }
                .cb-messages::-webkit-scrollbar-thumb { background: #c8d8ff; border-radius: 99px; }

                .cb-msg { display: flex; gap: .45rem; align-items: flex-end; position: relative; }
                .cb-msg.user { flex-direction: row-reverse; }
                .cb-msg-avatar {
                    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
                    background: linear-gradient(135deg,#003580,#0052cc);
                    display: flex; align-items: center; justify-content: center; font-size: .75rem;
                }
                .cb-bubble {
                    max-width: 80%; padding: .6rem .85rem; line-height: 1.55;
                    font-size: .85rem; word-break: break-word; position: relative;
                }
                .cb-msg.model .cb-bubble {
                    background: #fff; color: #1a3c6b;
                    border-radius: 4px 16px 16px 16px;
                    box-shadow: 0 1px 6px rgba(0,82,204,.08);
                }
                .cb-msg.user .cb-bubble {
                    background: linear-gradient(135deg,#0052cc,#0065ff); color:#fff;
                    border-radius: 16px 16px 4px 16px;
                }
                .cb-ts { font-size:.62rem; color:#aab4c8; margin-top:.2rem; text-align:right; }
                .cb-msg.user .cb-ts { text-align: left; }

                .cb-copy-btn {
                    position: absolute; top: -8px; right: -8px;
                    background: #fff; border: 1px solid #e8f0fe; border-radius: 6px;
                    width: 24px; height: 24px; display: none; align-items: center; justify-content: center;
                    cursor: pointer; font-size: .7rem; box-shadow: 0 1px 4px rgba(0,0,0,.1);
                    transition: background .15s;
                }
                .cb-msg:hover .cb-copy-btn { display: flex; }
                .cb-copy-btn:hover { background: #f0f4ff; }

                .cb-cursor {
                    display: inline-block; width: 2px; height: 14px;
                    background: #0052cc; margin-left: 2px; vertical-align: middle;
                    animation: cb-blink .7s steps(1) infinite;
                }
                @keyframes cb-blink { 0%,100%{opacity:1} 50%{opacity:0} }

                .cb-typing { display: flex; gap: 4px; align-items: center; padding: .6rem .85rem; }
                .cb-typing span {
                    width: 7px; height: 7px; background: #0052cc; border-radius: 50%;
                    animation: cb-bounce .9s infinite;
                }
                .cb-typing span:nth-child(2) { animation-delay:.15s; }
                .cb-typing span:nth-child(3) { animation-delay:.3s; }
                @keyframes cb-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }

                .cb-suggestions {
                    display: flex; flex-wrap: wrap; gap: .35rem;
                    padding: .5rem 1rem .25rem; background: #f8faff; flex-shrink: 0;
                }
                .cb-chip {
                    padding: .3rem .7rem; border-radius: 99px;
                    border: 1.5px solid #c8d8ff; background: #fff;
                    font-size: .76rem; color: #0052cc; font-weight: 500; cursor: pointer;
                    transition: all .15s; font-family: 'DM Sans', sans-serif;
                }
                .cb-chip:hover { background: #eef4ff; border-color: #93c5fd; }

                .cb-input-row {
                    display: flex; gap: .45rem; align-items: center;
                    padding: .65rem .85rem; border-top: 1px solid #e8f0fe; background: #fff; flex-shrink: 0;
                }
                .cb-input {
                    flex: 1; padding: .55rem .85rem; border-radius: 99px;
                    border: 1.5px solid #c8d8ff; font-size: .875rem;
                    font-family: 'DM Sans', sans-serif; outline: none; color: #1a3c6b;
                    background: #f8faff; transition: border-color .15s;
                }
                .cb-input:focus { border-color: #0052cc; background: #fff; }
                .cb-send-btn, .cb-voice-btn {
                    width: 36px; height: 36px; border-radius: 50%; border: none;
                    display: flex; align-items: center; justify-content: center;
                    font-size: .95rem; flex-shrink: 0; cursor: pointer;
                    transition: opacity .15s, transform .15s;
                }
                .cb-send-btn {
                    background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff;
                }
                .cb-send-btn:hover:not(:disabled) { opacity:.9; transform:scale(1.06); }
                .cb-send-btn:disabled { opacity:.35; cursor:not-allowed; }

                .cb-scroll-btn {
                    position: absolute; bottom: 130px; left: 50%; transform: translateX(-50%);
                    background: #0052cc; color: #fff; border: none; border-radius: 99px;
                    padding: .3rem .85rem; font-size: .75rem; cursor: pointer;
                    box-shadow: 0 2px 12px rgba(0,82,204,.35); z-index: 10;
                    animation: cb-slideUp .2s ease;
                }

                @media (max-width: 420px) {
                    .cb-window { width: calc(100vw - 1.5rem); right: .75rem; height: 75vh; }
                    .cb-fab { right: 1rem; bottom: 1rem; }
                }
            `}</style>

            {open && (
                <div className="cb-window">
                    {/* Header */}
                    <div className="cb-header">
                        <div className="cb-avatar">🤖</div>
                        <div className="cb-header-info">
                            <div className="cb-header-name">VIVU Assistant</div>
                            <div className="cb-header-status">
                                <div className="cb-dot" />
                                {streaming ? "Đang trả lời..." : "Trực tuyến · AI du lịch"}
                            </div>
                        </div>
                        <div className="cb-header-actions">
                            <button className="cb-icon-btn" onClick={clearChat} title="Xóa hội thoại">🗑️</button>
                            <button className="cb-icon-btn" onClick={() => setOpen(false)} title="Đóng">✕</button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="cb-messages" ref={messagesRef} onScroll={handleScroll}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`cb-msg ${msg.role}`}>
                                {msg.role === "model" && <div className="cb-msg-avatar">🤖</div>}
                                <div>
                                    <div className="cb-bubble">
                                        {renderMarkdown(msg.text)}
                                        {streaming && i === messages.length - 1 && msg.role === "model" && (
                                            <span className="cb-cursor" />
                                        )}
                                        {msg.role === "model" && (
                                            <button
                                                className="cb-copy-btn"
                                                onClick={() => copyMessage(msg.text, i)}
                                                title="Sao chép"
                                            >
                                                {msg.copying ? "✓" : "📋"}
                                            </button>
                                        )}
                                    </div>
                                    <div className="cb-ts">{fmtTime(msg.ts)}</div>
                                </div>
                            </div>
                        ))}

                        {loading && !streaming && (
                            <div className="cb-msg model">
                                <div className="cb-msg-avatar">🤖</div>
                                <div className="cb-bubble" style={{ padding: ".4rem .85rem" }}>
                                    <div className="cb-typing"><span /><span /><span /></div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Scroll to bottom btn */}
                    {showScrollBtn && (
                        <button className="cb-scroll-btn" onClick={scrollToBottom}>↓ Tin mới</button>
                    )}

                    {/* Quick suggestions */}
                    {messages.length <= 2 && !loading && (
                        <div className="cb-suggestions">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} className="cb-chip" onClick={() => sendMessage(s)}>{s}</button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="cb-input-row">
                        <input
                            ref={inputRef}
                            className="cb-input"
                            placeholder="Nhập câu hỏi..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button
                            className="cb-send-btn"
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            title="Gửi"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* FAB */}
            <button className="cb-fab" onClick={() => setOpen(o => !o)} title="VIVU Assistant">
                {open ? "✕" : "💬"}
                {unread > 0 && !open && <div className="cb-badge">{unread}</div>}
            </button>
        </>
    );
}
