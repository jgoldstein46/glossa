import { FlowgladServer } from '@flowglad/nextjs/server';
import { createAppRouterRouteHandler } from '@flowglad/nextjs/server';
import { createClient } from '@/utils/supabase/server';

const flowglad = new FlowgladServer({
  apiKey: process.env.FLOWGLAD_SECRET_KEY!,
  supabaseAuth: {
      client: createClient
  }
});

export const { GET, POST } = createAppRouterRouteHandler(flowglad);
