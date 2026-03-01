import type { Metadata } from "next";
import { Karla } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import { FlowgladProvider } from "@flowglad/nextjs";
import "./globals.css";
import { SupabaseProvider } from "@/components/supabase/supabase-provider";

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glossa Learning",
  description: "AI-powered language learning with structured content and spaced repetition",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${karla.variable}  antialiased`}>
        <SupabaseProvider>
          <FlowgladProvider loadBilling={!!user}>{children}</FlowgladProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
