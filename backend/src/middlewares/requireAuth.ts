import type { NextFunction, Request, Response } from "express";
import { findValidSession, usersCollection, type User } from "@/db";
import { SESSION_COOKIE_NAME } from "../routes/auth";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const session = token ? await findValidSession(token) : null;
  const user = session ? await usersCollection().findOne({ id: session.userId }) : null;

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.user = user;
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    next();
  });
}

/**
 * Admins always pass. Managers pass only if granted this specific menu
 * permission - hiding a sidebar item is not access control on its own, so
 * every admin-only route this applies to must also be gated server-side.
 */
export function requirePermission(key: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      if (req.user?.role === "admin" || req.user?.permissions.includes(key)) {
        next();
        return;
      }
      res.status(403).json({ error: "You don't have access to this feature." });
    });
  };
}
