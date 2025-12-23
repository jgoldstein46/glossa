"use server";

export async function fetchElevenLabsScribeToken(): Promise<{
  token?: string;
  message: string | null;
}> {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    },
  );
  if (!response.ok) {
    return { message: "Failed to fetch ElevenLabs Scribe token." };
  }
  const data = await response.json();
  return { token: data.token, message: null };
}
