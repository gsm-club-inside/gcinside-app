"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Club {
  id: number;
  name: string;
  description: string;
  grade1Capacity: number;
  grade23Capacity: number;
  isOpen: boolean;
  gradeEnrollments: { grade1: number; grade23: number };
  _count: { enrollments: number };
}

interface AdminUser {
  id: number;
  name: string;
  studentNumber: number | null;
  grade: number | null;
  classNum: number | null;
  number: number | null;
}

const emptyForm = {
  name: "",
  description: "",
  grade1Capacity: 0,
  grade23Capacity: 0,
  isOpen: true,
};

function AddUserDialog({ club, onClose }: { club: Club; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: allUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users").then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: enrollments = [] } = useQuery<{ user: { id: number } }[]>({
    queryKey: ["admin-enrollments", club.id],
    queryFn: () => fetch(`/api/admin/enrollments?clubId=${club.id}`).then((r) => r.json()),
    staleTime: 0,
  });

  const enrolledIds = useMemo(() => new Set(enrollments.map((e) => e.user.id)), [enrollments]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter(
      (u) =>
        !enrolledIds.has(u.id) &&
        (u.name.toLowerCase().includes(q) || String(u.studentNumber ?? "").includes(q))
    );
  }, [allUsers, enrolledIds, search]);

  const mutation = useMutation({
    mutationFn: (userId: number) =>
      fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, clubId: club.id }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error);
      }),
    onSuccess: () => {
      toast.success("추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      onClose();
    },
    onError: (err: Error) => toast.error("추가 실패", { description: err.message }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>학생 추가</DialogTitle>
          <DialogDescription>
            <strong>&quot;{club.name}&quot;</strong>에 추가할 학생을 선택하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="이름 또는 학번으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="border-border/70 max-h-64 overflow-y-auto rounded-2xl border">
            {filteredUsers.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {allUsers.length === 0 ? "불러오는 중..." : "해당하는 학생이 없습니다."}
              </p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`hover:bg-muted flex w-full items-center justify-between gap-3 px-4 py-3 text-sm transition-colors ${
                    selectedUserId === user.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {user.studentNumber ?? "학번없음"}
                    {user.grade && user.classNum && user.number
                      ? ` · ${user.grade}학년 ${user.classNum}반 ${user.number}번`
                      : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!selectedUserId || mutation.isPending}
            onClick={() => selectedUserId && mutation.mutate(selectedUserId)}
          >
            {mutation.isPending ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminClubs() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null);
  const [addTarget, setAddTarget] = useState<Club | null>(null);

  const { data: clubs = [], isLoading } = useQuery<Club[]>({
    queryKey: ["clubs"],
    queryFn: () => fetch("/api/clubs").then((r) => r.json()),
    staleTime: 30_000,
  });

  const openCount = useMemo(() => clubs.filter((club) => club.isOpen).length, [clubs]);

  const saveMutation = useMutation({
    mutationFn: (payload: typeof emptyForm) => {
      if (editId === null) throw new Error("수정할 동아리를 선택해주세요.");
      return fetch(`/api/clubs/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error);
      });
    },
    onSuccess: () => {
      toast.success("동아리가 수정되었습니다.");
      setForm(emptyForm);
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
    onError: (err: Error) => toast.error("저장 실패", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (club: Club) =>
      fetch(`/api/clubs/${club.id}`, { method: "DELETE" }).then((res) => {
        if (!res.ok) throw new Error();
        return club;
      }),
    onSuccess: (club) => {
      toast.success(`"${club.name}" 동아리가 삭제되었습니다.`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  const handleEdit = (club: Club) => {
    setEditId(club.id);
    setForm({
      name: club.name,
      description: club.description,
      grade1Capacity: club.grade1Capacity,
      grade23Capacity: club.grade23Capacity,
      isOpen: club.isOpen,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  return (
    <div className="space-y-6">
      {editId !== null && (
        <Card className="ring-border/60 rounded-[22px] border-0 py-0 shadow-none ring-1">
          <CardHeader>
            <CardTitle className="text-[17px] font-bold">동아리 정보를 수정하세요</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">동아리명</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  required
                  rows={3}
                  className="resize-none"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-2 block">학년별 정원</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="grade1Capacity"
                      className="text-muted-foreground text-xs font-normal"
                    >
                      1학년 정원
                    </Label>
                    <Input
                      id="grade1Capacity"
                      type="number"
                      min={0}
                      required
                      value={form.grade1Capacity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, grade1Capacity: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="grade23Capacity"
                      className="text-muted-foreground text-xs font-normal"
                    >
                      2·3학년 정원
                    </Label>
                    <Input
                      id="grade23Capacity"
                      type="number"
                      min={0}
                      required
                      value={form.grade23Capacity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, grade23Capacity: Number(e.target.value) }))
                      }
                    />
                  </div>
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  0으로 설정하면 해당 학년은 신청 불가
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isOpen"
                  checked={form.isOpen}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isOpen: !!v }))}
                />
                <Label htmlFor="isOpen" className="cursor-pointer font-normal">
                  오픈 시간 관계없이 즉시 신청 가능
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "저장 중 이에요..." : "저장하기"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">전체 {clubs.length}개</Badge>
        <Badge variant={openCount > 0 ? "default" : "secondary"}>활성 {openCount}개</Badge>
        <Badge variant="secondary">대기 {Math.max(clubs.length - openCount, 0)}개</Badge>
      </div>

      <Card className="ring-border/60 rounded-[22px] border-0 py-0 shadow-none ring-1">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>동아리명</TableHead>
                  <TableHead>1학년</TableHead>
                  <TableHead>2·3학년</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell className="font-medium">{club.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {club.grade1Capacity > 0
                        ? `${club.gradeEnrollments.grade1} / ${club.grade1Capacity}`
                        : "불가"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {club.grade23Capacity > 0
                        ? `${club.gradeEnrollments.grade23} / ${club.grade23Capacity}`
                        : "불가"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={club.isOpen ? "default" : "secondary"}>
                        {club.isOpen ? "활성" : "대기"}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setAddTarget(club)}>
                        추가
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(club)}>
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(club)}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {clubs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <p className="font-medium">등록된 창체동아리가 없어요</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        동아리가 등록되면 정원과 신청 상태를 관리할 수 있습니다.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {addTarget && <AddUserDialog club={addTarget} onClose={() => setAddTarget(null)} />}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>동아리 삭제</DialogTitle>
            <DialogDescription>
              <strong>&quot;{deleteTarget?.name}&quot;</strong> 동아리를 삭제하면 모든 신청 내역도
              함께 삭제됩니다. 계속하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
