import React, { useState, useEffect } from "react";
import { Clock, Zap, Target, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

interface KillzoneSession {
  id: string;
  name: string;
  timeEst: string;
  timeUtc: string;
  startHourUtc: number;
  startMinUtc: number;
  endHourUtc: number;
  endMinUtc: number;
  description: string;
  type: "KILLZONE" | "SILVER_BULLET" | "OFF_SESSION";
}

const INSTITUTIONAL_SESSIONS: KillzoneSession[] = [
  {
    id: "london-open",
    name: "London Open Killzone",
    timeEst: "02:00 – 05:00 EST",
    timeUtc: "07:00 – 10:00 UTC",
    startHourUtc: 7,
    startMinUtc: 0,
    endHourUtc: 10,
    endMinUtc: 0,
    description: "Judas Swing & High/Low of the Day Formation (XAU, EUR, GBP)",
    type: "KILLZONE",
  },
  {
    id: "ny-am-open",
    name: "New York AM Killzone",
    timeEst: "08:00 – 11:00 EST",
    timeUtc: "13:00 – 16:00 UTC",
    startHourUtc: 13,
    startMinUtc: 0,
    endHourUtc: 16,
    endMinUtc: 0,
    description: "Institutional Equities Open & Primary Displacement (Highest Volume)",
    type: "KILLZONE",
  },
  {
    id: "silver-bullet-1",
    name: "ICT Silver Bullet AM",
    timeEst: "10:00 – 11:00 EST",
    timeUtc: "15:00 – 16:00 UTC",
    startHourUtc: 15,
    startMinUtc: 0,
    endHourUtc: 16,
    endMinUtc: 0,
    description: "Guaranteed 1M/5M FVG Expansion Algorithm",
    type: "SILVER_BULLET",
  },
  {
    id: "london-close",
    name: "London Close Mitigation",
    timeEst: "10:30 – 12:00 EST",
    timeUtc: "15:30 – 17:00 UTC",
    startHourUtc: 15,
    startMinUtc: 30,
    endHourUtc: 17,
    endMinUtc: 0,
    description: "Profit taking & Counter-trend Retracements into FVG/CE",
    type: "KILLZONE",
  },
];

export const KillzoneClocksHUD: React.FC = () => {
  const [currentUtcTime, setCurrentUtcTime] = useState<Date>(new Date());
  const [activeSession, setActiveSession] = useState<KillzoneSession | null>(null);
  const [countdownStr, setCountdownStr] = useState<string>("");
  const [nextSessionName, setNextSessionName] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentUtcTime(now);

      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const utcSeconds = now.getUTCSeconds();
      const currentDec = utcHours + utcMinutes / 60 + utcSeconds / 3600;

      // Find if we are currently inside any session
      let active: KillzoneSession | null = null;
      for (const s of INSTITUTIONAL_SESSIONS) {
        const startDec = s.startHourUtc + s.startMinUtc / 60;
        const endDec = s.endHourUtc + s.endMinUtc / 60;
        if (currentDec >= startDec && currentDec < endDec) {
          active = s;
          break;
        }
      }

      setActiveSession(active);

      if (active) {
        // Calculate remaining time in current session
        const endDec = active.endHourUtc + active.endMinUtc / 60;
        const remainingSeconds = Math.max(0, Math.floor((endDec - currentDec) * 3600));
        const remH = Math.floor(remainingSeconds / 3600);
        const remM = Math.floor((remainingSeconds % 3600) / 60);
        const remS = remainingSeconds % 60;
        setCountdownStr(
          `${String(remH).padStart(2, "0")}:${String(remM).padStart(2, "0")}:${String(remS).padStart(2, "0")}`
        );
      } else {
        // Find next upcoming session
        let nextSession: KillzoneSession = INSTITUTIONAL_SESSIONS[0];
        let minDiff = 999;

        for (const s of INSTITUTIONAL_SESSIONS) {
          const startDec = s.startHourUtc + s.startMinUtc / 60;
          let diff = startDec - currentDec;
          if (diff < 0) diff += 24; // wraps around tomorrow
          if (diff < minDiff) {
            minDiff = diff;
            nextSession = s;
          }
        }

        const remainingSeconds = Math.floor(minDiff * 3600);
        const remH = Math.floor(remainingSeconds / 3600);
        const remM = Math.floor((remainingSeconds % 3600) / 60);
        const remS = remainingSeconds % 60;
        setNextSessionName(nextSession.name);
        setCountdownStr(
          `${String(remH).padStart(2, "0")}:${String(remM).padStart(2, "0")}:${String(remS).padStart(2, "0")}`
        );
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#080c14] border-b border-slate-800/80 px-3 sm:px-4 py-2 font-mono text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Active Killzone Banner with Pulse */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {activeSession ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              )}
            </span>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
              {activeSession ? "ACTIVE KILLZONE:" : "OFF-PEAK:"}
            </span>
          </div>

          {activeSession ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-300 font-bold text-[11px] sm:text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/50 flex items-center gap-1.5">
                <Zap size={12} className="fill-current text-emerald-400" />
                <span>{activeSession.name}</span>
              </span>
              <span className="text-slate-400 text-[10px] sm:text-[11px]">
                Closes in: <strong className="text-white font-mono">{countdownStr}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px]">
              <span className="text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/40 font-semibold">
                Asian Accumulation
              </span>
              <span className="text-slate-400">
                Next: <strong className="text-white font-mono">{countdownStr}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Right: Institutional Killzone Windows */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x text-[10px] max-w-full">
          {INSTITUTIONAL_SESSIONS.map((s) => {
            const isCurrent = activeSession?.id === s.id;
            return (
              <div
                key={s.id}
                title={`${s.name}: ${s.description}`}
                className={`px-2 py-1 rounded border whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isCurrent
                    ? "bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-sm ring-1 ring-emerald-500/50 font-bold"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s.type === "SILVER_BULLET" ? (
                  <Target size={11} className={isCurrent ? "text-amber-400 animate-pulse" : "text-slate-500"} />
                ) : (
                  <Clock size={11} className={isCurrent ? "text-emerald-400" : "text-slate-500"} />
                )}
                <span>{s.name.replace(" Killzone", "")}</span>
                <span className="text-slate-500 font-normal">({s.timeUtc.split(" ")[0]} UTC)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
