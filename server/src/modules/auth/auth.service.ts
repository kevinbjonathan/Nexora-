import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { runInTransaction } from "../../lib/events.js";
import { publicUser } from "../users/user.serializer.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  createSession,
  generateOpaqueToken,
  hashToken,
  revokeSessionByToken,
  type SessionMeta,
} from "./session.service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.schemas.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Lazily generated hash used to equalise timing when the email is unknown
// (mitigates user enumeration through response timing).
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(generateOpaqueToken());
  return dummyHashPromise;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertActive(status: string): void {
  if (status === "SUSPENDED" || status === "INACTIVE") {
    throw ApiError.forbidden("Your account is not active.");
  }
}

export async function register(input: RegisterInput, meta: SessionMeta) {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      status: "ACTIVE",
      lastLoginAt: new Date(),
    },
  });

  const { token } = await createSession(user.id, meta);
  return { user: publicUser(user), token };
}

export async function login(input: LoginInput, meta: SessionMeta) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(input.password, await getDummyHash());
    throw ApiError.unauthenticated("Invalid email or password.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthenticated("Invalid email or password.");
  }

  assertActive(user.status);

  const { token } = await createSession(user.id, meta);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { user: publicUser(updated), token };
}

export async function logout(token: string | undefined): Promise<void> {
  if (token) {
    await revokeSessionByToken(token);
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound("User not found.");
  }
  return publicUser(user);
}

export async function forgotPassword(email: string): Promise<{ resetToken: string | null }> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Always behave identically whether or not the account exists.
  if (!user) {
    return { resetToken: null };
  }

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  // No mail transport in this environment; the demo returns the token.
  // In production this would be emailed and never returned in the response.
  const isProduction = process.env.NODE_ENV === "production";
  return { resetToken: isProduction ? null : token };
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest("This password reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(input.password);

  await runInTransaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}

export async function changePassword(
  userId: string,
  sessionId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest("Your current password is incorrect.");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Invalidate every other session, keep the current one signed in.
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, id: { not: sessionId } },
    data: { revokedAt: new Date() },
  });
}
