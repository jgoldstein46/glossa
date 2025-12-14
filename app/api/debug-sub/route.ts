
import { flowglad } from '@/lib/flowglad';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' });
        }

        const client = flowglad(user.id);
        const billing = await (client as any).getBilling();
        
        return NextResponse.json({ 
            billing,
            user_id: user.id
        }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
