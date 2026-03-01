"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { generateModule } from "@/lib/services/moduleGeneration";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CreateModuleDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("An introduction to dynamic programming");
  const [language, setLanguage] = useState("");
  const router = useRouter();

  async function generateModuleAsAuthenticatedUser(config: { title: string; language?: string }) {
    const supabase = createSupabaseBrowserClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const moduleId = crypto.randomUUID();
    console.log("Calling generateModule");
    generateModule({ moduleId, creatorId: userId, ...config });
    router.push(`/modules/${moduleId}`);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      generateModuleAsAuthenticatedUser({
        title: title.trim(),
        language: language.trim() || undefined,
      });
      setOpen(false);
      setTitle("");
      setLanguage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create a New Module</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
            <DialogDescription>Enter the details for your new learning module.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., An Introduction to Dynamic Programming"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="language">Language (defaults to English)</Label>
              <Input
                id="language"
                placeholder="e.g., Spanish, French, German"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create Module
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
