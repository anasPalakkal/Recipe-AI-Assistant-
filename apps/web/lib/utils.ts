export { cn } from "cn"

export function getDisplayName(user: { name: string | null; email: string }): string {
  if (user.name) return user.name;
  return user.email.split("@")[0] || user.email;
}