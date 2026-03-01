import type { Metadata } from "next";
import { Karla } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${karla.variable}  antialiased`}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
