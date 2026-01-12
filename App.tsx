import React, { useState, useEffect } from 'react';
import { Activity, Play, RotateCcw, Cpu, AlertTriangle, CheckCircle, BrainCircuit, Trash2, Home } from 'lucide-react';
import { CodeEditor } from './components/CodeEditor';
import { TraceMap } from './components/TraceMap';
import { FlashcardReview } from './components/FlashcardReview';
import { analyzeCode } from './services/geminiService';
import { DiagnosisState, Flashcard } from './types';

const PORTAL_URL = "https://ai-trainer-porama-system.vercel.app/";

const App: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [diagnosisState, setDiagnosisState] = useState<DiagnosisState>({
    status: 'idle',
    result: null,
    error: null,
  });
  
  // Flashcard State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Load flashcards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('code_doctor_flashcards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFlashcards(parsed);
        console.log(`[CodeDoctor] Initialized: Loaded ${parsed.length} flashcards.`);
      } catch (e) {
        console.error("[CodeDoctor] Error parsing saved flashcards:", e);
      }
    } else {
      console.log("[CodeDoctor] Initialized: No saved flashcards found.");
    }
  }, []);

  // Save flashcards whenever they change
  useEffect(() => {
    console.log(`[CodeDoctor] Syncing ${flashcards.length} flashcards to localStorage.`);
    localStorage.setItem('code_doctor_flashcards', JSON.stringify(flashcards));
  }, [flashcards]);

  const handleDiagnose = async () => {
    if (!code.trim()) {
      console.warn("[CodeDoctor] Diagnosis blocked: Empty code input.");
      return;
    }

    console.log("[CodeDoctor] Diagnosis triggered.");
    setDiagnosisState({ status: 'analyzing', result: null, error: null });

    try {
      const result = await analyzeCode(code);
      console.log("[CodeDoctor] Diagnosis complete:", result);
      setDiagnosisState({ status: 'complete', result, error: null });

      // Process new flashcards from the analysis
      if (result.generatedFlashcards && result.generatedFlashcards.length > 0) {
        console.log(`[CodeDoctor] Processing ${result.generatedFlashcards.length} new flashcards.`);
        const newCards: Flashcard[] = result.generatedFlashcards.map((data, index) => ({
          ...data,
          id: `${Date.now()}-${index}`,
          stats: {
            correctStreak: 0,
            incorrectCount: 0,
            status: 'new'
          }
        }));
        
        setFlashcards(prev => [...prev, ...newCards]);
      } else {
        console.log("[CodeDoctor] No new flashcards in response.");
      }

    } catch (err: any) {
      console.error("[CodeDoctor] Diagnosis error:", err);
      setDiagnosisState({
        status: 'error',
        result: null,
        error: err.message || '系统发生未知错误。',
      });
    }
  };

  const reset = () => {
    console.log("[CodeDoctor] Resetting view.");
    setDiagnosisState({ status: 'idle', result: null, error: null });
  };

  const handleUpdateCard = (id: string, isCorrect: boolean) => {
    console.log(`[CodeDoctor] Updating card ${id} - Correct: ${isCorrect}`);
    setFlashcards(prev => prev.map(card => {
      if (card.id !== id) return card;

      let newStats = { ...card.stats };

      if (isCorrect) {
        newStats.correctStreak += 1;
        // If 3 consecutive correct answers, mark as mastered
        if (newStats.correctStreak >= 3) {
          newStats.status = 'mastered';
          console.log(`[CodeDoctor] Card ${id} mastered!`);
        } else {
          newStats.status = 'learning';
        }
      } else {
        newStats.correctStreak = 0; // Reset streak
        newStats.incorrectCount += 1;
        // If 3 total errors, mark as critical
        if (newStats.incorrectCount >= 3) {
          newStats.status = 'critical';
          console.log(`[CodeDoctor] Card ${id} marked critical.`);
        }
      }

      return { ...card, stats: newStats };
    }));
  };
  
  const clearMasteredCards = () => {
    const countBefore = flashcards.length;
    setFlashcards(prev => prev.filter(c => c.stats.status !== 'mastered'));
    console.log(`[CodeDoctor] Cleared mastered cards. Count reduced from ${countBefore} to ${flashcards.length}.`);
  };

  const activeCardsCount = flashcards.filter(c => c.stats.status !== 'mastered').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 lg:p-8 font-sans bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20">
      
      {isReviewMode && (
        <FlashcardReview 
          cards={flashcards} 
          onClose={() => {
            console.log("[CodeDoctor] Closing review mode.");
            setIsReviewMode(false);
          }}
          onUpdateCard={handleUpdateCard}
        />
      )}

      <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Activity className="text-neon-green" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                CODE <span className="text-neon-green">DOCTOR</span>
              </h1>
              <p className="text-slate-500 text-sm font-mono">AI 逻辑溯源系统 // v1.1.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Flashcard Button */}
             <div className="relative">
                <button 
                  onClick={() => {
                    if (activeCardsCount > 0) {
                      console.log("[CodeDoctor] Opening review mode.");
                      setIsReviewMode(true);
                    }
                  }}
                  disabled={activeCardsCount === 0}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-bold
                    ${activeCardsCount > 0 
                      ? 'bg-slate-900 border-neon-blue text-neon-blue hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                      : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'}
                  `}
                >
                  <BrainCircuit size={16} />
                  <span>错题闪卡</span>
                  {activeCardsCount > 0 && (
                    <span className="bg-neon-blue text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {activeCardsCount}
                    </span>
                  )}
                </button>
             </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="hidden md:block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
                系统状态: 在线
              </div>
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[600px]">
          
          {/* Left Column: Input */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 tracking-wider flex items-center gap-2">
                <Cpu size={16} /> 输入终端 (INPUT TERMINAL)
              </h2>
            </div>
            
            <div className="flex-1 min-h-[400px]">
              <CodeEditor 
                value={code} 
                onChange={setCode} 
                isAnalyzing={diagnosisState.status === 'analyzing'}
              />
            </div>

            <button
              onClick={handleDiagnose}
              disabled={diagnosisState.status === 'analyzing' || !code.trim()}
              className={`
                relative w-full py-4 rounded-xl font-bold tracking-widest transition-all duration-300 overflow-hidden group
                ${diagnosisState.status === 'analyzing' 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                  : 'bg-neon-green hover:bg-emerald-400 text-slate-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400'}
              `}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {diagnosisState.status === 'analyzing' ? (
                  <>
                    <RotateCcw className="animate-spin" size={20} />
                    正在诊断逻辑...
                  </>
                ) : (
                  <>
                    <Play fill="currentColor" size={20} />
                    启动扫描
                  </>
                )}
              </span>
            </button>
          </section>

          {/* Right Column: Analysis */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-400 tracking-wider flex items-center gap-2">
                <Activity size={16} /> 诊断报告 (DIAGNOSTIC REPORT)
              </h2>
              {diagnosisState.status === 'complete' && (
                 <button onClick={reset} className="text-xs text-slate-500 hover:text-white underline decoration-slate-700 underline-offset-4">
                   重置视图
                 </button>
              )}
            </div>

            <div className={`
              flex-1 rounded-xl border p-6 overflow-y-auto max-h-[800px] transition-all duration-500 scroll-smooth
              ${diagnosisState.status === 'idle' ? 'bg-slate-900/30 border-slate-800 border-dashed flex items-center justify-center' : 'glass-panel border-slate-700/50'}
            `}>
              
              {diagnosisState.status === 'idle' && (
                <div className="text-center text-slate-600">
                  <Cpu size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-mono text-sm">等待输入流...</p>
                  {flashcards.length > 0 && (
                    <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-w-sm">
                      <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">错题集数据</h4>
                      <div className="flex justify-between text-sm">
                         <span>待复习: <span className="text-neon-blue">{activeCardsCount}</span></span>
                         <span>已掌握: <span className="text-emerald-500">{flashcards.length - activeCardsCount}</span></span>
                      </div>
                      {flashcards.length - activeCardsCount > 0 && (
                        <button onClick={clearMasteredCards} className="mt-2 text-xs text-slate-500 hover:text-rose-500 flex items-center gap-1">
                          <Trash2 size={10} /> 清理已掌握卡片
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {diagnosisState.status === 'analyzing' && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-neon-green rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-neon-green font-mono text-sm animate-pulse">正在追踪逻辑流</p>
                    <p className="text-slate-500 text-xs">解析 AST... 提取病灶... 生成闪卡...</p>
                  </div>
                </div>
              )}

              {diagnosisState.status === 'error' && (
                 <div className="flex flex-col items-center justify-center h-full text-center p-8">
                   <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                     <AlertTriangle className="text-rose-500" size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2">系统故障</h3>
                   <p className="text-rose-300/80 mb-6">{diagnosisState.error}</p>
                   <button onClick={handleDiagnose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-mono border border-slate-700 transition-colors">
                     重试连接
                   </button>
                 </div>
              )}

              {diagnosisState.status === 'complete' && diagnosisState.result && (
                <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                  {/* Summary Card */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 border-l-4 border-l-neon-green border-y border-r border-slate-700 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">诊断摘要</h3>
                        <p className="text-lg text-slate-100 font-medium leading-relaxed">
                          {diagnosisState.result.rawError}
                        </p>
                      </div>
                      {diagnosisState.result.generatedFlashcards && diagnosisState.result.generatedFlashcards.length > 0 && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded px-3 py-2 flex flex-col items-center">
                           <BrainCircuit className="text-neon-blue mb-1" size={18} />
                           <span className="text-[10px] text-blue-300 font-bold">+{diagnosisState.result.generatedFlashcards.length} 闪卡</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* The Metro Map */}
                  <div className="relative">
                    <TraceMap trace={diagnosisState.result.trace} />
                  </div>
                  
                  {/* Final Status */}
                  <div className="flex items-center justify-center pt-8 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-mono">
                       <CheckCircle size={14} />
                       <span>分析完成_时间戳_{Date.now()}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>
        </main>
      </div>

      <a
        href={PORTAL_URL}
        className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:-translate-y-1 group flex items-center gap-0 hover:gap-2 overflow-hidden border border-white/20"
        title="返回备考系统门户"
      >
        <Home className="w-6 h-6" />
        <span className="max-w-0 group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100 text-sm font-bold">
          返回门户
        </span>
      </a>
    </div>
  );
};

export default App;