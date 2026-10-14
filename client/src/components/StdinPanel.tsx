import React from 'react';
import { CornerDownLeft, Trash2, Info } from 'lucide-react';

interface StdinPanelProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const StdinPanel: React.FC<StdinPanelProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const lineCount = value.split('\n').filter((l) => l.trim().length > 0).length;

  const handleApplyPreset = (preset: string) => {
    onChange(preset);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#070b14] overflow-hidden select-text">
      {/* Subheader bar with traffic dots */}
      <div className="h-10 px-4 bg-slate-900/70 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <CornerDownLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-200 text-xs">Standard Input (stdin)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {lineCount} {lineCount === 1 ? 'input line' : 'input lines'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {value.length > 0 && (
            <button
              onClick={() => onChange('')}
              disabled={disabled}
              title="Clear stdin"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50 flex items-center space-x-1 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Clear</span>
            </button>
          )}
          <span className="text-[11px] text-slate-400 font-mono bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
            {value.length} bytes
          </span>
        </div>
      </div>

      {/* Quick Helper Banner */}
      <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400 select-none shrink-0">
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Each line feeds one <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">input()</code> or <code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">cin</code> prompt sequentially.
          </span>
        </div>

        {/* Quick presets */}
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500 text-[10px] uppercase font-semibold">Presets:</span>
          <button
            onClick={() => handleApplyPreset('1\n16\n3')}
            className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 border border-slate-700/60 text-[10px] transition-colors"
          >
            Menu (1, 16, 3)
          </button>
          <button
            onClick={() => handleApplyPreset('Hello\nWorld')}
            className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 border border-slate-700/60 text-[10px] transition-colors"
          >
            Text Lines
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 p-3.5 flex flex-col">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter input values here to feed into standard input (e.g. input(), cin, Scanner)...&#10;&#10;Line 1 -> First input() call (e.g. 1)&#10;Line 2 -> Second input() call (e.g. 16)&#10;Line 3 -> Third input() call (e.g. 3 to exit)"
          className="w-full flex-1 p-3.5 font-mono text-xs bg-slate-950/80 text-slate-100 rounded-xl border border-slate-800/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none placeholder:text-slate-600 disabled:opacity-50 leading-relaxed shadow-inner"
        />
      </div>
    </div>
  );
};
