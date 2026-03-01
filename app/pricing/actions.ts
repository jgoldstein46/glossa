"use server";

import { flowglad } from "@/lib/flowglad";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function cancelSubscriptionAction(subscriptionId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const client = flowglad(user.id);

    // Call Flowglad to cancel the subscription
    // Correct signature based on lint error: { id: string, cancellation: ... }
    await client.cancelSubscription({
      id: subscriptionId,
      cancellation: { timing: "at_end_of_current_billing_period" },
    });

    revalidatePath("/pricing");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to cancel subscription:", e);
    return { error: e.message || "Failed to cancel subscription" };
  }
}
