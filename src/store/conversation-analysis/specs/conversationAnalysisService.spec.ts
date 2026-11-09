import { apiService } from '@/services/APIService';
import { ConversationAnalysisService } from '../conversationAnalysisService';

jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn(), post: jest.fn() },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('ConversationAnalysisService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the account-scoped conversation analysis endpoints', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { payload: null } } as never);
    mockedApi.post.mockResolvedValueOnce({ data: { payload: { id: 1 } } } as never);
    mockedApi.post.mockResolvedValueOnce({ data: { payload: { id: 1, care: {} } } } as never);

    await expect(ConversationAnalysisService.get(42)).resolves.toBeNull();
    await expect(ConversationAnalysisService.create(42)).resolves.toEqual({ id: 1 });
    await expect(ConversationAnalysisService.createCareSuggestion(42)).resolves.toEqual({
      id: 1,
      care: {},
    });

    expect(mockedApi.get).toHaveBeenCalledWith('conversations/42/analysis');
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, 'conversations/42/analysis');
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, 'conversations/42/analysis/care_suggestion');
  });

  it('exposes report and opportunity queries', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { payload: { averageScore: 80 } } } as never)
      .mockResolvedValueOnce({ data: { payload: [], meta: { count: 0 } } } as never);

    await ConversationAnalysisService.getReport({ inbox_id: 3 });
    await ConversationAnalysisService.getOpportunities({ interest_levels: 'high' });

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, 'conversation_analyses/report', {
      params: { inbox_id: 3 },
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, 'conversation_analyses/opportunities', {
      params: { interest_levels: 'high' },
    });
  });
});
