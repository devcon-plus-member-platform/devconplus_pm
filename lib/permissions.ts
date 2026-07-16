import type { Contributor } from "@/types";

// Admin is a per-contributor flag (contributors.is_admin) rather than a
// single hardcoded account — there can be more than one admin, granted via
// the invite flow in /admin/accept-invite.
export function isAdmin(contributor: Pick<Contributor, "is_admin"> | null | undefined): boolean {
  return !!contributor?.is_admin;
}
