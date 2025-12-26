"use client";

import { signout } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { ClassValue } from "clsx";
import { Button } from "./ui/button";

export default function LogoutButton({
  className,
}: {
  className?: ClassValue;
}) {
  return (
    <form action={signout}>
      <Button
        type="submit"
        variant="outline"
        className={cn("text-sm font-semibold leading-6", className)}
      >
        Sign out
      </Button>
    </form>
  );
}
