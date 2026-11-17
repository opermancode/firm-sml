"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession } from "@/lib/auth";

const ONBOARDING_COOKIE = "firm_onboarded";

export type LoginState = { error?: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  const user = await authenticate(email, password);
  if (!user) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  const store = await cookies();
  const onboarded = store.get(ONBOARDING_COOKIE)?.value === "1";
  redirect(onboarded ? "/" : "/welcome");
}

/** Called when the user finishes the first-login guide. */
export async function completeOnboarding(): Promise<void> {
  const store = await cookies();
  store.set(ONBOARDING_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
