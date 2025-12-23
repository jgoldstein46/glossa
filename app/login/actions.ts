"use server";

import { getRedirectPath } from "@/utils/redirect";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function authWithEmailPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password required" };
  }

  // 1. Try to Sign Up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log("SignUp Attempt:", {
    email,
    success: !signUpError,
    error: signUpError?.message,
  });

  // 2. If Sign Up succeeded (or returned fake success for existing user)
  if (!signUpError) {
    // If we have a session, great, logged in (auto-confirm enabled or similar)
    if (signUpData.session) {
      revalidatePath("/", "layout");
      redirect(await getRedirectPath());
    }

    // If no session, it could be:
    // A) New user, confirmation email sent.
    // B) Existing user, "fake success" (prevention of email enumeration).

    // Try to Sign In to distinguish A vs B.
    console.log(
      "SignUp returned no session. Attempting Sign In to check if user exists...",
    );
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      // Login failed.
      // If it's "Email not confirmed", then it IS Case A (New User).
      // If it's "Invalid login credentials", it might be Case B with wrong password OR Case A.
      // In either case, falling back to "Check your email" is the safest privacy-preserving msg,
      // BUT user specifically said "User IS confirmed", so they should have logged in.
      console.log("SignIn check failed:", signInError.message);
      return { message: "Check your email for a confirmation link." };
    }

    // Sign In succeeded! It was Case B (Existing User).
    if (signInData.session) {
      revalidatePath("/", "layout");
      redirect(await getRedirectPath());
    }

    // Fallback
    return { message: "Check your email for a confirmation link." };
  }

  // 3. If "User already registered" error OR rate limit error
  // Supabase determines "User already registered" or "For security purposes, you can only request this after..."
  if (
    signUpError.message.includes("already registered") ||
    signUpError.message.includes("security purposes") ||
    signUpError.message.includes("request this after")
  ) {
    console.log("User exists or rate limited, attempting sign in...");
    // 4. Fallback to Sign In
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.log("SignIn failed:", signInError.message);
      return { error: signInError.message }; // e.g. "Invalid login credentials"
    }

    revalidatePath("/", "layout");
    redirect(await getRedirectPath());
  }

  // 5. Some other error during Sign Up
  return { error: signUpError.message };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    redirect("/login?error=Could not authenticate");
  }

  if (data.url) {
    redirect(data.url);
  }
}
