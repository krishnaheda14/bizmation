import React from 'react';

export const CardStat: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass }) => (
  <div className="rounded-2xl p-5 bg-white border border-amber-100 shadow-[0_2px_12px_rgba(251,191,36,0.08)] hover:shadow-[0_8px_24px_rgba(251,191,36,0.15)] transition-shadow">
    <p className="text-[11px] font-bold text-amber-900/60 uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-2xl font-black tracking-tight ${valueClass ?? 'text-stone-800'}`}>{value}</p>
  </div>
);

export const DetailGrid: React.FC<{ title: string; rows: Array<{ label: string; value: string }> }> = ({ title, rows }) => (
  <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/30 p-5 shadow-sm">
    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-4 flex items-center gap-2">
      <span className="w-1.5 h-4 bg-amber-400 rounded-full inline-block"></span>
      {title}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="rounded-xl bg-white px-3 py-2 border border-amber-100 shadow-sm flex flex-col justify-center min-h-[50px]">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-bold mb-0.5">{r.label}</p>
          <p className="text-sm font-medium text-stone-700 break-words leading-tight">{r.value}</p>
        </div>
      ))}
    </div>
  </div>
);
