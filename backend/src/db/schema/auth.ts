import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "../client";
import { nextSequence } from "../counters";

export type UserRole = "admin" | "manager";

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: string[];
  createdAt: Date;
}

export interface Session {
  token: string;
  userId: number;
  expiresAt: Date;
  createdAt: Date;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export const usersCollection = () => db.collection<User>("users");
export const sessionsCollection = () => db.collection<Session>("sessions");

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const hashBuffer = Buffer.from(hash, "hex");
  if (hashBuffer.length !== derivedKey.length) return false;

  return timingSafeEqual(derivedKey, hashBuffer);
}

export async function insertUser(input: {
  email: string;
  password: string;
  role: UserRole;
  permissions: string[];
}): Promise<User> {
  const doc: User = {
    id: await nextSequence("users"),
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    permissions: input.role === "admin" ? [] : input.permissions,
    createdAt: new Date(),
  };
  await usersCollection().insertOne(doc);
  return doc;
}

export async function updateUserAccess(
  id: number,
  input: { role: UserRole; permissions: string[] },
): Promise<User | null> {
  return usersCollection().findOneAndUpdate(
    { id },
    {
      $set: {
        role: input.role,
        permissions: input.role === "admin" ? [] : input.permissions,
      },
    },
    { returnDocument: "after" },
  );
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await usersCollection().findOne({ email });
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

export async function listUsers(): Promise<User[]> {
  return usersCollection().find({}, { sort: { id: 1 } }).toArray();
}

export async function deleteUser(id: number): Promise<void> {
  await usersCollection().deleteOne({ id });
}

export async function createSession(userId: number): Promise<Session> {
  const doc: Session = {
    token: randomBytes(32).toString("hex"),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    createdAt: new Date(),
  };
  await sessionsCollection().insertOne(doc);
  return doc;
}

export async function findValidSession(token: string): Promise<Session | null> {
  return sessionsCollection().findOne({
    token,
    expiresAt: { $gt: new Date() },
  });
}

export async function deleteSession(token: string): Promise<void> {
  await sessionsCollection().deleteOne({ token });
}
