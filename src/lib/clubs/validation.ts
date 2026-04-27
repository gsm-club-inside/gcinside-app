export interface ClubPayload {
  name: string;
  description: string;
  grade1Capacity: number;
  grade23Capacity: number;
  isOpen: boolean;
}

export function parseClubPayload(body: unknown): ClubPayload {
  if (!body || typeof body !== "object") {
    throw new Error("요청 형식이 올바르지 않습니다.");
  }

  const payload = body as Record<string, unknown>;
  const name = String(payload.name ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const grade1Capacity = Number(payload.grade1Capacity ?? 0);
  const grade23Capacity = Number(payload.grade23Capacity ?? 0);

  if (!name || !description) {
    throw new Error("동아리명과 설명을 입력해주세요.");
  }

  if (
    !Number.isInteger(grade1Capacity) ||
    !Number.isInteger(grade23Capacity) ||
    grade1Capacity < 0 ||
    grade23Capacity < 0
  ) {
    throw new Error("정원은 0 이상의 정수로 입력해주세요.");
  }

  return {
    name,
    description,
    grade1Capacity,
    grade23Capacity,
    isOpen: payload.isOpen === undefined ? true : Boolean(payload.isOpen),
  };
}
