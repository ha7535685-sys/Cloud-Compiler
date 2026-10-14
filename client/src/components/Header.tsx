import React from 'react';
import {
  Play,
  Loader2,
  RotateCcw,
  Moon,
  Sun,
  Terminal,
  Sparkles,
  Wrench,
  MessageSquareCode,
  Share2,
  Keyboard
} from 'lucide-react';
import { LanguageConfig, ThemeMode } from '../types';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  languages: LanguageConfig[];
  selectedLanguage: LanguageConfig;
  onSelectLanguage: (language: LanguageConfig) => void;
  onResetCode: () => void;
  onRunCode: () => void;
  isRunning: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  apiOnline: boolean;
  onExplainCode: () => void;
  onFixCode: () => void;
  onCommentCode: () => void;
  hasStderr: boolean;
  aiLoading: boolean;
  onShareSnippet: () => void;
  isSharing: boolean;
  onOpenShortcuts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  languages,
  selectedLanguage,
  onSelectLanguage,
  onResetCode,
  onRunCode,
  isRunning,
  theme,
  onToggleTheme,
  apiOnline,
  onExplainCode,
  onFixCode,
  onCommentCode,
  hasStderr,
  aiLoading,
  onShareSnippet,
  isSharing,
  onOpenShortcuts
}) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="h-14 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Title */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-blue-500/25 shrink-0">
          <Terminal className="w-4 h-4" />
          <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm tracking-tight text-white">
              CloudCompiler
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-normal">
            Online Code Studio & AI
          </span>
        </div>
      </div>

      {/* Middle Action Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Language selector (without version clutter) */}
        <LanguageSelector
          languages={languages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={onSelectLanguage}
          disabled={isRunning || aiLoading}
        />

        {/* Reset starter template */}
        <button
          onClick={onResetCode}
          disabled={isRunning || aiLoading}
          title="Reset starter template"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-slate-700/60 transition-colors duration-150 disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* High-Impact Glowing Run Button */}
        <button
          onClick={onRunCode}
          disabled={isRunning || aiLoading}
          className={`btn-glow-emerald flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
            isRunning
              ? 'bg-emerald-600/70 text-emerald-100 cursor-not-allowed opacity-90'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-bold'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
              <span className="text-slate-950 font-bold">Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run</span>
              <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono text-emerald-950 bg-emerald-400/60 rounded font-semibold">
                {isMac ? '⌘↵' : 'Ctrl+↵'}
              </kbd>
            </>
          )}
        </button>

        <div className="h-4 w-px bg-slate-800 mx-0.5 hidden md:block" />

        {/* AI Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* Explain Code (Line-by-Line) */}
          <button
            onClick={onExplainCode}
            disabled={isRunning || aiLoading}
            title="Explain code line-by-line using AI (Ctrl+K)"
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium 
              bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 
              text-amber-300 border border-amber-500/40 hover:border-amber-400/60 
              shadow-sm shadow-amber-500/10 transition-all duration-150 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-semibold">Explain</span>
            <span className="hidden xl:inline-block text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 font-bold border border-amber-400/30">
              Line-by-Line
            </span>
          </button>

          {/* Fix Error */}
          <button
            onClick={onFixCode}
            disabled={isRunning || aiLoading}
            title="Fix code error using AI"
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
              hasStderr
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 animate-pulse shadow-sm shadow-rose-500/20'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50'
            }`}
          >
            <Wrench className={`w-3.5 h-3.5 ${hasStderr ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span className="hidden md:inline font-semibold">Fix Error</span>
            {hasStderr && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
          </button>

          {/* Add Comments */}
          <button
            onClick={onCommentCode}
            disabled={isRunning || aiLoading}
            title="Add comments and documentation using AI"
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium 
              bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:border-sky-500/50 
              transition-all disabled:opacity-50"
          >
            <MessageSquareCode className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline font-semibold">Comment</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Share Snippet Button */}
        <button
          onClick={onShareSnippet}
          disabled={isRunning || isSharing}
          title="Share code snippet via short link (Ctrl+S)"
          className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium 
            bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 hover:border-blue-400/50 
            transition-all disabled:opacity-50"
        >
          {isSharing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span className="hidden sm:inline font-semibold">{isSharing ? 'Saving...' : 'Share'}</span>
        </button>
      </div>

      {/* Right Tools (Keyboard shortcuts, Runner Status, Theme Toggle) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Shortcuts Modal Trigger */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-700/50 transition-colors hidden sm:block"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Runner Status Pill */}
        <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px]">
          <span className="relative flex h-2 w-2">
            {apiOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                apiOnline ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="text-slate-300 font-medium">
            {apiOnline ? 'Runner Ready' : 'Reconnecting...'}
          </span>
        </div>

        {/* Theme switcher */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-slate-700/50 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>
    </header>
  );
};
