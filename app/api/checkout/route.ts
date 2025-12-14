import { flowglad } from '@/lib/flowglad';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { priceId, priceSlug, successUrl, cancelUrl } = await req.json();

    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Flowglad client
    const client = flowglad(user.id);

    // Create checkout session
    // Note: params must match CreateProductCheckoutSessionParams (XOR: priceId OR priceSlug)
    const sessionParams: { 
        successUrl: string; 
        cancelUrl: string; 
        priceId?: string; 
        priceSlug?: string 
    } = {
        successUrl: successUrl || 'http://localhost:3000/success',
        cancelUrl: cancelUrl || 'http://localhost:3000/pricing',
    };

    if (priceId) {
        sessionParams.priceId = priceId;
    } else if (priceSlug) {
        sessionParams.priceSlug = priceSlug;
    } else {
        return NextResponse.json({ error: 'Missing priceId or priceSlug' }, { status: 400 });
    }

    // @ts-ignore - Flowglad types are strict about XOR but we constructed it safely
    const session = await client.createCheckoutSession(sessionParams);

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
