const PSERVER_BASE_URL = import.meta.env.VITE_PSERVER_URL || "";
const PSERVER_API_KEY  = import.meta.env.VITE_PSERVER_API_KEY || "";

const pserverHeaders = () => ({
  "Content-Type": "application/json",
  "X-Api-Key": PSERVER_API_KEY,
});

export async function sendOtpServer({ userId, mobile }) {
  const res = await fetch(`${PSERVER_BASE_URL}/send-otp`, {
    method: "POST",
    headers: pserverHeaders(),
    body: JSON.stringify({ userId, mobile }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error("Failed to send OTP. Please try again.");
  }
  return data;
}

export async function verifyOtpServer({ userId, otp }) {
  const res = await fetch(`${PSERVER_BASE_URL}/verify-otp`, {
    method: "POST",
    headers: pserverHeaders(),
    body: JSON.stringify({ userId, otp }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error("Incorrect OTP. Please try again.");
  }
  return data;
}
