export type ConversationAnalysis = {
  id: number;
  conversationId: number;
  servedBy?: string;
  qualityScore?: number | null;
  quality?: Record<string, { score?: number; explanation?: string }>;
  customer?: Record<string, unknown>;
  insight?: Record<string, unknown>;
  conversationState?: Record<string, unknown>;
  care?: Record<string, unknown>;
  analyzedBy?: { id?: number; name?: string };
  updatedAt?: number;
};

type AnalysisResponse = { payload: ConversationAnalysis | null };

export type ConversationAnalysisListResponse = {
  payload: ConversationAnalysis[];
  meta?: { count?: number; currentPage?: number };
};

export type ConversationAnalysisReport = {
  analyzedCount?: number;
  averageScore?: number;
  criteria?: Record<string, unknown>;
  servedBy?: Record<string, unknown>;
  agents?: Record<string, unknown>;
  lowScores?: ConversationAnalysis[];
};

export type ConversationAnalysisReportResponse = { payload: ConversationAnalysisReport };
export type ConversationAnalysisApiResponse = AnalysisResponse;
