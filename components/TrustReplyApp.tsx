import React, { useEffect, useRef, useState } from "react";
import {
  extractDataFromNotice,
  generateLegalReply,
  testApiConnection,
} from "../services/geminiService";

const TrustReplyApp: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [step, setStep] = useState(1);
  const [apiStatus, setApiStatus] = useState<
    "checking" | "connected" | "missing"
  >("checking");

  const [details, setDetails] = useState<any>({
    trustName: "",
    pan: "",
    din: "",
    date: "",
    noticeType: "",
  });

  const [context, setContext] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- THEME ---------- */
  useEffect(() => {
    const root = document.documentElement;
    theme === "dark"
      ? root.classList.add("dark")
      : root.classList.remove("dark");
  }, [theme]);

  /* ---------- API CHECK ---------- */
  useEffect(() => {
    if (!import.meta.env.VITE_API_KEY) {
      setApiStatus("missing");
      return;
    }

    testApiConnection().then((ok) =>
      setApiStatus(ok ? "connected" : "missing")
    );
  }, []);

  /* ---------- FILE UPLOAD ---------- */
  const handleFile = async (file: File) => {
    setLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const data = await extractDataFromNotice(base64, file.type);
        console.log("Extracted:", data);

        setDetails(data);
        setStep(2);
      } catch (e) {
        alert("Extraction failed. Check console.");
      } finally {
        setLoading(false);
      }
    };
  };

  /* ---------- GENERATE ---------- */
  const generate = async () => {
    setLoading(true);
    try {
      const text = await generateLegalReply(details, context);
      setReply(text);
      setStep(3);
    } catch {
      alert("Draft failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-10">
      <header className="flex justify-between mb-10">
        <h1 className="text-3xl font-black text-blue-500">
          TrustReply AI
        </h1>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="border px-4 py-2 rounded"
        >
          Toggle Theme
        </button>
      </header>

      {apiStatus !== "connected" && (
        <div className="mb-6 text-red-500 font-bold">
          API not connected. Set VITE_API_KEY.
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="text-center">
          <input
            type="file"
            ref={fileRef}
            className="hidden"
            accept=".pdf,image/*"
            onChange={(e) =>
              e.target.files && handleFile(e.target.files[0])
            }
          />
          <button
            disabled={apiStatus !== "connected"}
            onClick={() => fileRef.current?.click()}
            className="px-8 py-4 bg-blue-600 text-white rounded text-xl font-black"
          >
            {loading ? "Extracting…" : "Upload Official Notice"}
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <pre className="bg-slate-200 dark:bg-slate-800 p-4 rounded">
            {JSON.stringify(details, null, 2)}
          </pre>
          <textarea
            className="w-full p-4 border rounded"
            placeholder="Optional context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <button
            onClick={generate}
            className="px-8 py-4 bg-green-600 text-white rounded font-black"
          >
            Generate Reply
          </button>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="w-full h-[400px] p-6 border rounded font-serif"
        />
      )}
    </div>
  );
};

export default TrustReplyApp;
