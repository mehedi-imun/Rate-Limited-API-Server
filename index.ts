import bodyParser from "body-parser";
import express, { NextFunction, Request, Response } from "express";

/* ---------- In-memory user data ---------- */
type UserType = "guest" | "free" | "premium";

interface User {
  id: string;
  username: string;
  password: string;
  type: UserType;
}

const users: User[] = [
  { id: "u1", username: "alice", password: "pass123", type: "free" },
  { id: "u2", username: "bob", password: "secret456", type: "premium" },
];

/* ---------- In-memory token store ---------- */
const tokens: Record<string, string> = {}; // token -> userId

/* ---------- Rate limit store ---------- */
const limits: Record<UserType, number> = {
  guest: 3,
  free: 10,
  premium: 50,
};

interface LimitRecord {
  count: number;
  windowStart: number;
}
const requestStore: Record<string, LimitRecord> = {};

/* ---------- Express App ---------- */
const app = express();
app.use(bodyParser.json());

/* ---------- Auth middleware ---------- */
app.use(
  (req: Request & { user?: User }, _res: Response, next: NextFunction) => {
    const token = req.headers["authorization"];
    if (token && tokens[token]) {
      const userId = tokens[token];
      const user = users.find((u) => u.id === userId);
      if (user) req.user = user;
    }
    next();
  }
);

/* ---------- Helper Functions ---------- */
function getUserKey(req: Request & { user?: User }) {
  return req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
}

function getUserType(req: Request & { user?: User }): UserType {
  return req.user ? req.user.type : "guest";
}

/* ---------- Rate Limiter Middleware ---------- */
function rateLimiter(
  req: Request & { remainingRequests?: number; user?: User },
  res: Response,
  next: NextFunction
) {
  const key = getUserKey(req);
  const type = getUserType(req);
  const limit = limits[type];
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;

  if (!requestStore[key] || now - requestStore[key].windowStart >= HOUR) {
    requestStore[key] = { count: 0, windowStart: now };
  }

  if (requestStore[key].count >= limit) {
    return res.status(429).json({
      success: false,
      error: `Too many requests. ${type} users can make ${limit} requests per hour.`,
      remaining_requests: 0,
    });
  }

  requestStore[key].count++;
  req.remainingRequests = limit - requestStore[key].count;
  next();
}

function getRemaining(req: Request & { user?: User }) {
  const key = getUserKey(req);
  const type = getUserType(req);
  const limit = limits[type];

  if (!requestStore[key]) return limit;

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  if (now - requestStore[key].windowStart >= HOUR) return limit;

  return limit - requestStore[key].count;
}

/* ---------- Routes ---------- */

// Login Endpoint
app.post("/api/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid credentials" });
  }

  // Generate token
  const token = uuid4();
  tokens[token] = user.id; // store token in memory

  res.json({ success: true, token, user_type: user.type });
});

// Chat Endpoint (Rate-limited)
app.post(
  "/api/chat",
  rateLimiter,
  (req: Request & { remainingRequests?: number }, res: Response) => {
    res.json({
      success: true,
      message: "This is a fake AI response.",
      remaining_requests: req.remainingRequests,
    });
  }
);

// Status Endpoint
app.get("/api/status", (req: Request, res: Response) => {
  res.json({ success: true, remaining_requests: getRemaining(req as any) });
});

/* ---------- Start Server ---------- */
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

/* ---------- UUID Generator ---------- */
function uuid4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
