import React from 'react';
import { Keyboard, X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { key: `${modKey} + Enter`, description: 'Execute & run current code in sandbox' },
    { key: `${modKey} + S`, description: 'Create and copy sharable snippet short link' },
    { key: `${modKey} + K`, description: 'Open AI Assistant to explain current code' },
    { key: 'Escape', description: 'Close modals, AI panel, and notifications' },
    { key: `${modKey} + /`, description: 'Toggle line comment in editor' },
    { key: `${modKey} + F`, description: 'Find & replace text inside editor' },
    { key: 'Tab / Shift + Tab', description: 'Indent / un-indent code lines' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-slate-400">
                Boost your productivity with quick keyboard bindings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
          {shortcuts.map((sc, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-normal pr-4">{sc.description}</span>
              <kbd className="px-2 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 shadow-sm shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1">
            <Command className="w-3 h-3" />
            <span>Works across Windows, Mac, and Linux</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
