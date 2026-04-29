"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Moon, ShieldCheck, Sun, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ClubRequestDialog from "@/components/ClubRequestDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiUrl } from "@/lib/client-api";
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
      fetch(apiUrl("/api/auth/me"))
        .then((r) => r.json())
        .then((data) => data.user ?? null),
    staleTime: 5 * 60_000,
    initialData: initialUser !== undefined ? initialUser : undefined,
  });

  const handleLogout = async () => {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
    queryClient.setQueryData(["me"], null);
    toast.success("로그아웃되었습니다.");
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          className="gc-logo text-primary text-[22px] leading-none"
          aria-label="GCinside 홈"
        >
          GCinside
        </Link>
        <nav className="flex items-center gap-2">
          <ClubRequestDialog isLoggedIn={!!user} />
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="gc-pressable text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 items-center justify-center rounded-xl transition-colors"
            aria-label="테마 전환"
          >
            <Sun className="hidden size-4 dark:block" />
            <Moon className="size-4 dark:hidden" />
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
                  <Link href="/profile" className="flex w-full items-center gap-2">
                    <User className="size-4" />내 프로필
                  </Link>
                </DropdownMenuItem>
                {user.role === "ADMIN" && (
                  <DropdownMenuItem>
                    <Link href="/admin" className="flex w-full items-center gap-2">
                      <ShieldCheck className="size-4" />
                      관리자 페이지
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a href="/api/auth/login" className={cn(buttonVariants({ size: "sm" }))}>
              로그인
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
