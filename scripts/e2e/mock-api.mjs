import http from "node:http";

const port = Number(process.env.MOCK_API_PORT ?? 3211);

const state = {
  attempts: [],
  enrolled: false,
};

function json(res, status, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (req.method === "POST" && url.pathname === "/__mock__/reset") {
    state.attempts = [];
    state.enrolled = false;
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/__mock__/attempts") {
    json(res, 200, { attempts: state.attempts, enrolled: state.enrolled });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    json(res, 200, { user: { id: 1, name: "매크로 테스트", role: "STUDENT", grade: 1 } });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    json(res, 200, { id: 1, openAt: null, enrollmentEnabled: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/clubs") {
    const count = state.enrolled ? 1 : 0;
    json(res, 200, [
      {
        id: 101,
        name: "무지개 같은 아이들",
        description: "테스트용 동아리",
        grade1Capacity: 3,
        grade23Capacity: 3,
        isOpen: true,
        _count: { enrollments: count },
        gradeEnrollments: { grade1: count, grade23: 0 },
      },
    ]);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/enrollments") {
    json(res, 200, state.enrolled ? [{ id: 1, clubId: 101 }] : []);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/enrollments") {
    const body = await readJson(req);
    state.attempts.push(body);

    if (!body.challengeToken) {
      json(res, 428, {
        error: "challenge_required",
        challenge: {
          type: "delay",
          token: "macro-delay-token",
          expiresAt: Date.now() + 60_000,
          payload: { waitMs: 1 },
        },
      });
      return;
    }

    state.enrolled = true;
    json(res, 201, { id: 1, clubId: body.clubId });
    return;
  }

  json(res, 404, { error: "not_found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-api] listening on http://127.0.0.1:${port}`);
});
