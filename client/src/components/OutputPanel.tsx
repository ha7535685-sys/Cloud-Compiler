import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Terminal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  Loader2,
  AlertOctagon,
  RotateCcw,
  Sparkles,
  CornerDownLeft
} from 'lucide-react';
import { ExecutionResult } from '../types';

export interface TerminalSegment {
  id: string;
  type: 'stdout' | 'input' | 'stderr' | 'system';
  text: string;
}

interface OutputPanelProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
  onRestart: () => void;
  onSendInput: (input: string) => void;
  sessionInputs: string[];
  isWaitingForInput: boolean;
}

/**
 * Extracts delta from current stdout relative to previous step
 */
function extractDelta(prevStdout: string, currentStdout: string, lastPrompt?: string): string {
  if (!prevStdout) return currentStdout;
  if (currentStdout.startsWith(prevStdout)) {
    return currentStdout.slice(prevStdout.length);
  }
  if (lastPrompt && currentStdout.includes(lastPrompt)) {
    const lastPromptIdx = currentStdout.lastIndexOf(lastPrompt);
    return currentStdout.slice(lastPromptIdx + lastPrompt.length);
  }
  return currentStdout.slice(Math.min(prevStdout.length, currentStdout.length));
}

/**
 * Parses menu options like "1. Generate password", "[1] Option", or "[y/n]"
 */
