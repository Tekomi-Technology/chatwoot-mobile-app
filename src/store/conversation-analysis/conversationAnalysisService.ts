import { apiService } from '@/services/APIService';
import type {
  ConversationAnalysis,
  ConversationAnalysisApiResponse,
  ConversationAnalysisListResponse,
  ConversationAnalysisReportResponse,
} from './conversationAnalysisTypes';

export class ConversationAnalysisService {
  static async get(conversationId: number): Promise<ConversationAnalysis | null> {
    const response = await apiService.get<ConversationAnalysisApiResponse>(
      `conversations/${conversationId}/analysis`,
    );
    return response.data.payload;
  }

  static async create(conversationId: number): Promise<ConversationAnalysis> {
    const response = await apiService.post<ConversationAnalysisApiResponse>(
      `conversations/${conversationId}/analysis`,
    );
    if (!response.data.payload) throw new Error('Analysis was not returned by the server');
    return response.data.payload;
  }

  static async createCareSuggestion(conversationId: number): Promise<ConversationAnalysis> {
    const response = await apiService.post<ConversationAnalysisApiResponse>(
      `conversations/${conversationId}/analysis/care_suggestion`,
    );
    if (!response.data.payload) throw new Error('Care suggestion was not returned by the server');
    return response.data.payload;
  }

  static async getByContact(contactId: number) {
    const response = await apiService.get<ConversationAnalysisListResponse>(
      `contacts/${contactId}/conversation_analyses`,
    );
    return response.data;
  }

  static async getReport(params?: Record<string, string | number>) {
    const response = await apiService.get<ConversationAnalysisReportResponse>(
      'conversation_analyses/report',
      { params },
    );
    return response.data.payload;
  }

  static async getOpportunities(params?: Record<string, string | number>) {
    const response = await apiService.get<ConversationAnalysisListResponse>(
      'conversation_analyses/opportunities',
      { params },
    );
    return response.data;
  }
}
