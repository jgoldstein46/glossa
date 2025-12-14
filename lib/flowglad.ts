import 'server-only'
import { FlowgladServer } from '@flowglad/nextjs/server'
import { createClient } from '@/utils/supabase/server'

if (!process.env.FLOWGLAD_SECRET_KEY) {
  throw new Error('FLOWGLAD_SECRET_KEY is not defined')
}

export const flowglad = (customerExternalId: string) => {
  return new FlowgladServer({
    apiKey: process.env.FLOWGLAD_SECRET_KEY!,
    customerExternalId,
    getCustomerDetails: async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      return {
        // Fallback names/emails if not in metadata, adjust as needed based on Supabase schema
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || ''
      }
    },
  })
}
