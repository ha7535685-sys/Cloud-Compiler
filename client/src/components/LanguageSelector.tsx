import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { LanguageConfig } from '../types';

interface LanguageSelectorProps {
  languages: LanguageConfig[];
  selectedLanguage: LanguageConfig;
  onSelectLanguage: (language: LanguageConfig) => void;
  disabled?: boolean;
}

// Language branding badges
const LANGUAGE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  python: { label: 'PY', color: 'text-amber-300', bg: 'bg-blue-600/30 border-blue-500/40' },
  javascript: { label: 'JS', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  c: { label: 'C', color: 'text-cyan-300', bg: 'bg-cyan-600/20 border-cyan-500/40' },
  cpp: { label: 'C++', color: 'text-blue-300', bg: 'bg-blue-600/20 border-blue-500/40' },
  java: { label: 'JV', color: 'text-orange-400', bg: 'bg-orange-600/20 border-orange-500/40' },
  html: { label: 'HTML', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' },
  css: { label: 'CSS', color: 'text-sky-400', bg: 'bg-sky-500/20 border-sky-500/40' },
};

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedLanguage,
  onSelectLanguage,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedBadge = LANGUAGE_BADGES[selectedLanguage.id] || {
    label: selectedLanguage.name.slice(0, 2).toUpperCase(),
    color: 'text-blue-400',
    bg: 'bg-blue-500/20 border-blue-500/30'
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium 
          bg-slate-800/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 hover:border-slate-600
          transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
      >
        {/* Language Badge */}
        <span
          className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border font-mono ${selectedBadge.bg} ${selectedBadge.color}`}
        >
          {selectedBadge.label}
        </span>

        {/* Clean Language Name (No Version) */}
        <span className="font-semibold tracking-tight text-white">{selectedLanguage.name}</span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 mt-1.5 w-48 rounded-xl bg-slate-900/95 backdrop-blur-md 
            border border-slate-800 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Languages
          </div>
          {languages.map((lang) => {
            const isSelected = lang.id === selectedLanguage.id;
            const badge = LANGUAGE_BADGES[lang.id] || {
              label: lang.name.slice(0, 2).toUpperCase(),
              color: 'text-blue-400',
              bg: 'bg-blue-500/20 border-blue-500/30'
            };

            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => {
                  onSelectLanguage(lang);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors rounded-lg mx-auto ${
                  isSelected
                    ? 'bg-blue-600/20 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border font-mono ${badge.bg} ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                  <span>{lang.name}</span>
                </div>

                {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
