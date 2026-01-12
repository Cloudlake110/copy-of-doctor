import React from 'react';
import { TraceStep } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Lightbulb, GitCommit } from 'lucide-react';

interface TraceMapProps {
  trace: TraceStep[];
}

// Helper component for highlighting text
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

const TraceNode: React.FC<{ step: TraceStep; isLast: boolean; index: number }> = ({ step, isLast, index }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'warning': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'error': return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
      default: return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '通过';
      case 'warning': return '警告';
      case 'error': return '错误';
      default: return '未知';
    }
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'error': return <XCircle size={18} />;
      default: return <GitCommit size={18} />;
    }
  };

  const borderColor = step.status === 'error' ? 'border-rose-500/50' : 'border-slate-700';
  const nodeClass = getStatusColor(step.status);

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-slate-800"></div>
      )}

      {/* Node Icon */}
      <div className={`absolute left-2 top-0 w-6 h-6 rounded-full flex items-center justify-center border ${step.status === 'error' ? 'animate-pulse' : ''} bg-slate-900 z-10 ${step.status === 'success' ? 'text-emerald-500 border-emerald-500' : step.status === 'error' ? 'text-rose-500 border-rose-500' : 'text-amber-500 border-amber-500'}`}>
        {step.status === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
        {step.status === 'warning' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
        {step.status === 'error' && <div className="w-2 h-2 rounded-full bg-rose-500" />}
      </div>

      {/* Content Card */}
      <div className={`glass-panel rounded-lg p-4 border ${borderColor} transition-all duration-500 ease-out transform translate-y-0 opacity-100`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${nodeClass}`}>
              步骤 {index + 1}: {getStatusText(step.status)}
            </span>
          </div>
          {getIcon(step.status)}
        </div>

        <h3 className="text-lg font-bold text-slate-100 mb-1">{step.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-3">{step.desc}</p>

        {/* Comparison View for Errors */}
        {step.isError && step.badCode && step.goodCode && (
          <div className="mt-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-950/50">
            <div className="grid grid-cols-1 md:grid-cols-2 text-sm font-mono divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="p-3 bg-rose-950/20 text-rose-300">
                <div className="flex items-center gap-2 mb-1 text-rose-500 text-xs font-bold uppercase">
                  <XCircle size={12} /> 病灶代码 (Pathology)
                </div>
                <div className="opacity-90 whitespace-pre-wrap">
                  <HighlightedCode code={step.badCode} highlight={step.errorHighlight} />
                </div>
              </div>
              <div className="p-3 bg-emerald-950/20 text-emerald-300">
                <div className="flex items-center gap-2 mb-1 text-emerald-500 text-xs font-bold uppercase">
                  <CheckCircle2 size={12} /> 修复方案 (Fix)
                </div>
                <div className="opacity-90 whitespace-pre-wrap">{step.goodCode}</div>
              </div>
            </div>
          </div>
        )}

        {/* Reason & Tips */}
        {(step.reason || step.tip) && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
            {step.reason && (
              <div className="text-xs text-slate-400 flex items-start gap-2">
                 <span className="font-bold text-slate-500 shrink-0">原因:</span>
                 {step.reason}
              </div>
            )}
            {step.tip && (
              <div className="text-xs text-neon-blue flex items-start gap-2 bg-blue-950/30 p-2 rounded border border-blue-900/50">
                 <Lightbulb size={14} className="shrink-0 mt-0.5" />
                 <span className="italic">"{step.tip}"</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const TraceMap: React.FC<TraceMapProps> = ({ trace }) => {
  return (
    <div className="relative py-2">
      {trace.map((step, index) => (
        <TraceNode 
          key={index} 
          step={step} 
          index={index} 
          isLast={index === trace.length - 1} 
        />
      ))}
    </div>
  );
};