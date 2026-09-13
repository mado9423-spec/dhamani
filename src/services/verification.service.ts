export interface VerificationResult {
  success: boolean;
  confidence?: number;
  reason?: string;
}

export async function verifyLiveImage(
  imageDataUrl: string,
  citizenId: string
): Promise<VerificationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1800));

  if (!imageDataUrl || !citizenId) {
    return { success: false, reason: "بيانات التحقق غير مكتملة" };
  }

  return { success: true, confidence: 0.97 };
}
