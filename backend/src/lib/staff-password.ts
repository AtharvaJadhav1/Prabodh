export function deriveStaffPassword(email: string): string {
  const local = email.split('@')[0] ?? '';
  return local.toLowerCase().replace(/[^a-z0-9]/g, '');
}