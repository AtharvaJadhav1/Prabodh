let clerkToken: string | null = null;

export function setClerkToken(token: string | null) {
  clerkToken = token;
}

export function getClerkToken() {
  return clerkToken;
}

export function clerkEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}
