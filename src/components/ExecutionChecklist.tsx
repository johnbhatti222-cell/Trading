import React, { useState } from "react";
import { TradeAnalysis } from "../types";
import { CheckSquare, Square, ShieldAlert, CheckCircle2, AlertOctagon, ArrowRight } from "lucide-react";

interface ExecutionChecklistProps {
  analysis: TradeAnalysis;
  onLogTrade: () => void;
}

export const ExecutionChecklist: React.FC<ExecutionChecklistProps> = ({ analysis, onLogTrade }) => {
  const [answers, setAnswers] = useState({
    thesisClear: true,
    liquidityIdentified: true,
    confirmationPresent: analysis.score.marketStructureConfirmation >= 12,
    invalidationDefined: true,
    acceptableRR: !analysis.tradePlan.riskReward.includes("0 :") && analysis.score.riskReward >= 3,
    noImminentEventRisk: analysis.score.macroEnvironment >= 6,
    notExtended: analysis.market.marketRegime !== "UNCLEAR",
    noFomo: true,
  });

  const toggleCheck = (key: keyof typeof answers) => {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allPassed = Object.values(answers).every(Boolean);

  const questions: {
    key: keyof typeof answers;
    q: string;
    detail: string;
    evalText: string;
  }[] = [
    {
      key: "thesisClear",
      q: "1. What is the thesis?",
      detail: analysis.setup.whyExists,
      evalText: "HTF direction and institutional reason for trade must be established.",
    },
    {
      key: "liquidityIdentified",
      q: "2. Where is liquidity?",
      detail: `Target: ${analysis.liquidity.nextLikelyLiquidityTarget}`,
      evalText: "Identified buy-side and sell-side pools, stop clusters, or PDH/PDL.",
    },
    {
      key: "confirmationPresent",
      q: "3. What confirms the thesis?",
      detail: analysis.setup.confirmationRequired,
      evalText: "Clear LTF displacement, structure shift (BOS/CHOCH), and retest.",
    },
    {
      key: "invalidationDefined",
      q: "4. Where is the thesis invalidated?",
      detail: analysis.invalidation,
      evalText: "Logical stop beyond the sweep or structural order block, not arbitrary points.",
    },
    {
      key: "acceptableRR",
      q: "5. What is the Risk : Reward?",
      detail: `Calculated R:R: ${analysis.tradePlan.riskReward}`,
      evalText: "Minimum acceptable institutional ratio is strictly 1:2.0.",
    },
    {
      key: "noImminentEventRisk",
      q: "6. What event could invalidate the setup?",
      detail: analysis.keyRisk,
      evalText: "No high-impact CPI/FOMC release within immediate execution window.",
    },
    {
      key: "notExtended",
      q: "7. Is the market already extended?",
      detail: `Regime: ${analysis.market.marketRegime}`,
      evalText: "Price has NOT already completed >75% of move; not buying at top of daily range.",
    },
    {
      key: "noFomo",
      q: "8. Am I entering because of confirmation or FOMO?",
      detail: "Execution quality check",
      evalText: "Strict emotional neutrality. Never convert WAIT to TRADE for action.",
    },
  ];

  return (
    <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-mono font-bold text-sm text-white flex items-center gap-2">
            <CheckSquare size={16} className="text-indigo-400" />
            Execution Discipline — Section 20 Pre-Flight Gatekeeper
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Institutional traders complete all 8 criteria before submitting orders.
          </p>
        </div>

        <div
          className={`px-3 py-1 rounded-md font-mono text-xs font-bold flex items-center gap-1.5 ${
            allPassed
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
          }`}
        >
          {allPassed ? (
            <>
              <CheckCircle2 size={14} />
              PRE-FLIGHT CLEARED (8/8)
            </>
          ) : (
            <>
              <ShieldAlert size={14} />
              HOLD ORDER — CRITERIA UNMET
            </>
          )}
        </div>
      </div>

      {/* 8 Questions Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {questions.map((item) => {
          const isChecked = answers[item.key];
          return (
            <div
              key={item.key}
              onClick={() => toggleCheck(item.key)}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 select-none ${
                isChecked
                  ? "bg-slate-900/80 border-slate-700/80 hover:border-slate-600"
                  : "bg-rose-950/20 border-rose-900/40 hover:border-rose-800"
              }`}
            >
              <button
                type="button"
                className="mt-0.5 text-slate-400 flex-shrink-0"
              >
                {isChecked ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                  <AlertOctagon size={16} className="text-rose-400" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5
                    className={`font-mono text-xs font-semibold ${
                      isChecked ? "text-slate-200" : "text-rose-300"
                    }`}
                  >
                    {item.q}
                  </h5>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isChecked
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {isChecked ? "VERIFIED" : "FLAGGED"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono line-clamp-2">
                  {item.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-mono text-slate-300">
          {allPassed ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Setup meets all institutional standards. Ready for journaling or execution.
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1.5">
              <ShieldAlert size={14} />
              Rule 20 Enforced: If any critical answer is unclear, WAIT.
            </span>
          )}
        </div>

        <button
          onClick={onLogTrade}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
        >
          <span>Log Setup to Trade Journal (Section 21)</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
