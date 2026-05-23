export const ADMIN_EMAIL = "rizzperocho@gmail.com";

export function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
