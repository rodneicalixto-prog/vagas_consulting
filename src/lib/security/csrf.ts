import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "__HOST-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

export async function createCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600,
    path: "/",
  });

  return token;
}

export async function verifyCSRFToken(token: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!storedToken || !token) return false;

  return crypto.timingSafeEqual(Buffer.from(storedToken), Buffer.from(token));
}

export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = await createCSRFToken();
  }

  return token;
}
