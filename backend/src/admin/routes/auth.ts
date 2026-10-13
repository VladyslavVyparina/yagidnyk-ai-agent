import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Некоректні дані входу" });
  }

  const { email, password } = parsed.data;
  const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (!admin) {
    return res.status(401).json({ error: "Невірний логін або пароль" });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Невірний логін або пароль" });
  }

  const token = jwt.sign({ sub: admin.id }, env.jwtSecret, { expiresIn: "30d" });
  return res.json({ token, email: admin.email });
});
