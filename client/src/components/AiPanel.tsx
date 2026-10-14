import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Wrench,
  MessageSquareCode,
  X,
  Loader2,
  Check,
  ArrowRight,
  Copy,
  AlertCircle,
  Search,
  BookOpen,
  ListTree,
  Activity,
  Lightbulb,
  Cpu,
  FileCode2
} from 'lucide-react';

export type AiMode = 'explain' | 'fix' | 'comment';

export interface AiPanelData {
  mode: AiMode;
  loading: boolean;
  error?: string | null;
  explanation?: string;
  fixedCode?: string;
  diff?: string;
  commentedCode?: string;
}

interface AiPanelProps {
  data: AiPanelData | null;
  onClose: () => void;
  onApplyCode: (newCode: string) => void;
}

interface LineExplanationItem {
  lineLabel: string;
  lineNumber: number | string;
  codeSnippet: string;
  bullets: string[];
}

interface ParsedExplanation {
  overview: string;
  lineItems: LineExplanationItem[];
  flow: string[];
  complexityTime: string;
  complexitySpace: string;
  bestPractices: string[];
  rawText: string;
}

/**
 * Intelligent parser to split Markdown explanation into rich interactive cards
 */
function parseExplanationText(raw: string): ParsedExplanation {
  const result: ParsedExplanation = {
    overview: '',
    lineItems: [],
    flow: [],
    complexityTime: '',
    complexitySpace: '',
    bestPractices: [],
    rawText: raw
  };

  if (!raw) return result;

  const sections = raw.split(/^##\s+/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const firstLineEnd = trimmed.indexOf('\n');
    const header = (firstLineEnd !== -1 ? trimmed.substring(0, firstLineEnd) : trimmed).toLowerCase();
    const content = firstLineEnd !== -1 ? trimmed.substring(firstLineEnd + 1).trim() : '';

    if (header.includes('overview') || header.includes('purpose') || header.includes('summary')) {
      result.overview = content;
    } else if (header.includes('line-by-line') || header.includes('walkthrough') || header.includes('breakdown')) {
      // Parse individual line entries
      // Typical format:
      // * **Line [1]**: `import random`
      //   * **What it does**: ...
      //   * **Role**: ...
      // or: - **Line 1**: `...`
      const lineBlocks = content.split(/\n(?=[*-]\s+\*\*Line|\n### Line)/);

      for (const block of lineBlocks) {
        const blkTrim = block.trim();
        if (!blkTrim) continue;

        const lineMatch = blkTrim.match(/[*-]?\s*\*{0,2}Line\s*\[?(\d+(?:\s*-\s*\d+)?)\]?\*{0,2}:?\s*`?([^`\n]+)?`?/i);
        if (lineMatch) {
          const lineNum = lineMatch[1] || 'Line';
          const codeSnippet = (lineMatch[2] || '').trim();

          // Extract subsequent bullet points
          const bulletLines = blkTrim
            .split('\n')
            .slice(1)
            .map((l) => l.trim().replace(/^[*-]\s+/, '').replace(/^\*\s+/, ''))
            .filter((l) => l.length > 0);

          result.lineItems.push({
            lineLabel: `Line ${lineNum}`,
            lineNumber: lineNum,
            codeSnippet,
            bullets: bulletLines.length > 0 ? bulletLines : [blkTrim.replace(/^[*-]\s+/, '')]
          });
        } else {
          // General non-matched item
          const lines = blkTrim.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length > 0) {
            result.lineItems.push({
              lineLabel: 'Code Block',
              lineNumber: '•',
              codeSnippet: lines[0].replace(/^[*-]\s+/, ''),
              bullets: lines.slice(1)
            });
          }
        }
      }
    } else if (header.includes('control flow') || header.includes('execution step')) {
      result.flow = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    } else if (header.includes('complexity')) {
      const timeMatch = content.match(/Time Complexity\*?:\s*([^\n]+)/i);
      if (timeMatch) result.complexityTime = timeMatch[1].trim();

      const spaceMatch = content.match(/Space Complexity\*?:\s*([^\n]+)/i);
      if (spaceMatch) result.complexitySpace = spaceMatch[1].trim();
    } else if (header.includes('best practices') || header.includes('tips')) {
      result.bestPractices = content
        .split('\n')
        .map((l) => l.trim().replace(/^[*-]\s+/, ''))
        .filter((l) => l.length > 0);
    }
  }

  return result;
}

export const AiPanel: React.FC<AiPanelProps> = ({
  data,
  onClose,
  onApplyCode
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [explainViewMode, setExplainViewMode] = useState<'structured' | 'raw'>('structured');

  if (!data) return null;

  const parsed = useMemo(() => {
    return parseExplanationText(data.explanation || '');
  }, [data.explanation]);

  const filteredLineItems = useMemo(() => {
    if (!searchFilter.trim()) return parsed.lineItems;
    const q = searchFilter.toLowerCase();
    return parsed.lineItems.filter(
      (item) =>
        item.lineLabel.toLowerCase().includes(q) ||
        item.codeSnippet.toLowerCase().includes(q) ||
        item.bullets.some((b) => b.toLowerCase().includes(q))
    );
  }, [parsed.lineItems, searchFilter]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleApply = (codeToApply: string) => {
    onApplyCode(codeToApply);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  const getHeaderInfo = () => {
    switch (data.mode) {
      case 'explain':
        return {
          title: 'Line-by-Line Code Explainer',
          subtitle: 'Detailed instruction walkthrough & execution tracing',
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
          badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        };
      case 'fix':
        return {
          title: 'AI Bug Doctor & Unified Diff',
          subtitle: 'Automatic syntax & runtime error repair',
          icon: <Wrench className="w-4 h-4 text-emerald-400" />,
          badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        };
      case 'comment':
        return {
          title: 'Clean Code Documenter',
          subtitle: 'Docstrings, inline explanations, and type annotations',
          icon: <MessageSquareCode className="w-4 h-4 text-sky-400" />,
          badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
        };
    }
  };

  const header = getHeaderInfo();

  return (
    <div className="flex flex-col h-full w-full bg-[#080d1a] border-l border-slate-800/90 shadow-2xl overflow-hidden z-20">
      {/* Panel Header */}
      <div className="h-14 px-4 bg-slate-900/80 backdrop-blur border-b border-slate-800/90 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-slate-800/90 border border-slate-700/60 shadow-sm">
            {header.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-xs text-slate-100 tracking-wide">
                {header.title}
              </h3>
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${header.badgeColor}`}>
                AI Assistant
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {header.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {data.explanation && (
            <button
              onClick={() => handleCopyRaw(data.explanation!)}
              title="Copy entire explanation markdown"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 text-[11px] transition-all"
            >
              {copiedRaw ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            title="Close Assistant Panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto text-xs font-sans p-4 space-y-4">
        {data.loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-6">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
              <div className="absolute inset-0 rounded-full blur-lg bg-amber-500/20" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-sm font-semibold text-slate-200">
                Generating Line-by-Line Analysis...
              </h4>
              <p className="text-xs text-slate-400 max-w-xs">
                Scanning syntax tree, identifying instructions, and composing pedagogical line walkthrough.
              </p>
            </div>

            {/* Stepper animation */}
            <div className="w-full max-w-xs space-y-2 text-[11px] text-slate-400 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Source code tokenized</span>
              </div>
              <div className="flex items-center space-x-2 text-amber-400 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deconstructing line semantics & arguments...</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-500">
                <Cpu className="w-3.5 h-3.5" />
                <span>Computing Big-O complexity & memory limits</span>
              </div>
            </div>
          </div>
        ) : data.error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2 shadow-lg">
            <div className="flex items-center space-x-2 font-semibold text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>AI Request Unsuccessful</span>
            </div>
            <p className="text-xs leading-relaxed text-rose-300/90">{data.error}</p>
          </div>
        ) : data.mode === 'explain' ? (
          /* ============================================================ */
          /* EXPLAIN MODE: LINE-BY-LINE VIEWER                            */
          /* ============================================================ */
          <div className="space-y-4">
            {/* View Mode & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setExplainViewMode('structured')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                    explainViewMode === 'structured'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListTree className="w-3 h-3" />
                  <span>Line Cards</span>
                </button>
                <button
                  onClick={() => setExplainViewMode('raw')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
                    explainViewMode === 'raw'
                      ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode2 className="w-3 h-3" />
                  <span>Raw Markdown</span>
                </button>
              </div>

              {explainViewMode === 'structured' && parsed.lineItems.length > 0 && (
                <div className="relative flex-1 sm:max-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter lines..."
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              )}
            </div>

            {explainViewMode === 'raw' ? (
              /* Raw Markdown View */
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/90 text-slate-200 leading-relaxed font-mono text-[11px] whitespace-pre-wrap select-text shadow-inner">
                {data.explanation}
              </div>
            ) : (
              /* Rich Card-based Structured View */
              <div className="space-y-4">
                {/* 1. Overview Card */}
                {parsed.overview && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-amber-950/20 border border-amber-500/20 shadow-md space-y-2">
                    <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs tracking-wide">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>Program Overview & Purpose</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                      {parsed.overview}
                    </p>
                  </div>
                )}

                {/* 2. Line-by-Line Breakdown Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ListTree className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Line-by-Line Walkthrough
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                      {filteredLineItems.length} {filteredLineItems.length === 1 ? 'line' : 'lines'}
                    </span>
                  </div>

                  {filteredLineItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                      No lines match search query "{searchFilter}"
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredLineItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-150 shadow-sm space-y-2 group"
                        >
                          {/* Line Header & Code Snippet */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {item.lineLabel}
                              </span>
                              {item.codeSnippet && (
                                <code className="px-2 py-0.5 rounded-md font-mono text-xs text-sky-300 bg-slate-950 border border-slate-800 break-all">
                                  {item.codeSnippet}
                                </code>
                              )}
                            </div>

                            {item.codeSnippet && (
                              <button
                                onClick={() => handleCopy(item.codeSnippet)}
                                title="Copy line snippet"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-slate-300 transition-opacity"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Line Explanation Details */}
                          <div className="space-y-1.5 pl-1 text-slate-300 text-xs leading-relaxed">
                            {item.bullets.map((b, bIdx) => (
                              <div key={bIdx} className="flex items-start space-x-2">
                                <span className="text-amber-400 font-bold leading-5">•</span>
                                <span className="text-slate-300 text-xs leading-5 whitespace-pre-wrap">
                                  {b}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Execution Flow Card */}
                {parsed.flow.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-2.5">
                    <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs tracking-wide">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span>Execution Flow & State Tracing</span>
                    </div>
                    <div className="space-y-1.5 pl-1 text-slate-300 text-xs">
                      {parsed.flow.map((step, sIdx) => (
                        <div key={sIdx} className="leading-relaxed">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Complexity Analysis Card */}
                {(parsed.complexityTime || parsed.complexitySpace) && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-blue-950/20 border border-blue-500/20 shadow-sm space-y-2.5">
                    <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs tracking-wide">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      <span>Complexity Analysis</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {parsed.complexityTime && (
                        <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Time Complexity
                          </span>
                          <p className="text-xs font-mono text-emerald-400 font-semibold">
                            {parsed.complexityTime}
                          </p>
                        </div>
                      )}

                      {parsed.complexitySpace && (
                        <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Space Complexity
                          </span>
                          <p className="text-xs font-mono text-cyan-400 font-semibold">
                            {parsed.complexitySpace}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Best Practices Card */}
                {parsed.bestPractices.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 shadow-sm space-y-2.5">
                    <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wide">
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <span>Best Practices & Insights</span>
                    </div>
                    <ul className="space-y-1.5 pl-1 text-slate-300 text-xs">
                      {parsed.bestPractices.map((tip, tIdx) => (
                        <li key={tIdx} className="flex items-start space-x-2 leading-relaxed">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* FIX & COMMENT MODES                                          */
          /* ============================================================ */
          <div className="space-y-4">
            {/* Explanation Section */}
            {data.explanation && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Diagnosis:
                </span>
                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {data.explanation}
                </div>
              </div>
            )}

            {/* Fix Mode: Before/After Diff Viewer & Apply Button */}
            {data.mode === 'fix' && data.fixedCode && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    Changes Diff (- Before / + After):
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(data.fixedCode!)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Fix</span>
                    </button>
                    <button
                      onClick={() => handleApply(data.fixedCode!)}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-xs shadow-md transition-all"
                    >
                      {applied ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{applied ? 'Applied!' : 'Apply Fix'}</span>
                    </button>
                  </div>
                </div>

                {/* Diff Viewer Block */}
                {data.diff && (
                  <pre className="p-3 font-mono text-[11px] bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto leading-5 shadow-inner select-text">
                    {data.diff.split('\n').map((line, idx) => {
                      let colorClass = 'text-slate-300';
                      let bgClass = '';
                      if (line.startsWith('+')) {
                        colorClass = 'text-emerald-400 font-semibold';
                        bgClass = 'bg-emerald-950/30';
                      } else if (line.startsWith('-')) {
                        colorClass = 'text-rose-400 font-semibold';
                        bgClass = 'bg-rose-950/30';
                      }
                      return (
                        <div key={idx} className={`${colorClass} ${bgClass} px-1.5 py-0.5 rounded`}>
                          {line}
                        </div>
                      );
                    })}
                  </pre>
                )}
              </div>
            )}

            {/* Comment Mode: Code Preview & Apply Button */}
            {data.mode === 'comment' && data.commentedCode && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
                    Documented Code Preview:
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(data.commentedCode!)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/60 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => handleApply(data.commentedCode!)}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-medium text-xs shadow-md transition-all"
                    >
                      {applied ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{applied ? 'Applied!' : 'Apply Comments'}</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3 font-mono text-[11px] bg-slate-950 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto leading-5 max-h-96 shadow-inner select-text">
                  {data.commentedCode}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
