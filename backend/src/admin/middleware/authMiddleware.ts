import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export interface AuthedRequest extends Request {
  adminId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Потрібна авторизація" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    req.adminId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Недійсний або прострочений токен" });
  }
}
