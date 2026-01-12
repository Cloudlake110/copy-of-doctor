import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, BrainCircuit, AlertTriangle, Trophy } from 'lucide-react';
import { Flashcard } from '../types';

interface FlashcardReviewProps {
  cards: Flashcard[];
  onClose: () => void;
  onUpdateCard: (id: string, isCorrect: boolean) => void;
}

// Helper for highlighting text (reused logic)
const HighlightedCode = ({ code, highlight }: { code: string, highlight?: string }) => {
  if (!highlight || !code.includes(highlight)) return <>{code}</>;
  
  const parts = code.split(highlight);
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="bg-rose-500/30 text-rose-100 font-bold px-1 rounded mx-0.5 border-b-2 border-rose-500 decoration-wavy underline decoration-rose-400">
              {highlight}
            </span>
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({ cards, onClose, onUpdateCard }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);
  
  // Filter out mastered cards for the review session, but we still need to handle empty states
  const activeCards = cards.filter(c => c.stats.status !== 'mastered');
  
  const currentCard = activeCards[currentIndex];

  useEffect(() => {
    // Reset state when card changes
    setUserInput('');
    setShowResult(null);
  }, [currentIndex, activeCards.length]);

  if (activeCards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-2xl text-center border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="text-emerald-400 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">挑战完成！</h2>
          <p className="text-slate-400 mb-8">所有的错题都已被你攻克。</p>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-slate-700"
          >
            返回主控台
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  const handleCheck = () => {
    // Simple normalization: remove whitespace to compare logic
    const normalize = (str: string) => str.replace(/\s+/g, '').trim();
    const isCorrect = normalize(userInput) === normalize(currentCard.backCode);
    
    console.log(`[CodeDoctor] Card Review - Concept: "${currentCard.concept}" | Result: ${isCorrect ? 'PASS' : 'FAIL'}`);

    setShowResult(isCorrect ? 'correct' : 'incorrect');
    onUpdateCard(currentCard.id, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Loop back or finish? Let's loop for now if there are still cards
      setCurrentIndex(0);
    }
    setShowResult(null);
    setUserInput('');
  };

  const isCritical = currentCard.stats.status === 'critical';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="absolute top-6 right-6">
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className={`
        relative w-full max-w-2xl bg-slate-900 rounded-2xl overflow-hidden border transition-colors duration-500 shadow-2xl
        ${isCritical ? 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'border-slate-700 shadow-black/50'}
      `}>
        
        {/* Progress Bar */}
        <div className="h-1 bg-slate-800 w-full">
          <div 
            className="h-full bg-neon-blue transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / activeCards.length) * 100}%` }}
          />
        </div>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isCritical ? 'bg-rose-950/30 text-rose-400 border-rose-500/30' : 'bg-blue-950/30 text-blue-400 border-blue-500/30'}`}>
                  {isCritical ? 'CRITICAL_MODE' : 'CONCEPT_CARD'}
                </span>
                <span className="text-slate-500 text-xs font-mono">
                  {currentIndex + 1} / {activeCards.length}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <BrainCircuit size={24} className={isCritical ? 'text-rose-500' : 'text-neon-blue'} />
                {currentCard.concept}
              </h2>
            </div>
            
            {/* Stats */}
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full border border-slate-700 ${i < currentCard.stats.correctStreak ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-800'}`}
                />
              ))}
            </div>
          </div>

          {/* Challenge Area */}
          <div className="space-y-6">
            {/* The "Bad" Code */}
            <div className="bg-slate-950/50 rounded-lg p-4 border border-rose-900/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 px-2 py-1 bg-rose-950/50 text-rose-500 text-[10px] font-mono border-bl rounded-bl">PATHOLOGY</div>
              <pre className="font-mono text-sm text-rose-200/80 whitespace-pre-wrap">
                <HighlightedCode code={currentCard.frontCode} highlight={currentCard.errorHighlight} />
              </pre>
            </div>

            {/* User Input Area */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                修复代码 (输入正确逻辑)
              </label>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={showResult !== null}
                onKeyDown={(e) => e.key === 'Enter' && !showResult && handleCheck()}
                className={`
                  w-full bg-slate-800/50 border rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none transition-all
                  ${showResult === 'correct' ? 'border-emerald-500 bg-emerald-500/10' : 
                    showResult === 'incorrect' ? 'border-rose-500 bg-rose-500/10' : 
                    'border-slate-700 focus:border-neon-blue focus:bg-slate-800'}
                `}
                placeholder="在此输入修复后的代码..."
                autoFocus
              />
              
              {/* Feedback Overlay */}
              {showResult && (
                <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 animate-[slideDown_0.2s_ease-out]">
                  <div className="flex items-start gap-3">
                    {showResult === 'correct' ? (
                      <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-500">
                        <Check size={20} />
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-500/20 rounded-full text-rose-500">
                        <X size={20} />
                      </div>
                    )}
                    <div>
                      <h4 className={`font-bold mb-1 ${showResult === 'correct' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {showResult === 'correct' ? '逻辑修复成功！' : '修复失败'}
                      </h4>
                      <p className="text-sm text-slate-400 leading-relaxed mb-2">
                        {currentCard.explanation}
                      </p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                         <span className="text-xs text-slate-500 block mb-1">参考答案:</span>
                         <code className="text-emerald-400 font-mono text-sm">{currentCard.backCode}</code>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleNext}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    下一张 <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons (Only show if result not shown) */}
            {!showResult && (
              <button
                onClick={handleCheck}
                disabled={!userInput.trim()}
                className="w-full py-3 bg-neon-blue hover:bg-blue-400 text-slate-950 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                验证修复方案
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};