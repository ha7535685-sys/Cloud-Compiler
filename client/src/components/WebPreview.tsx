import React, { useState, useMemo, useRef } from 'react';
import {
  RotateCcw,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface WebPreviewProps {
  code: string;
  language: string;
}

export const WebPreview: React.FC<WebPreviewProps> = ({ code, language }) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate complete HTML string based on whether code is raw HTML or CSS
  const previewHtml = useMemo(() => {
    if (language === 'css') {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
${code}
  </style>
</head>
<body>
  <div class="showcase-box">
    <h1>🎨 CSS Showcase Preview</h1>
    <p>Your styles are dynamically injected into this preview canvas.</p>
    <button style="padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Interactive Element</button>
  </div>
</body>
</html>`;
    }

    // If HTML already has full document structure, use it directly
    if (code.includes('<html') || code.includes('<!DOCTYPE') || code.includes('<body')) {
      return code;
    }

    // Wrap bare HTML snippets
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 1.5rem; background: #0f172a; color: #f8fafc; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
  }, [code, language]);

  const handleOpenInNewTab = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getDeviceWidthClass = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'w-[375px] max-w-full';
      case 'tablet':
        return 'w-[768px] max-w-full';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050811] overflow-hidden select-none">
      {/* Web Preview Subheader Toolbar */}
      <div className="h-10 px-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
        {/* Device Switcher */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setDeviceMode('desktop')}
              title="Desktop View (100%)"
              className={`p-1 rounded ${
                deviceMode === 'desktop' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              title="Tablet View (768px)"
              className={`p-1 rounded ${
                deviceMode === 'tablet' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              title="Mobile View (375px)"
              className={`p-1 rounded ${
                deviceMode === 'mobile' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3 w-px bg-slate-800 mx-1 hidden sm:block" />

          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-slate-300">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">Live Browser Canvas</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Interactive</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setRefreshKey((prev) => prev + 1)}
            title="Reload Web Canvas"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleOpenInNewTab}
            title="Open in Full Browser Tab"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Open Tab</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 overflow-auto p-3 flex justify-center items-stretch bg-[#050811]">
        <div className={`h-full ${getDeviceWidthClass()} transition-all duration-200 shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-white flex flex-col`}>
          <iframe
            key={refreshKey}
            ref={iframeRef}
            srcDoc={previewHtml}
            title="HTML/CSS Live Sandbox Preview"
            sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
            className="w-full h-full border-none bg-white select-auto"
          />
        </div>
      </div>
    </div>
  );
};
