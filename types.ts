export type TraceStatus = 'success' | 'warning' | 'error';

export interface TraceStep {
  status: TraceStatus;
  title: string;
  desc: string;
  isError: boolean;
  badCode?: string;
  goodCode?: string;
  errorHighlight?: string; // The specific substring to highlight in badCode
  reason?: string;
  tip?: string;
}

export interface FlashcardData {
  concept: string; // 抽象出的概念，如 "DataFrame 索引"
  frontCode: string; // 病灶代码
  errorHighlight?: string; // 病灶代码中的高亮部分
  backCode: string; // 正确代码
  explanation: string; // 解释
}

export interface Flashcard extends FlashcardData {
  id: string;
  stats: {
    correctStreak: number; // 连续正确次数
    incorrectCount: number; // 累积错误次数
    status: 'new' | 'learning' | 'critical' | 'mastered';
  };
}

export interface DiagnosisResponse {
  rawError: string;
  trace: TraceStep[];
  generatedFlashcards?: FlashcardData[]; // AI 生成的原始闪卡数据
}

export interface DiagnosisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  result: DiagnosisResponse | null;
  error: string | null;
}