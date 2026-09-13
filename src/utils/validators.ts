export function validateFullName(value: string): string | null {
  if (!value.trim()) return "يرجى إدخال الاسم الرباعي";
  const parts = value.trim().split(/\s+/);
  if (parts.length < 4) return "يرجى إدخال الاسم الرباعي كاملاً (4 أسماء)";
  return null;
}

export function validatePensionNumber(value: string): string | null {
  if (!value.trim()) return "يرجى إدخال رقم المعاش";
  return null;
}

export function validateBranch(value: string): string | null {
  if (!value) return "يرجى اختيار الفرع";
  return null;
}
