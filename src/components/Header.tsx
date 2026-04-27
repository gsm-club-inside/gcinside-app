"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sun, Moon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  grade?: number | null;
}

export default function Header({ initialUser }: { initialUser?: SessionUser | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();

  const { data: user } = useQuery<SessionUser | null>({
    queryKey: ["me"],
    queryFn: () =>
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => data.user ?? null),
    staleTime: 5 * 60_000,
    initialData: initialUser !== undefined ? initialUser : undefined,
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.setQueryData(["me"], null);
    toast.success("로그아웃되었습니다.");
    router.push("/");
    router.refresh();
  };

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <Link href="/" className="h-8 overflow-hidden">
          <Image
            src="/logo.png"
            alt="GCinside"
            width={120}
            height={68}
            className="-mt-[19px] dark:invert"
            priority
          />
        </Link>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
            aria-label="테마 전환"
          >
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="size-8 cursor-pointer">
                  <AvatarFallback className="text-xs font-medium">
                    {user.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs font-normal">
                      {user.email}
                    </span>
                    {user.role === "ADMIN" && (
                      <span className="text-primary text-xs font-normal">관리자</span>
                    )}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/profile" className="w-full">
                    My Profile
                  </Link>
                </DropdownMenuItem>
                {user.role === "ADMIN" && (
                  <DropdownMenuItem>
                    <Link href="/admin" className="w-full">
                      Admin Page
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a href="/api/auth/login" className={cn(buttonVariants({ size: "sm" }))}>
              Login
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
