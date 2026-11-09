import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components-next';
import { BottomSheetHeader } from '@/components-next';
import { Sheet, type SheetRef } from '@/components-next/common/sheet/Sheet';
import { tailwind } from '@/theme';
import { showToast } from '@/utils/toastUtils';
import { ConversationAnalysisService } from '@/store/conversation-analysis/conversationAnalysisService';
import type { ConversationAnalysis } from '@/store/conversation-analysis/conversationAnalysisTypes';

type Props = {
  conversationId: number;
  visible: boolean;
  onClose: () => void;
};

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value))
    return value
      .map(item => stringify(item))
      .filter(Boolean)
      .join(', ');
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key.replaceAll('_', ' ')}: ${stringify(item)}`)
    .filter(Boolean)
    .join('\n');
};

export const ConversationAnalysisSheet = ({ conversationId, visible, onClose }: Props) => {
  const sheetRef = useRef<SheetRef>(null);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalysis(await ConversationAnalysisService.get(conversationId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load analysis');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
      load();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [load, visible]);

  const run = async (careSuggestion = false) => {
    setWorking(true);
    setError(null);
    try {
      const next = careSuggestion
        ? await ConversationAnalysisService.createCareSuggestion(conversationId)
        : await ConversationAnalysisService.create(conversationId);
      setAnalysis(next);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Analysis failed';
      setError(message);
      showToast({ message });
    } finally {
      setWorking(false);
    }
  };

  const criteria = useMemo(() => Object.entries(analysis?.quality || {}), [analysis]);

  return (
    <Sheet ref={sheetRef} detents={[0.9]} scrollable onDismiss={onClose}>
      <BottomSheetHeader headerText="Conversation analysis" />
      <ScrollView contentContainerStyle={tailwind.style('px-4 pb-10 gap-4')}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={tailwind.style('text-ruby-800 text-sm')}>{error}</Text> : null}
        {!loading && !analysis ? (
          <Button
            text={working ? 'Analyzing…' : 'Analyze conversation'}
            handlePress={() => run()}
            disabled={working}
          />
        ) : null}
        {analysis ? (
          <View style={tailwind.style('gap-4')}>
            <View style={tailwind.style('rounded-xl bg-gray-50 p-4 gap-1')}>
              <Text style={tailwind.style('text-lg font-inter-medium-24 text-gray-950')}>
                Quality score: {analysis.qualityScore ?? '—'}/100
              </Text>
              <Text style={tailwind.style('text-sm text-gray-700')}>
                Interest: {stringify(analysis.insight?.interestLevel) || 'unknown'}
              </Text>
              <Text style={tailwind.style('text-sm text-gray-700')}>
                Sentiment: {stringify(analysis.insight?.sentiment) || 'unknown'}
              </Text>
            </View>
            {(['customer', 'insight', 'conversationState', 'care'] as const).map(key => {
              const value = analysis[key];
              if (!value || !stringify(value)) return null;
              return (
                <View key={key} style={tailwind.style('gap-1')}>
                  <Text
                    style={tailwind.style(
                      'text-base font-inter-medium-24 text-gray-950 capitalize',
                    )}>
                    {key.replaceAll(/([A-Z])/g, ' $1')}
                  </Text>
                  <Text style={tailwind.style('text-sm leading-[20px] text-gray-800')}>
                    {stringify(value)}
                  </Text>
                </View>
              );
            })}
            {criteria.length ? (
              <View style={tailwind.style('gap-2')}>
                <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                  Quality criteria
                </Text>
                {criteria.map(([key, value]) => (
                  <View
                    key={key}
                    style={tailwind.style(
                      'flex-row justify-between border-b border-gray-200 py-2',
                    )}>
                    <Text style={tailwind.style('text-sm text-gray-800 capitalize')}>{key}</Text>
                    <Text style={tailwind.style('text-sm text-gray-950')}>
                      {value.score ?? '—'}/5
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={tailwind.style('gap-2')}>
              <Button
                text={working ? 'Working…' : 'Re-analyze'}
                handlePress={() => run()}
                disabled={working}
              />
              <Button
                text={working ? 'Working…' : 'Generate care suggestion'}
                variant="secondary"
                handlePress={() => run(true)}
                disabled={working}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
};
