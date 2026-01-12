import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_API_KEY;

if (!apiKey) {
  console.warn("VITE_API_KEY not found");
}

const ai = new GoogleGenAI({ apiKey });

/* ---------- TEST CONNECTION ---------- */
export async function testApiConnection(): Promise<boolean> {
  try {
    await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });
    return true;
  } catch (e) {
    console.error("API test failed", e);
    return false;
  }
}

/* ---------- EXTRACT NOTICE DATA ---------- */
export async function extractDataFromNotice(
  base64Data: string,
  mimeType: string
): Promise<any> {
  const prompt = `
Extract the following fields from this Income Tax notice.
Return ONLY valid JSON.

Fields:
- trustName
- pan
- din
- date (YYYY-MM-DD)
- noticeType ("RULE_17A" or "RULE_11AA")
`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text || "{}";
  console.log("Gemini raw response:", text);

  return JSON.parse(text);
}

/* ---------- GENERATE LEGAL REPLY ---------- */
export async function generateLegalReply(details: any, context: string) {
  const prompt = `
Draft a professional Income Tax notice reply.

Trust Name: ${details.trustName}
PAN: ${details.pan}
DIN: ${details.din}
Date: ${details.date}

Context:
${context}

Reply format: plain text only.
`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-pro",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response.text || "";
}
