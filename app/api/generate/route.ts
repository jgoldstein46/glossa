import { flowglad } from '@/lib/flowglad';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // In a real app, require auth. 
    // For demo/hackathon purposes, we might allow fallback or error.
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    // Initialize Flowglad client for this user
    // The lib/flowglad factory now handles fetching details using the passed ID/context logic if needed,
    // or we pass the ID and it fetches details internally as defined.
    const client = flowglad(user.id);

    // Mock AI Generation Logic
    const generatedText = `[AI Generated] This is a response to: "${prompt}".`;
    const tokenCount = Math.ceil(generatedText.length / 4);

    // Track usage
    try {
      // With the specific FlowgladServer setup, we use the client instance directly.
      // The `createUsageEvent` method in the specialized client handles customer lookup/creation internally
      // based on the configuration provided in lib/flowglad.ts
      await client.createUsageEvent({
        priceSlug: 'ai_tokens',
        amount: tokenCount,
        subscriptionId: 'sub_placeholder_for_demo', // In production, fetch user's active subscription ID
        transactionId: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });
    } catch (err) {
      console.error('Failed to report usage to Flowglad:', err);
    }

    return NextResponse.json({ 
      text: generatedText,
      usage: tokenCount
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
