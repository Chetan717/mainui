export type PrescriptionMedicine = {
  name: string;
  strength: string;
  directions: string;
  confidence: "high" | "medium" | "low";
};

export type PrescriptionReading = {
  extracted_text: string;
  short_explanation: string;
  unclear_text: string[];
};

const REQUEST_TIMEOUT_MS = 75_000;

function workerUrl() {
  const url = String(import.meta.env.VITE_ASK_AI_WORKER_URL || "").trim().replace(/\/$/, "");
  if (!url) throw new Error("Ask AI is not configured yet. Please contact support.");
  return `${url}/v1/prescription/read`;
}

export async function readPrescription(blob: Blob): Promise<PrescriptionReading> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(workerUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "image/webp",
        "X-MLMLive-Client": "web-v1",
      },
      body: blob,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error("The prescription could not be processed. Please try again.");
    }
    if (!payload?.result) throw new Error("The AI returned an incomplete response. Please try again.");
    return payload.result as PrescriptionReading;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request took too long. Please check your connection and try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("Unable to reach Ask AI. Please check your connection.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
