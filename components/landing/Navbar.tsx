import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight">TutorTalk</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              How it Works
            </Link>
            <Link
              href="/pricing"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Pricing
            </Link>
            
            {!user ? (
                <>
                    <Link
                    href="/login"
                    className="px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                    >
                    Sign In
                    </Link>
                    <Link
                    href="/login"
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                    >
                    Get Started
                    </Link>
                </>
            ) : (
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{user.email}</span>
                    <LogoutButton />
                </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
