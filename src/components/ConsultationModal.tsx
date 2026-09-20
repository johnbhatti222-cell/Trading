import React, { useState } from "react";
import { TradeAnalysis } from "../types";
import { X, Send, Bot, User, Sparkles, Loader2, ShieldCheck } from "lucide-react";

interface ConsultationModalProps {
  analysis: TradeAnalysis;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "analyst";
  content: string;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  analysis,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "analyst",
      content: `I am the Master Trading Analyst for this **${analysis.market.instrument}** setup. 

Current Decision: **${analysis.decision}** (Score: ${analysis.score.totalScore}/100)
Regime: **${analysis.market.marketRegime}**

Ask me anything about this thesis:
- "Why isn't this an immediate entry?"
- "What if DXY or US Yields spike?"
- "Where exactly does my risk get invalidated?"
- "Should I wait for London session close?"`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userText,
          currentAnalysis: analysis,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "analyst",
          content: data.answer || "No response received from analyst.",
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "analyst",
          content: `⚠️ Analyst Consultation Error: ${err.message}. Ensure GEMINI_API_KEY is configured in the Secrets panel.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "What invalidates this thesis immediately?",
    "Is this setup vulnerable to upcoming news?",
    "Why shouldn't I enter right now?",
    "What would make this a 100/100 score?",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f141c] border border-slate-700 rounded-2xl w-full max-w-2xl h-[620px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-mono font-bold text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                Challenge Master Analyst
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {analysis.market.instrument}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono break-words leading-snug">
                Objective risk interrogation & discipline check
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "analyst" && (
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={13} className="text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl p-3.5 leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-900 border border-slate-800 text-slate-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
              {m.role === "user" && (
                <div className="w-6 h-6 rounded bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={13} className="text-indigo-300" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 text-slate-400 text-xs font-mono py-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Analyst evaluating liquidity conditions & risk profile...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-800/80 flex gap-2 overflow-x-auto text-[11px] font-mono no-scrollbar">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(q);
              }}
              className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 whitespace-nowrap border border-slate-700 transition-colors flex-shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900/90 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask why this setup is rated this way, or challenge invalidation..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            <Send size={13} />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
};
