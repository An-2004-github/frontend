"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/axios";

interface Message {
    role: "user" | "model";
    text: string;
}

const SUGGESTIONS = [
    "Chính sách hủy phòng như thế nào?",
    "Làm sao để đổi lịch đặt chỗ?",
    "Nạp tiền vào ví bằng cách nào?",
    "Gợi ý điểm du lịch dịp hè?",
];

export default function ChatBot() {
    const [open, setOpen]         = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "model", text: "Xin chào! 👋 Tôi là **VIVU Assistant** — trợ lý du lịch của bạn.\n\nTôi có thể giúp bạn tìm khách sạn, đặt vé, giải đáp thắc mắc về đặt chỗ và nhiều hơn nữa. Bạn cần hỗ trợ gì?" }
    ]);
    const [input,    setInput]    = useState("");
    const [loading,  setLoading]  = useState(false);
    const [unread,   setUnread]   = useState(0);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setUnread(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;
        const userMsg: Message = { role: "user", text: text.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await api.post("/api/chat", {
                messages: newMessages.map(m => ({ role: m.role, text: m.text })),
            });
            const botMsg: Message = { role: "model", text: res.data.reply };
            setMessages(prev => [...prev, botMsg]);
            if (!open) setUnread(u => u + 1);
        } catch {
            setMessages(prev => [...prev, { role: "model", text: "😞 Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    };

    // Render markdown-like bold + line breaks
    const renderText = (text: string) => {
        const lines = text.split("\n");
        return lines.map((line, i) => {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            return (
                <span key={i}>
                    {parts.map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )}
                    {i < lines.length - 1 && <br />}
                </span>
            );
        });
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
                    font-size: 1.5rem; transition: transform 0.2s, box-shadow 0.2s;
                    color: #fff;
                }
                .cb-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,82,204,.5); }

                .cb-badge {
                    position: absolute; top: -4px; right: -4px;
                    background: #e74c3c; color: #fff; border-radius: 99px;
                    font-size: 0.7rem; font-weight: 700; min-width: 20px; height: 20px;
                    display: flex; align-items: center; justify-content: center;
                    padding: 0 4px; border: 2px solid #fff;
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }

                .cb-window {
                    position: fixed; bottom: 5.5rem; right: 1.75rem; z-index: 8000;
                    width: 360px; max-height: 560px;
                    background: #fff; border-radius: 20px;
                    box-shadow: 0 12px 48px rgba(0,0,0,.18);
                    display: flex; flex-direction: column; overflow: hidden;
                    animation: slideUp .25s ease;
                    font-family: 'DM Sans', sans-serif;
                }
                @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

                /* Header */
                .cb-header {
                    background: linear-gradient(135deg, #003580, #0052cc);
                    padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.75rem;
                }
                .cb-avatar {
                    width: 40px; height: 40px; border-radius: 50%;
                    background: rgba(255,255,255,.15); border: 2px solid rgba(255,255,255,.3);
                    display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
                }
                .cb-header-info { flex: 1; }
                .cb-header-name { font-family: 'Nunito',sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; }
                .cb-header-status { font-size: 0.72rem; color: rgba(255,255,255,.75); display: flex; align-items: center; gap: 4px; }
                .cb-dot { width: 6px; height: 6px; background: #2ecc71; border-radius: 50%; }
                .cb-close {
                    background: rgba(255,255,255,.15); border: none; color: #fff;
                    width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1rem;
                    display: flex; align-items: center; justify-content: center;
                    transition: background .15s;
                }
                .cb-close:hover { background: rgba(255,255,255,.25); }

                /* Messages */
                .cb-messages {
                    flex: 1; overflow-y: auto; padding: 1rem;
                    display: flex; flex-direction: column; gap: 0.75rem;
                    background: #f8faff;
                    scrollbar-width: thin; scrollbar-color: #c8d8ff transparent;
                }
                .cb-messages::-webkit-scrollbar { width: 4px; }
                .cb-messages::-webkit-scrollbar-thumb { background: #c8d8ff; border-radius: 99px; }

                .cb-msg { display: flex; gap: 0.5rem; align-items: flex-end; }
                .cb-msg.user { flex-direction: row-reverse; }

                .cb-msg-avatar {
                    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
                    background: linear-gradient(135deg,#003580,#0052cc);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.8rem;
                }

                .cb-bubble {
                    max-width: 78%; padding: 0.65rem 0.9rem;
                    border-radius: 16px; font-size: 0.875rem; line-height: 1.55;
                    word-break: break-word;
                }
                .cb-msg.model .cb-bubble {
                    background: #fff; color: #1a3c6b;
                    border-radius: 4px 16px 16px 16px;
                    box-shadow: 0 1px 6px rgba(0,82,204,.08);
                }
                .cb-msg.user .cb-bubble {
                    background: linear-gradient(135deg,#0052cc,#0065ff); color: #fff;
                    border-radius: 16px 16px 4px 16px;
                }

                /* Typing indicator */
                .cb-typing { display: flex; gap: 4px; align-items: center; padding: 0.75rem 1rem; }
                .cb-typing span {
                    width: 7px; height: 7px; background: #0052cc; border-radius: 50%;
                    animation: bounce .9s infinite;
                }
                .cb-typing span:nth-child(2) { animation-delay: .15s; }
                .cb-typing span:nth-child(3) { animation-delay: .3s; }
                @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }

                /* Suggestions */
                .cb-suggestions {
                    display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.5rem 1rem 0;
                }
                .cb-chip {
                    padding: 0.35rem 0.75rem; border-radius: 99px;
                    border: 1.5px solid #c8d8ff; background: #fff;
                    font-size: 0.78rem; color: #0052cc; font-weight: 500; cursor: pointer;
                    transition: background .15s;
                    font-family: 'DM Sans', sans-serif;
                }
                .cb-chip:hover { background: #eef4ff; }

                /* Input */
                .cb-input-row {
                    display: flex; gap: 0.5rem; align-items: center;
                    padding: 0.75rem 1rem; border-top: 1px solid #e8f0fe;
                    background: #fff;
                }
                .cb-input {
                    flex: 1; padding: 0.6rem 0.9rem; border-radius: 99px;
                    border: 1.5px solid #c8d8ff; font-size: 0.875rem;
                    font-family: 'DM Sans', sans-serif; outline: none; color: #1a3c6b;
                    background: #f8faff;
                    transition: border-color .15s;
                }
                .cb-input:focus { border-color: #0052cc; background: #fff; }
                .cb-send {
                    width: 38px; height: 38px; border-radius: 50%; border: none;
                    background: linear-gradient(135deg,#0052cc,#0065ff);
                    color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    font-size: 1rem; flex-shrink: 0; transition: opacity .15s, transform .15s;
                }
                .cb-send:hover:not(:disabled) { opacity: .9; transform: scale(1.05); }
                .cb-send:disabled { opacity: .4; cursor: not-allowed; }

                @media (max-width: 420px) {
                    .cb-window { width: calc(100vw - 2rem); right: 1rem; }
                    .cb-fab { right: 1rem; bottom: 1rem; }
                }
            `}</style>

            {/* Chat window */}
            {open && (
                <div className="cb-window">
                    {/* Header */}
                    <div className="cb-header">
                        <div className="cb-avatar">🤖</div>
                        <div className="cb-header-info">
                            <div className="cb-header-name">VIVU Assistant</div>
                            <div className="cb-header-status">
                                <div className="cb-dot" />
                                Trực tuyến · AI hỗ trợ du lịch
                            </div>
                        </div>
                        <button className="cb-close" onClick={() => setOpen(false)}>✕</button>
                    </div>

                    {/* Messages */}
                    <div className="cb-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`cb-msg ${msg.role}`}>
                                {msg.role === "model" && (
                                    <div className="cb-msg-avatar">🤖</div>
                                )}
                                <div className="cb-bubble">
                                    {renderText(msg.text)}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="cb-msg model">
                                <div className="cb-msg-avatar">🤖</div>
                                <div className="cb-bubble" style={{ padding: "0.5rem 0.9rem" }}>
                                    <div className="cb-typing">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Suggestions (chỉ hiện khi chỉ có 1 tin nhắn chào) */}
                    {messages.length === 1 && !loading && (
                        <div className="cb-suggestions">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} className="cb-chip" onClick={() => sendMessage(s)}>
                                    {s}
                                </button>
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
                            className="cb-send"
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            title="Gửi"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* FAB button */}
            <button className="cb-fab" onClick={() => setOpen(o => !o)} title="Chat với VIVU Assistant">
                {open ? "✕" : "💬"}
                {unread > 0 && !open && (
                    <div className="cb-badge">{unread}</div>
                )}
            </button>
        </>
    );
}
