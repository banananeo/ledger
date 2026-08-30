import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { aiChat, aiChatStream, aiHealth } from '../../../api.ts';
import './AIAssistantDrawer.css';

const QUICK_CHIPS = [
  { label: 'Summarize', prompt: 'Summarize my overall academics — attendance risk, marks performance, and what to focus on this week.' },
  { label: 'Attendance Risk', prompt: 'Analyze my attendance risks. Which courses can I safely bunk and which need immediate attendance?' },
  { label: 'Safest Bunk', prompt: 'Given my timetable, which Day Order is safest to bunk for maximum free hours with minimal risk?' },
  { label: 'Study Plan', prompt: 'Create a 7-day study plan prioritizing my weakest subjects based on marks and attendance, using my timetable and calendar.' },
  { label: 'Marks Review', prompt: 'Review my internal marks. Which subjects need improvement and how can I recover?' },
];

function buildContext(data) {
  if (!data) return {};
  const { profile, attendance, marks, schedule, calendar } = data;
  return { profile, attendance, marks, schedule, calendar };
}

export default function AIAssistantDrawer({ data, isOpen, onClose }) {
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem('ledger_ai_thread');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [health, setHealth] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    aiHealth().then(setHealth).catch(() => setHealth({ configured: false }));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('ledger_ai_thread', JSON.stringify(messages.slice(-20)));
  }, [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streamingText, loading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role: 'user', text: msg, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setStreamingText('');
    let full = '';
    try {
      // Prefer streaming, fallback to non-stream
      try {
        full = await aiChatStream({ message: msg, context: buildContext(data) }, (chunk) => {
          full += chunk;
          setStreamingText(full);
        });
        setStreamingText('');
        setMessages((m) => [...m, { role: 'assistant', text: full, ts: Date.now() }]);
      } catch (e) {
        // fallback
        const reply = await aiChat({ message: msg, context: buildContext(data) });
        setMessages((m) => [...m, { role: 'assistant', text: reply, ts: Date.now() }]);
      }
    } catch (err) {
      const detail = err?.message || 'AI request failed';
      setMessages((m) => [...m, { role: 'assistant', text: `⚠️ ${detail}`, isError: true, ts: Date.now() }]);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const clearThread = () => {
    setMessages([]);
    localStorage.removeItem('ledger_ai_thread');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="ai-drawer__backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="ai-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div className="ai-drawer__header">
              <div>
                <p className="eyebrow">Ledger AI · Gemini</p>
                <h3 className="ai-drawer__title">Study Assistant</h3>
                <p className="ai-drawer__sub">{health?.configured ? `Model: ${health.model} · Context-aware` : 'AI not configured — set GEMINI_API_KEY'}</p>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="bbtn bbtn--outline bbtn--xs" onClick={clearThread} title="Clear chat">Clear</button>
                <button className="bbtn bbtn--outline bbtn--icon" onClick={onClose} aria-label="Close">✕</button>
              </div>
            </div>

            {!health?.configured && (
              <div className="ai-drawer__banner bchip bchip--warning" style={{margin:'12px 16px',padding:'8px 12px',fontSize:12}}>
                Set <code>GEMINI_API_KEY</code> in server <code>.env</code> / Vercel env to enable AI. Demo will show error until configured.
              </div>
            )}

            <div className="ai-drawer__chips">
              {QUICK_CHIPS.map((c) => (
                <button key={c.label} className="bbtn bbtn--outline bbtn--xs ai-drawer__chip" onClick={() => send(c.prompt)} disabled={loading}>
                  {c.label}
                </button>
              ))}
            </div>

            <div className="ai-drawer__list" ref={listRef}>
              {messages.length === 0 && (
                <div className="ai-drawer__empty bcard">
                  <p className="eyebrow">Try asking</p>
                  <ul>
                    <li>“Which attendance is risky?”</li>
                    <li>“Make a study plan for my weakest subjects”</li>
                    <li>“Which Day Order can I bunk safely?”</li>
                  </ul>
                  <p className="ai-drawer__empty-note">AI uses sanitized profile/attendance/marks/timetable only — no passwords or cookies sent.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`ai-drawer__msg ai-drawer__msg--${m.role}${m.isError ? ' ai-drawer__msg--error' : ''}`}>
                  <div className="ai-drawer__msg-bubble">{m.text}</div>
                </div>
              ))}
              {loading && (
                <div className="ai-drawer__msg ai-drawer__msg--assistant">
                  <div className="ai-drawer__msg-bubble ai-drawer__msg-bubble--streaming">
                    {streamingText || <span className="ai-drawer__typing"><span></span><span></span><span></span></span>}
                  </div>
                </div>
              )}
            </div>

            <div className="ai-drawer__composer">
              <textarea
                ref={inputRef}
                className="ai-drawer__input"
                placeholder="Ask about attendance, marks, timetable…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={2}
              />
              <button className="bbtn bbtn--good ai-drawer__send" onClick={() => send()} disabled={loading || !input.trim()}>
                {loading ? '…' : 'Send'}
              </button>
            </div>
            <p className="ai-drawer__hint">Enter to send · Shift+Enter for newline · Context from your Academia sync is included securely server-side.</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
