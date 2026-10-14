import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { OutputPanel } from './components/OutputPanel';
import { AiPanel, AiPanelData, AiMode } from './components/AiPanel';
import { ShareModal } from './components/ShareModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { WebPreview } from './components/WebPreview';
import { DEFAULT_LANGUAGES, DEFAULT_LANGUAGE } from './config/languages';
import { LanguageConfig, ExecutionResult, ThemeMode } from './types';
import { Terminal, Sparkles, Code2, Globe } from 'lucide-react';

export default function App() {
  const [languages, setLanguages] = useState<LanguageConfig[]>(DEFAULT_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageConfig>(DEFAULT_LANGUAGE);
  
  // Store code cache for each language
  const [codeMap, setCodeMap] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    DEFAULT_LANGUAGES.forEach((lang) => {
      initialMap[lang.id] = lang.defaultCode;
    });
    return initialMap;
  });

  const [stdin, setStdin] = useState<string>('');
  const [sessionInputs, setSessionInputs] = useState<string[]>([]);
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  
  // View states
  const [activeRightTab, setActiveRightTab] = useState<'terminal' | 'preview'>('terminal');
  const [mobileTab, setMobileTab] = useState<'editor' | 'terminal' | 'preview'>('editor');
  
  // Modals & Panels
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareModalUrl, setShareModalUrl] = useState<string | null>(null);
  const [aiPanelData, setAiPanelData] = useState<AiPanelData | null>(null);
  
  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Theme preference persisted in localStorage
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme_preference') as ThemeMode) || 'dark';
  });
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  // Synchronize theme with HTML document element and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme_preference', theme);
  }, [theme]);

  // Load shared snippet from URL (/s/:id) on startup
  useEffect(() => {
    const match = window.location.pathname.match(/\/s\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const snippetId = match[1];
      axios
        .get(`/api/snippets/${snippetId}`)
        .then((res) => {
          const { language, code, stdin: loadedStdin } = res.data;
          const foundLang = DEFAULT_LANGUAGES.find((l) => l.id === language);
          if (foundLang) {
            setSelectedLanguage(foundLang);
          }
          setCodeMap((prev) => ({
            ...prev,
            [language]: code
          }));
          if (loadedStdin) setStdin(loadedStdin);
          addToast('success', `Snippet loaded into editor`, 'Snippet Ready');
        })
        .catch(() => {
          addToast('error', `Snippet /s/${snippetId} not found or expired.`, 'Load Failed');
        });
    }
  }, []);

  // Fetch dynamic languages from server
  useEffect(() => {
    axios
      .get('/api/languages')
      .then((res) => {
        if (res.data?.languages && Array.isArray(res.data.languages)) {
          setLanguages(res.data.languages);
          setApiOnline(true);
        }
      })
      .catch(() => {
        setApiOnline(false);
      });
  }, []);

  const currentCode = useMemo(() => {
    return codeMap[selectedLanguage.id] || selectedLanguage.defaultCode;
  }, [codeMap, selectedLanguage]);

  const handleCodeChange = (newCode: string) => {
    setCodeMap((prev) => ({
      ...prev,
      [selectedLanguage.id]: newCode
    }));
  };

  const handleLanguageChange = (newLang: LanguageConfig) => {
    setSelectedLanguage(newLang);
    if (!codeMap[newLang.id]) {
      setCodeMap((prev) => ({
        ...prev,
        [newLang.id]: newLang.defaultCode
      }));
    }
    if (newLang.id === 'html' || newLang.id === 'css') {
      setActiveRightTab('preview');
      setMobileTab('preview');
    } else {
      setActiveRightTab('terminal');
    }
    addToast('info', `Switched environment to ${newLang.name}`);
  };

  const handleResetCode = () => {
    setCodeMap((prev) => ({
      ...prev,
      [selectedLanguage.id]: selectedLanguage.defaultCode
    }));
    addToast('info', `Starter template restored for ${selectedLanguage.name}`);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      addToast('info', `Switched to ${next} theme`);
      return next;
    });
  };

  // Checks if execution halted waiting for user choice/input (e.g. input() prompt)
  const checkWaitingForInput = (res: ExecutionResult): boolean => {
    if (!res.stderr) return false;
    const isEof =
      res.stderr.includes('EOFError: EOF when reading a line') ||
      res.stderr.includes('EOFError') ||
      res.stderr.includes('NoSuchElementException');
    const isRealError =
      res.stderr.includes('SyntaxError') ||
      res.stderr.includes('IndentationError') ||
      res.stderr.includes('ValueError') ||
      res.stderr.includes('TypeError') ||
      res.stderr.includes('ZeroDivisionError') ||
      res.stderr.includes('NameError') ||
      res.stderr.includes('IndexError') ||
      res.stderr.includes('KeyError');
    return isEof && !isRealError;
  };

  const handleRunCode = useCallback(async (overrideStdin?: string) => {
    if (isRunning) return;

    // Reset interactive session on fresh run
    setSessionInputs([]);
    setIsWaitingForInput(false);
    setIsRunning(true);

    if (selectedLanguage.id === 'html' || selectedLanguage.id === 'css') {
      setActiveRightTab('preview');
      setMobileTab('preview');
    } else {
      setActiveRightTab('terminal');
      setMobileTab('terminal');
    }

    try {
      const response = await axios.post<ExecutionResult>('/api/run', {
        language: selectedLanguage.id,
        code: currentCode,
        stdin: typeof overrideStdin === 'string' ? overrideStdin : ''
      });

      const waiting = checkWaitingForInput(response.data);
      setIsWaitingForInput(waiting);
      setResult(response.data);
      setApiOnline(true);

      if (waiting) {
        // Code halted at interactive input() prompt; waiting for user choice directly on output screen
      } else if (response.data.errorType === 'compile_error') {
        addToast('error', 'Compilation failed. See compiler output in red.', 'Compile Error');
      } else if (response.data.errorType === 'timeout_error') {
        addToast('warning', 'Program execution exceeded 10 second timeout limit.', 'Execution Timeout');
      } else if (response.data.exitCode === 0) {
        addToast('success', `Completed in ${response.data.timeMs}ms (Exit 0)`, 'Run Succeeded');
      } else {
        addToast('error', `Process exited with code ${response.data.exitCode}`, 'Runtime Error');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        const errMsg = err.response.data.error.message;
        setResult({
          stdout: '',
          stderr: `Error (${err.response.status}): ${errMsg}`,
          exitCode: 1,
          timeMs: 0,
          errorType: 'runtime_error'
        });
        addToast('error', errMsg, `Error ${err.response.status}`);
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Unknown communication error';
        setResult({
          stdout: '',
          stderr: `Failed to execute: ${errorMsg}. Verify that the API server is reachable.`,
          exitCode: 1,
          timeMs: 0,
          errorType: 'runtime_error'
        });
        addToast('error', 'Runner is currently unreachable.', 'Connection Error');
      }
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, selectedLanguage.id, currentCode]);

  // Handle continuous input entered directly into the terminal Output screen
  const handleSendInteractiveInput = useCallback(async (newInput: string) => {
    const updatedInputs = [...sessionInputs, newInput];
    setSessionInputs(updatedInputs);
    setIsRunning(true);

    try {
      const response = await axios.post<ExecutionResult>('/api/run', {
        language: selectedLanguage.id,
        code: currentCode,
        stdin: updatedInputs.join('\n') + '\n'
      });

      const waiting = checkWaitingForInput(response.data);
      setIsWaitingForInput(waiting);
      setResult(response.data);
      setApiOnline(true);

      if (!waiting) {
        if (response.data.exitCode === 0) {
          addToast('success', `Completed in ${response.data.timeMs}ms (Exit 0)`, 'Run Succeeded');
        } else if (response.data.errorType === 'runtime_error') {
          addToast('error', `Process exited with code ${response.data.exitCode}`, 'Runtime Error');
        }
      }
    } catch (err: unknown) {
      addToast('error', 'Failed to communicate with runner.', 'Execution Error');
    } finally {
      setIsRunning(false);
    }
  }, [sessionInputs, selectedLanguage.id, currentCode]);

  const handleRestartSession = useCallback(() => {
    setSessionInputs([]);
    setIsWaitingForInput(false);
    handleRunCode();
  }, [handleRunCode]);

  const handleClearSession = useCallback(() => {
    setSessionInputs([]);
    setIsWaitingForInput(false);
    setResult(null);
  }, []);

  // AI Actions Trigger
  const triggerAiAction = useCallback(async (mode: AiMode) => {
    setAiPanelData({
      mode,
      loading: true,
      error: null
    });

    try {
      let endpoint = '/api/ai/explain';
      const payload: { language: string; code: string; stderr?: string } = {
        language: selectedLanguage.id,
        code: currentCode
      };

      if (mode === 'fix') {
        endpoint = '/api/ai/fix';
        payload.stderr = result?.stderr || '';
      } else if (mode === 'comment') {
        endpoint = '/api/ai/comment';
      }

      const res = await axios.post(endpoint, payload);

      setAiPanelData({
        mode,
        loading: false,
        explanation: res.data.explanation,
        fixedCode: res.data.fixedCode,
        diff: res.data.diff,
        commentedCode: res.data.commentedCode
      });
      addToast('info', `AI response generated for ${mode}`, 'AI Assistant');
    } catch (err: unknown) {
      let errorMessage = 'Failed to generate AI response.';
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        errorMessage = err.response.data.error.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setAiPanelData({
        mode,
        loading: false,
        error: errorMessage
      });
      addToast('error', errorMessage, 'AI Request Failed');
    }
  }, [selectedLanguage.id, currentCode, result]);

  const handleApplyAiCode = (newCode: string) => {
    handleCodeChange(newCode);
    addToast('success', 'Changes applied to editor', 'Code Updated');
  };

  // Snippet Sharing Trigger
  const handleShareSnippet = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const res = await axios.post('/api/snippets', {
        language: selectedLanguage.id,
        code: currentCode,
        stdin
      });

      const { url } = res.data;
      setShareModalUrl(url);
      window.history.pushState(null, '', url);
      addToast('success', 'Sharable link created!', 'Snippet Saved');
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) && err.response?.data?.error?.message
        ? err.response.data.error.message
        : 'Failed to share snippet';
      addToast('error', message, 'Share Error');
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, selectedLanguage.id, currentCode, stdin]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl + Enter / Cmd + Enter: Run
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
        return;
      }

      // Ctrl + S / Cmd + S: Share Snippet
      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleShareSnippet();
        return;
      }

      // Ctrl + K / Cmd + K: AI Explain
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        triggerAiAction('explain');
        return;
      }

      // Escape: Close active modals
      if (e.key === 'Escape') {
        setShareModalUrl(null);
        setIsShortcutsOpen(false);
        setAiPanelData(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunCode, handleShareSnippet, triggerAiAction]);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-[#060913] text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Top Header */}
      <Header
        languages={languages}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleLanguageChange}
        onResetCode={handleResetCode}
        onRunCode={handleRunCode}
        isRunning={isRunning}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        apiOnline={apiOnline}
        onExplainCode={() => triggerAiAction('explain')}
        onFixCode={() => triggerAiAction('fix')}
        onCommentCode={() => triggerAiAction('comment')}
        hasStderr={Boolean(result?.stderr && result.stderr.trim().length > 0)}
        aiLoading={Boolean(aiPanelData?.loading)}
        onShareSnippet={handleShareSnippet}
        isSharing={isSharing}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Mobile Screen View Navigation Tab Bar (visible only on < md) */}
      <div className="md:hidden flex items-center justify-around h-10 border-b border-slate-800 bg-slate-900/90 text-xs font-medium">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 h-full flex items-center justify-center space-x-1 border-b-2 transition-colors ${
            mobileTab === 'editor'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>
        <button
          onClick={() => setMobileTab('terminal')}
          className={`flex-1 h-full flex items-center justify-center space-x-1 border-b-2 transition-colors ${
            mobileTab === 'terminal'
              ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Output</span>
          {isWaitingForInput ? (
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          ) : result?.exitCode !== undefined ? (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                result.exitCode === 0 ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          ) : null}
        </button>

        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 h-full flex items-center justify-center space-x-1 border-b-2 transition-colors ${
            mobileTab === 'preview'
              ? 'border-sky-500 text-sky-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>Preview</span>
          {(selectedLanguage.id === 'html' || selectedLanguage.id === 'css') && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Monaco Code Editor */}
        <div
          className={`flex-1 h-full overflow-hidden flex flex-col ${
            mobileTab === 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <Editor
            code={currentCode}
            onChange={handleCodeChange}
            language={selectedLanguage}
            theme={theme}
            onRun={handleRunCode}
          />
        </div>

        {/* Right Side: Output & Web Preview Panels */}
        <div
          className={`w-full md:w-[45%] lg:w-[40%] h-full flex flex-col bg-[#070b14] border-t md:border-t-0 md:border-l border-slate-800/80 relative ${
            mobileTab !== 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Desktop Right Tab Navigation */}
          <div className="hidden md:flex items-center justify-between px-3 h-11 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur shrink-0">
            <div className="flex items-center space-x-1.5">
              {/* Output Tab (Interactive Terminal directly on screen) */}
              <button
                onClick={() => setActiveRightTab('terminal')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeRightTab === 'terminal'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Output</span>
                {isWaitingForInput ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                ) : result?.exitCode !== undefined ? (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      result.exitCode === 0 ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-400'
                    }`}
                  />
                ) : null}
              </button>

              {/* Live Web Preview Tab */}
              <button
                onClick={() => setActiveRightTab('preview')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeRightTab === 'preview'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Web Preview</span>
                {(selectedLanguage.id === 'html' || selectedLanguage.id === 'css') && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse">
                    Live
                  </span>
                )}
              </button>
            </div>

            {aiPanelData && (
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
                <Sparkles className="w-3 h-3" />
                <span>AI Active</span>
              </div>
            )}
          </div>

          {/* Right Pane Display */}
          <div className="flex-1 overflow-hidden relative">
            {/* Interactive Output Terminal Screen */}
            <div
              className={`h-full w-full ${
                activeRightTab === 'terminal' ? 'md:block' : 'md:hidden'
              } ${mobileTab === 'terminal' ? 'block' : 'hidden'}`}
            >
              <OutputPanel
                result={result}
                isRunning={isRunning}
                onClear={handleClearSession}
                onRestart={handleRestartSession}
                onSendInput={handleSendInteractiveInput}
                sessionInputs={sessionInputs}
                isWaitingForInput={isWaitingForInput}
              />
            </div>

            {/* Live Web Preview View */}
            <div
              className={`h-full w-full ${
                activeRightTab === 'preview' ? 'md:block' : 'md:hidden'
              } ${mobileTab === 'preview' ? 'block' : 'hidden'}`}
            >
              <WebPreview
                code={currentCode}
                language={selectedLanguage.id}
              />
            </div>

            {/* AI Assistant Drawer */}
            {aiPanelData && (
              <div className="absolute inset-0 z-30">
                <AiPanel
                  data={aiPanelData}
                  onClose={() => setAiPanelData(null)}
                  onApplyCode={handleApplyAiCode}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={Boolean(shareModalUrl)}
        onClose={() => setShareModalUrl(null)}
        snippetUrl={shareModalUrl || ''}
        languageName={selectedLanguage.name}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
      />
    </div>
  );
}
