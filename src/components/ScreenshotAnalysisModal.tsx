import React, { useState, useRef } from "react";
import { TradeAnalysis } from "../types";
import {
  Upload,
  Camera,
  X,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface ScreenshotAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (analysis: TradeAnalysis) => void;
}

export const ScreenshotAnalysisModal: React.FC<ScreenshotAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [instrumentHint, setInstrumentHint] = useState("XAU/USD");
  const [userNotes, setUserNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WebP).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Pre-loaded sample chart screenshots generated for testing
  const loadSampleChart = (type: "gold" | "btc") => {
    // Generate clean synthetic SVG data URLs representing real TradingView charts
    if (type === "gold") {
      setInstrumentHint("XAU/USD");
      setUserNotes("TradingView 15M chart showing London sweep of Previous Day High followed by 5M CHOCH.");
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350" viewBox="0 0 600 350" style="background:#131722;font-family:sans-serif">
        <text x="20" y="30" fill="#d1d4dc" font-size="14" font-weight="bold">XAUUSD, 15M (OANDA)</text>
        <text x="20" y="50" fill="#787b86" font-size="11">PDH: 2688.50 | Current: 2683.20</text>
        <line x1="20" y1="80" x2="580" y2="80" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 4"/>
        <text x="440" y="75" fill="#f59e0b" font-size="10">PREVIOUS DAY HIGH (SWEPT)</text>
        <!-- candles -->
        <rect x="100" y="140" width="12" height="60" fill="#089981"/>
        <rect x="130" y="120" width="12" height="70" fill="#089981"/>
        <rect x="160" y="90" width="12" height="80" fill="#089981"/>
        <line x1="196" y1="65" x2="196" y2="130" stroke="#f23645" stroke-width="1.5"/>
        <rect x="190" y="85" width="12" height="40" fill="#f23645"/>
        <text x="170" y="60" fill="#f59e0b" font-size="9" font-weight="bold">SWEEP WICK (2688.60)</text>
        <rect x="220" y="125" width="12" height="50" fill="#f23645"/>
        <rect x="250" y="160" width="12" height="40" fill="#f23645"/>
        <line x1="220" y1="180" x2="320" y2="180" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="2 2"/>
        <text x="260" y="175" fill="#a855f7" font-size="9">15M CHOCH</text>
        <rect x="290" y="145" width="12" height="25" fill="#089981"/>
        <rect x="320" y="140" width="12" height="35" fill="#f23645"/>
      </svg>`;
      setSelectedImage(`data:image/svg+xml;base64,${btoa(svg)}`);
    } else {
      setInstrumentHint("BTC/USD");
      setUserNotes("Binance BTC/USDT 1H chart showing Asian sell-side liquidity sweep at 62,800 and bullish order block.");
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350" viewBox="0 0 600 350" style="background:#131722;font-family:sans-serif">
        <text x="20" y="30" fill="#d1d4dc" font-size="14" font-weight="bold">BTCUSDT, 1H (BINANCE)</text>
        <text x="20" y="50" fill="#787b86" font-size="11">Sell-side Sweep: 62,800 | Current: 64,150</text>
        <line x1="20" y1="260" x2="580" y2="260" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 4"/>
        <text x="380" y="255" fill="#ef4444" font-size="10">EQUAL LOWS / SSL (SWEPT)</text>
        <line x1="156" y1="230" x2="156" y2="280" stroke="#089981" stroke-width="1.5"/>
        <rect x="150" y="220" width="12" height="30" fill="#089981"/>
        <text x="120" y="295" fill="#089981" font-size="9" font-weight="bold">ABSORPTION SWEEP</text>
        <rect x="180" y="180" width="14" height="60" fill="#089981"/>
        <rect x="210" y="140" width="14" height="60" fill="#089981"/>
        <rect x="240" y="110" width="14" height="50" fill="#089981"/>
      </svg>`;
      setSelectedImage(`data:image/svg+xml;base64,${btoa(svg)}`);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedImage) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: selectedImage.startsWith("data:image/svg") ? "image/svg+xml" : "image/png",
          instrument: instrumentHint,
          userNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const analysis: TradeAnalysis = await res.json();
      onAnalysisComplete(analysis);
      onClose();
    } catch (err: any) {
      console.error("Screenshot analysis failed:", err);
      setError(
        err.message || "Failed to analyze screenshot. Check GEMINI_API_KEY in Secrets."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f141c] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center flex-shrink-0">
              <Camera className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                Screenshot Analysis (Section 19)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono break-words leading-snug">
                Multimodal TradingView / Heatmap / Footprint audit
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-mono text-xs flex-1">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
              dragActive
                ? "border-sky-500 bg-sky-500/10"
                : selectedImage
                ? "border-slate-700 bg-slate-950/60"
                : "border-slate-800 hover:border-slate-700 bg-slate-900/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            {selectedImage ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="max-h-48 max-w-full overflow-hidden rounded-lg border border-slate-700 shadow-md">
                  <img
                    src={selectedImage}
                    alt="Chart preview"
                    className="max-h-48 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[11px] text-sky-400 font-semibold hover:underline">
                  Click or drag to change chart image
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-1">
                  <Upload size={20} />
                </div>
                <p className="text-slate-200 font-semibold text-xs">
                  Drag & drop TradingView chart or click to browse
                </p>
                <p className="text-slate-500 text-[11px]">
                  Supports TradingView screenshots, Liquidity heatmaps, or Bookmap
                </p>
              </div>
            )}
          </div>

          {/* Quick 1-click test scenarios */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-400 text-[11px]">Don't have a chart ready? Test with:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadSampleChart("gold")}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] transition-colors"
              >
                XAU/USD 15M Sweep Chart
              </button>
              <button
                type="button"
                onClick={() => loadSampleChart("btc")}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-[11px] transition-colors"
              >
                BTC/USD 1H Order Block Chart
              </button>
            </div>
          </div>

          {/* Inputs for instrument & notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-[11px] block mb-1">
                Instrument (Suggested or Auto-detect):
              </label>
              <select
                value={instrumentHint}
                onChange={(e) => setInstrumentHint(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
              >
                <option value="XAU/USD">XAU/USD (Gold)</option>
                <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                <option value="ETH/USD">ETH/USD (Ethereum)</option>
                <option value="EUR/USD">EUR/USD</option>
                <option value="GBP/USD">GBP/USD</option>
                <option value="USD/JPY">USD/JPY</option>
                <option value="US30">US30 (Dow Jones 30)</option>
                <option value="Auto-detect">Auto-detect from image</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-[11px] block mb-1">
                Trader Observations / Timeframe context:
              </label>
              <input
                type="text"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="e.g. 15M chart, London open sweep of PDH..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>
          </div>

          {/* Guidelines info */}
          <div className="p-3 bg-sky-950/20 border border-sky-900/40 rounded-lg text-[11px] text-sky-200/80 leading-relaxed">
            <strong>Section 19 Mode Rules:</strong> Gemini Vision extracts visible swing highs/lows, liquidity pools, displacement wicks, and structure shifts without inventing unreadable numbers. If data is unreadable, it flags it explicitly.
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleRunAnalysis}
            disabled={!selectedImage || analyzing}
            className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-sky-950"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Auditing Chart with Vision AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run Screenshot Institutional Audit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
