
import { GoogleGenAI, Type } from "@google/genai";
import { NoticeDetails, NoticeType, RegistrationAuthority, CreationDocument } from "../types";

/**
 * Diagnostic check to see if the API Key is valid
 */
export const testApiConnection = async (): Promise<boolean> => {
  if (!process.env.API_KEY || process.env.API_KEY === 'YOUR_API_KEY') return false;
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Simple ping request
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'ping',
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (e) {
    console.error("API Diagnostic failed:", e);
    return false;
  }
};

export const extractDataFromNotice = async (base64Data: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const validMimeType = mimeType || (base64Data.startsWith('JVBERi') ? 'application/pdf' : 'image/jpeg');

  const prompt = `
    Analyze this Income Tax notice (12A/80G).
    Extract details into a valid JSON object:
    - trustName: Legal name.
    - pan: 10-char PAN.
    - din: DIN/Notice Number.
    - date: Date in YYYY-MM-DD.
    - noticeType: "RULE_17A" (for 12A) or "RULE_11AA" (for 80G).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: validMimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trustName: { type: Type.STRING },
            pan: { type: Type.STRING },
            din: { type: Type.STRING },
            date: { type: Type.STRING },
            noticeType: { type: Type.STRING }
          },
          required: ["trustName", "pan", "din", "date", "noticeType"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Extraction failed:", error);
    throw error;
  }
};

export const generateLegalReply = async (details: NoticeDetails, customContext: string = "") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const rulesDraft = details.ruleResponses
    .map(r => {
      const ruleLabel = details.noticeType === NoticeType.RULE_17A ? `Rule 17A(2)(${r.rule})` : `Rule 11AA(2)(${r.rule})`;
      return `${ruleLabel}\n${r.text}`;
    })
    .join('\n\n');

  const activityRows = details.activities
    .filter(a => a.year || a.activity)
    .map(a => `FY ${a.year}: ${a.activity} (INR ${a.expenditure})`)
    .join('\n');

  const csrNote = details.noticeType === NoticeType.RULE_11AA 
    ? (details.csrReceived 
        ? "The applicant trust has received CSR funds. Necessary documents like Form CSR-1, MOU with donor companies, and proof of activities conducted using CSR funds have been maintained and uploaded."
        : "The applicant trust has not received any CSR funds during the relevant period. Accordingly, requirements related to CSR fund documentation are not applicable.")
    : "";

  const noticeCode = details.noticeType === NoticeType.RULE_17A ? '12A' : '80G';
  const ruleCode = details.noticeType === NoticeType.RULE_17A ? '17A' : '11AA';

  const prompt = `
    Draft a formal Income Tax notice reply. Strictly plain text.
    
    HEADER LAYOUT:
    Line 1: ${details.trustName.toUpperCase()}
    Line 2: PAN: ${details.pan.toUpperCase()}
    
    ADDRESS BLOCK:
    To,
    The Commissioner of Income Tax (Exemptions)
    Income Tax Department
    
    REF DATA:
    Subject: Reply for ${noticeCode} Registration Notice (Submission under Rule ${ruleCode})
    Ref DIN: ${details.din}
    Date: ${details.date}
    
    SALUTATION RULE:
    DO NOT USE ANY SALUTATION (No "Sir", "Madam", etc.). Start text immediately.

    BODY:
    The applicant trust submits point-wise responses as under:

    ${rulesDraft}

    ${details.noticeType === NoticeType.RULE_11AA ? `CSR STATUS:\n${csrNote}\n` : ''}

    FINANCIAL SUMMARY:
    ${activityRows}

    PLEA:
    ${customContext}

    CLOSING RULE:
    DO NOT use "Yours faithfully", "Sincerely", or "Regards".
    End exactly with:
    
    For ${details.trustName}
    Authorized Signatory
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        thinkingConfig: { thinkingBudget: 15000 },
        temperature: 0.1
      }
    });
    return response.text;
  } catch (error) {
    console.error("Drafting failed:", error);
    throw new Error("Drafting failed.");
  }
};
