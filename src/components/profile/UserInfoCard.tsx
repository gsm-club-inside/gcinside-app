import { getCachedUserProfile } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";

const MAJOR_LABELS: Record<string, string> = {
  SW_DEVELOPMENT: "소프트웨어개발",
  SMART_IOT: "스마트IOT",
  AI: "인공지능",
};

export default async function UserInfoCard({ userId }: { userId: number }) {
  const user = await getCachedUserProfile(userId);

  if (!user) return null;

  return (
    <div className="bg-card space-y-4 rounded-lg border p-6">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full text-lg font-semibold">
          {user.name.slice(0, 2)}
        </div>
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          {user.role === "ADMIN" && (
            <Badge variant="default" className="mt-1">
              관리자
            </Badge>
          )}
        </div>
      </div>

      {(user.grade || user.classNum || user.number || user.major || user.studentNumber) && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t pt-4 text-sm">
          {user.studentNumber && (
            <div>
              <p className="text-muted-foreground mb-0.5 text-xs">학번</p>
              <p className="font-medium">{user.studentNumber}</p>
            </div>
          )}
          {user.grade && (
            <div>
              <p className="text-muted-foreground mb-0.5 text-xs">학년</p>
              <p className="font-medium">{user.grade}학년</p>
            </div>
          )}
          {user.classNum && (
            <div>
              <p className="text-muted-foreground mb-0.5 text-xs">반</p>
              <p className="font-medium">{user.classNum}반</p>
            </div>
          )}
          {user.number && (
            <div>
              <p className="text-muted-foreground mb-0.5 text-xs">번호</p>
              <p className="font-medium">{user.number}번</p>
            </div>
          )}
          {user.major && (
            <div>
              <p className="text-muted-foreground mb-0.5 text-xs">학과</p>
              <p className="font-medium">{MAJOR_LABELS[user.major] ?? user.major}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
