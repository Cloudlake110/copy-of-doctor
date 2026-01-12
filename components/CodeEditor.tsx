import React, { useRef, useState, useEffect } from 'react';
import { Terminal, Eraser } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  isAnalyzing: boolean;
}

// Lightweight Python Syntax Highlighter Logic
const highlightPython = (code: string) => {
  if (!code) return null;

  // Split by strings and comments first.
  // This preserves the logic that we don't highlight keywords inside strings/comments.
  const tokens = code.split(/(".*?"|'.*?'|#.*$)/gm);
  
  const keywordsList = "def|class|return|if|else|elif|for|while|import|from|try|except|print|in|is|not|and|or|True|False|None|as|with|pass|break|continue|global|lambda|yield".split('|');
  const keywordsSet = new Set(keywordsList);

  // Regex construction:
  // We need to match keywords, numbers, or identifiers followed by (.
  // Order: Keywords (highest priority), Function Calls, Numbers.
  // Note: We use non-capturing groups (?:) inside the alternatives, 
  // but wrap the WHOLE thing in one capturing group for .split() to retain it.
  const syntaxRegex = new RegExp(
    `(` +
    `\\b(?:${keywordsList.join('|')})\\b` + // Keywords
    `|` +
    `\\b[a-zA-Z_][a-zA-Z0-9_]*(?=\\()` + // Function calls
    `|` +
    `\\b\\d+\\b` + // Numbers
    `)`,
    'g'
  );

  return tokens.map((token, index) => {
    // 1. Strings (Green)
    if (token.startsWith('"') || token.startsWith("'")) {
       return <span key={index} className="text-emerald-400">{token}</span>;
    }
    // 2. Comments (Gray Italic)
    if (token.startsWith('#')) {
       return <span key={index} className="text-slate-500 italic">{token}</span>;
    }

    // 3. Code
    // Split by syntax elements using the capturing group regex
    const parts = token.split(syntaxRegex);
    
    const highlightedParts = parts.map((part, partIndex) => {
       // Even indices: plain text (delimiters, whitespace, non-highlighted identifiers)
       // Odd indices: matches (keywords, numbers, function calls)
       if (partIndex % 2 === 0) {
          // Escape HTML for safety
          return part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
       } else {
          // Identify what type of match it is
          if (keywordsSet.has(part)) {
             return `<span class="text-pink-400 font-bold">${part}</span>`;
          }
          if (/^\d+$/.test(part)) {
             return `<span class="text-amber-400">${part}</span>`;
          }
          // Default to function call for other matches (identifiers followed by '(')
          // Note: The regex for function calls matches the identifier but NOT the '('. 
          // The '(' remains in the 'next' even part.
          return `<span class="text-cyan-400">${part}</span>`;
       }
    }).join('');

    return <span key={index} dangerouslySetInnerHTML={{ __html: highlightedParts }} />;
  });
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, isAnalyzing }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Sync line count on value change
  useEffect(() => {
    setLineCount(value.split('\n').length);
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '    '; // 4 spaces for Python

      const newValue = value.substring(0, start) + spaces + value.substring(end);
      onChange(newValue);

      // Move caret
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const handleClear = () => {
    onChange('');
    setLineCount(1);
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-xl overflow-hidden shadow-2xl shadow-black/50 border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-neon-blue">
          <Terminal size={18} />
          <span className="font-mono text-sm font-bold tracking-wider">SOURCE_INPUT.py</span>
        </div>
        <button 
          onClick={handleClear}
          className="text-slate-500 hover:text-slate-300 transition-colors text-xs flex items-center gap-1"
          disabled={isAnalyzing}
        >
          <Eraser size={14} />
          清空
        </button>
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 bg-slate-950 font-mono text-sm overflow-hidden group">
        
        {/* Line Numbers Sidebar */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900/50 border-r border-slate-800 text-right pr-3 pt-4 text-slate-600 select-none font-mono leading-6 z-20">
          {Array.from({ length: Math.max(lineCount, 15) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* 
            The Overlay Strategy:
            1. <pre>: Renders the highlighted code. Pointer events disabled.
            2. <textarea>: Renders transparent text. Handles input and caret.
            Both must have EXACT matching padding, margin, font, and line-height.
        */}
        
        {/* Layer 1: Syntax Highlighting (Background) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 pl-14 pr-4 pt-4 w-full h-full bg-transparent resize-none leading-6 pointer-events-none whitespace-pre-wrap break-all overflow-hidden text-slate-300 font-mono"
        >
          {highlightPython(value)}
          {/* Add a break at the end to ensure newlines are rendered correctly in pre */}
          <br />
        </pre>

        {/* Layer 2: Input (Foreground) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          disabled={isAnalyzing}
          placeholder="# 在此粘贴 Python 代码...&#10;def hello():&#10;    print('你好，世界')"
          className="absolute inset-0 pl-14 pr-4 pt-4 w-full h-full bg-transparent resize-none text-transparent caret-white focus:outline-none focus:ring-0 leading-6 z-10 font-mono selection:bg-neon-blue/30 selection:text-transparent"
        />
      </div>
    </div>
  );
};