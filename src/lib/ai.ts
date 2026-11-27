import { useState, useCallback } from 'react';

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

interface AIResponse {
  response: string;
  provider: string;
  errors?: string[];
}

export function useAIAssistant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (prompt: string, context?: string): Promise<AIResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      if (!resp.ok) {
        throw new Error(`AI assistant error: ${resp.status}`);
      }

      const data: AIResponse = await resp.json();
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ في الاتصال';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { ask, loading, error };
}
