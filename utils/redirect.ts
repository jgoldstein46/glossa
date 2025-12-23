import { flowglad } from "@/lib/flowglad";
import { createClient } from "@/utils/supabase/server";

export async function getRedirectPath() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  try {
    const client = flowglad(user.id);

    // Retrieve billing details using verified method 'getBilling'
    // This corresponds to the method found via runtime inspection of FlowgladServer
    const billing = await (client as any).getBilling();

    if (
      billing &&
      billing.subscriptions &&
      billing.subscriptions.some((sub: any) => sub.status === "active")
    ) {
      return "/home";
    }

    return "/pricing";
  } catch (e) {
    console.error("Error checking Flowglad subscription:", e);
    // Fallback to pricing if check fails (safest default)
    return "/pricing";
  }
}
