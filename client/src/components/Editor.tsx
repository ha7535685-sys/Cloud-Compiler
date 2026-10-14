import React, { useRef } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import { FileCode, Braces } from 'lucide-react';
import { LanguageConfig, ThemeMode } from '../types';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  language: LanguageConfig;
  theme: ThemeMode;
  onRun: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  language,
  theme,
  onRun
}) => {
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Register Ctrl+Enter / Cmd+Enter shortcut inside editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current();
    });
  };

  const lineCount = (code.match(/\n/g) || []).length + 1;
  const charCount = code.length;

  return (
    <div className="flex flex-col h-full w-full bg-[#080d1a] overflow-hidden border-r border-slate-800/80">
      {/* Editor Tab & Status Sub-header */}
      <div className="h-10 px-4 bg-slate-900/70 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 select-none">
        {/* Active File Tab */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-800/70 text-slate-200 border border-slate-700/50 shadow-sm">
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-xs font-semibold">{language.fileName}</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-800/30 px-2 py-0.5 rounded border border-slate-800">
            {language.name}
          </span>
        </div>

        {/* Editor Stats */}
        <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
          <div className="hidden sm:flex items-center space-x-1 text-slate-400">
            <Braces className="w-3.5 h-3.5 text-slate-500" />
            <span>Auto-indent</span>
          </div>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span>{lineCount} lines</span>
          <span className="text-slate-700">•</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full h-full relative">
        <MonacoEditor
          height="100%"
          language={language.monacoLanguage}
          value={code}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            tabSize: 4,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            },
            autoIndent: 'advanced',
            formatOnPaste: true,
            formatOnType: true,
            minimap: { enabled: false },
            padding: {
              top: 14,
              bottom: 14
            },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on'
          }}
        />
      </div>
    </div>
  );
};
