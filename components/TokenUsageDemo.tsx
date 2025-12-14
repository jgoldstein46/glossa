'use client';

import { useState } from 'react';

export default function TokenUsageDemo() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [usage, setUsage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult('');
    setUsage(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      
      if (data.text) {
        setResult(data.text);
        setUsage(data.usage);
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (e) {
      alert('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-gray-50 dark:bg-gray-900 mt-8 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Flowglad AI Token Payment Demo</h2>
      <p className="mb-4 text-sm text-gray-600">
        Enter a prompt below. The system will mock an AI response, calculate token usage, and report it to Flowglad for billing.
      </p>
      
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 p-2 border rounded"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask something..."
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 transition"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border">
          <p className="whitespace-pre-wrap">{result}</p>
          <div className="mt-2 text-xs text-green-600 font-semibold">
            Tracked Usage: {usage} tokens
          </div>
        </div>
      )}
    </div>
  );
}