function extractMenuOptions(text: string): { key: string; label: string }[] {
  if (!text) return [];
  const options: { key: string; label: string }[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // 1. Generate password, 1) Option, 1 - Option, 1: Option
    const matchNum = trimmed.match(/^([0-9]+|[a-zA-Z])[\.\)\:\-]\s+(.+)$/);
    if (matchNum) {
      options.push({ key: matchNum[1], label: matchNum[2].trim() });
      continue;
    }
    // [1] Option, (1) Option
    const matchBracket = trimmed.match(/^[\(\[]([0-9]+|[a-zA-Z])[\)\]]\s*(.+)$/);
    if (matchBracket) {
      options.push({ key: matchBracket[1], label: matchBracket[2].trim() });
      continue;
    }
  }

  if (options.length === 0) {
    const lastLine = lines[lines.length - 1] || '';
    if (/\[y\/n\]|\(y\/n\)/i.test(lastLine)) {
      options.push({ key: 'y', label: 'Yes' }, { key: 'n', label: 'No' });
    }
  }

  return options;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  result,
  isRunning,
  onClear,
  onRestart,
  onSendInput,
  sessionInputs,
  isWaitingForInput
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [segments, setSegments] = useState<TerminalSegment[]>([]);

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const prevStdoutRef = useRef<string>('');
  const lastPromptRef = useRef<string>('');

  // Synchronize execution result and session inputs into continuous terminal segments
  useEffect(() => {
    if (!result) {
      setSegments([]);
      prevStdoutRef.current = '';
      lastPromptRef.current = '';
      return;
    }

    if (sessionInputs.length === 0) {
      // Fresh execution start
      const newSegments: TerminalSegment[] = [];
      if (result.stdout) {
        newSegments.push({
          id: `seg-0-${Date.now()}`,
          type: 'stdout',
          text: result.stdout
        });
      }
      if (result.stderr && !isWaitingForInput) {
        newSegments.push({
          id: `seg-err-${Date.now()}`,
          type: 'stderr',
          text: result.stderr
        });
      }
      setSegments(newSegments);
      prevStdoutRef.current = result.stdout;
    } else {
      // Interactive step response
      const delta = extractDelta(prevStdoutRef.current, result.stdout, lastPromptRef.current);
      prevStdoutRef.current = result.stdout;

      setSegments((prev) => {
        const next = [...prev];
        if (delta) {
          next.push({
            id: `seg-delta-${Date.now()}`,
            type: 'stdout',
            text: delta
          });
        }
        if (result.stderr && !isWaitingForInput) {
          next.push({
            id: `seg-err-${Date.now()}`,
            type: 'stderr',
            text: result.stderr
          });
        }
        return next;
      });
    }
  }, [result, sessionInputs.length, isWaitingForInput]);

  // Auto-scroll to bottom of terminal on updates
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [segments, isRunning, isWaitingForInput]);

  // Focus input field whenever waiting for user choice/input
  useEffect(() => {
    if (isWaitingForInput && !isRunning) {
      const timer = setTimeout(() => {
        inlineInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isWaitingForInput, isRunning]);

  const handleCopy = () => {
    if (!result && segments.length === 0) return;
    const textToCopy = segments
      .map((s) => (s.type === 'input' ? `${s.text}\n` : s.text))
      .join('');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit typed option or value
  const handleSubmitInput = (val: string) => {
    if (isRunning) return;
    const submitted = val;
    setCurrentInput('');

    // Append user input directly to terminal transcript
    setSegments((prev) => [
      ...prev,
      {
        id: `inp-${Date.now()}`,
        type: 'input',
        text: submitted
      }
    ]);

    onSendInput(submitted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitInput(currentInput);
    }
  };

  const handleSelectOption = (key: string) => {
    handleSubmitInput(key);
  };

  // Split last stdout segment into preceding text and active prompt string
  const activePromptData = useMemo(() => {
    if (!isWaitingForInput || segments.length === 0) {
      return { precedingText: '', promptText: '', detectedOptions: [] };
    }

    // Find the latest stdout segment
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].type === 'stdout') {
        const text = segments[i].text;
        const lastNewlineIdx = text.lastIndexOf('\n');
        let precedingText = '';
        let promptText = text;

        if (lastNewlineIdx !== -1) {
          precedingText = text.slice(0, lastNewlineIdx + 1);
          promptText = text.slice(lastNewlineIdx + 1);
        }

        lastPromptRef.current = promptText;
        const detectedOptions = extractMenuOptions(text);

        return { precedingText, promptText, detectedOptions, segmentIndex: i };
      }
    }

    return { precedingText: '', promptText: '', detectedOptions: [] };
  }, [isWaitingForInput, segments]);

  const getErrorTypeBadge = () => {
    if (isWaitingForInput) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>Waiting for option...</span>
        </span>
      );
    }

    if (!result?.errorType) return null;
    switch (result.errorType) {
      case 'compile_error':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
            <AlertOctagon className="w-3 h-3" />
            <span>Compilation Failed</span>
          </span>
        );
      case 'timeout_error':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Timeout (10s limit)</span>
          </span>
        );
      case 'runtime_error':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Runtime Exception</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#070b14] overflow-hidden select-text">
      {/* Subheader bar with macOS traffic dots & metrics */}
      <div className="h-10 px-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
        {/* Window dots & title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-sm" />
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-slate-200 text-xs">Output</span>
            {getErrorTypeBadge()}
          </div>
        </div>

        {/* Runtime & Action Pills */}
        <div className="flex items-center space-x-2 font-mono">
          {result && (
            <>
              {/* Runtime Pill */}
              <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-300">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{result.timeMs} ms</span>
              </div>

              {/* Status Pill */}
              {!isWaitingForInput && (
                <div
                  className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                    result.exitCode === 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {result.exitCode === 0 ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  <span>exit {result.exitCode}</span>
                </div>
              )}

              {/* Restart Session Button */}
              <button
                type="button"
                onClick={onRestart}
                title="Restart execution from beginning"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Action buttons */}
              <button
                type="button"
                onClick={handleCopy}
                title="Copy terminal output"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onClear}
                title="Clear output"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main output terminal stream (Click anywhere focuses inline prompt) */}
      <div
        ref={terminalContainerRef}
        onClick={() => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) {
            inlineInputRef.current?.focus();
          }
        }}
        className="flex-1 p-4 font-mono text-xs sm:text-sm overflow-auto cursor-text select-text"
      >
        {isRunning && segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 select-none">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <div className="absolute inset-0 rounded-full blur-md bg-emerald-500/20" />
            </div>
            <span className="text-sm font-semibold text-slate-200">Executing in secure sandbox...</span>
            <span className="text-[11px] text-slate-500">Resource ceiling: 10s / 256 MB memory</span>
          </div>
        ) : !result && segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 select-none">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
              <Terminal className="w-6 h-6 text-slate-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-300">Terminal Ready</p>
              <p className="text-[11px] text-slate-500">
                Click <span className="text-emerald-400 font-semibold">Run</span> or press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Ctrl+Enter</kbd>{' '}
                to execute code.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 font-mono leading-relaxed">
            {/* Render historic segments */}
            {segments.map((seg, idx) => {
              // If this is the last stdout segment and we are waiting for input,
              // render only the preceding lines here; the active prompt line is rendered below.
              if (
                isWaitingForInput &&
                seg.type === 'stdout' &&
                idx === activePromptData.segmentIndex
              ) {
                return (
                  <span
                    key={seg.id}
                    className="text-slate-100 whitespace-pre-wrap break-words"
                  >
                    {activePromptData.precedingText}
                  </span>
                );
              }

              if (seg.type === 'stdout') {
                return (
                  <span
                    key={seg.id}
                    className="text-slate-100 whitespace-pre-wrap break-words"
                  >
                    {seg.text}
                  </span>
                );
              }

              if (seg.type === 'input') {
                return (
                  <span
                    key={seg.id}
                    className="text-emerald-400 font-bold whitespace-pre-wrap break-words"
                  >
                    {seg.text}
                    {'\n'}
                  </span>
                );
              }

              if (seg.type === 'stderr') {
                return (
                  <div
                    key={seg.id}
                    className="my-2 p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 whitespace-pre-wrap break-words"
                  >
                    <div className="flex items-center space-x-1.5 text-[10px] uppercase font-bold tracking-wider text-rose-400 mb-1 select-none">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span>Diagnostics / Error:</span>
                    </div>
                    {seg.text}
                  </div>
                );
              }

              return null;
            })}

            {/* Active Interactive Input Line directly on the Output Screen */}
            {isWaitingForInput && (
              <div className="inline-block w-full mt-0.5">
                {/* Prompt Text + Inline Input with Blinking Cursor */}
                <div className="flex flex-wrap items-center font-mono">
                  <span className="text-slate-100 whitespace-pre font-mono">
                    {activePromptData.promptText}
                  </span>

                  <span className="inline-flex items-center relative ml-0.5">
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isRunning}
                      autoFocus
                      className="bg-transparent border-none outline-none font-mono text-emerald-400 font-bold px-0 py-0 m-0 focus:ring-0 focus:outline-none"
                      style={{
                        minWidth: '1ch',
                        width: `${Math.max(1, currentInput.length + 1)}ch`,
                        caretColor: '#34d399'
                      }}
                    />
                    <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block align-middle ml-0.5 pointer-events-none" />
                  </span>

                  {isRunning && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 ml-2" />
                  )}
                </div>

                {/* Sleek Interactive Option Buttons if a menu was detected in output */}
                {activePromptData.detectedOptions.length > 0 && (
                  <div className="mt-3 mb-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-md">
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2 select-none">
                      <Sparkles className="w-3 h-3" />
                      <span>Choose an option directly on screen:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activePromptData.detectedOptions.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectOption(opt.key)}
                          disabled={isRunning}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-slate-700/80 hover:border-indigo-400 transition-all flex items-center space-x-2 shadow-sm active:scale-95 disabled:opacity-40"
                        >
                          <span className="w-4 h-4 rounded bg-slate-950/80 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                            {opt.key}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Helpful inline cue */}
                <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-500 select-none">
                  <span className="flex items-center space-x-1">
                    <CornerDownLeft className="w-3 h-3 text-slate-400" />
                    <span>Type choice and press <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">Enter</kbd></span>
                  </span>
                  {activePromptData.detectedOptions.length > 0 && (
                    <span>• or click an option pill above</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
