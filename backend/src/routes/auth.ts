import { Router, type IRouter, type Response } from "express";
import {
  type AuthUser,
  GetAuthMeResponse,
  LoginBody,
  LoginResponse,
} from "@wedplan/shared";
import { authenticateUser, createSession, deleteSession, type User } from "@/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

export const SESSION_COOKIE_NAME = "wedplan_session";
const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email, role: user.role };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await authenticateUser(email, parsed.data.password);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session.token);

  res.json(LoginResponse.parse(toAuthUser(user)));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    await deleteSession(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME);
  res.status(204).end();
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  res.json(GetAuthMeResponse.parse(toAuthUser(req.user!)));
});

export default router;
