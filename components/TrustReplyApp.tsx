import React, { useState, useRef, useEffect } from 'react';
import {
  NoticeDetails,
  NoticeType,
  TrustType,
  RegistrationAuthority,
  CreationDocument
} from '../types';
import { RULE_12A_DEFAULTS, RULE_80G_DEFAULTS } from '../constants';
import {
  generateLegalReply,
  extractDataFromNotice,
  testApiConnection
} from '../services/geminiService';

const STORAGE_KEY = 'trustreply_final_deterministic_v12';

const TrustReplyApp: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentStep, setCurrentStep] = useState(1);
  const [apiStatus, setApiStatus] =
    useState<'checking' | 'connected' | 'error' | 'missing'>('checking');

  const [details, setDetails] = useState<NoticeDetails>({
    trustName: '',
    pan: '',
    din: '',
    date: '',
    noticeType: NoticeType.RULE_11AA,
    trustType: TrustType.TRUST,
    registrationAuthority: RegistrationAuthority.CHARITY_COMMISSIONER,
    creationDocument: CreationDocument.TRUST_DEED,
    csrReceived: false,
    activities: [{ id: '1', year: '', activity: '', expenditure: '' }],
    ruleResponses: RULE_80G_DEFAULTS.map(r => ({ ...r }))
  });

  const [generatedReply, setGeneratedReply] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [customContext, setCustomContext] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ================= THEME HANDLING ================= */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  /* ================= API KEY CHECK + DATA RESTORE ================= */
  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      setApiStatus('missing');
    } else {
      testApiConnection()
        .then(ok => setApiStatus(ok ? 'connected' : 'error'))
        .catch(() => setApiStatus('error'));
    }

    // Restore ONLY form data (NOT step)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDetails(parsed.details || details);
        setCustomContext(parsed.customContext || '');
      } catch {}
    }
  }, []);

  /* ================= SAVE FORM DATA ONLY ================= */
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ details, customContext })
    );
  }, [details, customContext]);

  /* ================= ACTIONS ================= */

  const handleGenerate = async () => {
    if (apiStatus !== 'connected') {
      alert('AI Service is not connected. Please configure VITE_API_KEY.');
      return;
    }
    setIsGenerating(true);
    setCurrentStep(4);
    try {
      const reply = await generateLegalReply(details, customContext);
      setGeneratedReply(reply || '');
    } catch {
      alert('Drafting failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 20;
    const width = doc.internal.pageSize.getWidth();
    let y = 30;

    const text = (generatedReply || '').replace(/\*/g, '');
    const lines = doc.splitTextToSize(text, width - margin * 2);

    lines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 30;
      }
      doc.text(line, margin, y);
      y += 8;
    });

    doc.save(`Legal_Reply_${details.pan || 'Draft'}.pdf`);
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-6xl mx-auto p-10 font-sans">

        <header className="mb-12 flex justify-between items-center">
          <h1 className="text-4xl font-black text-blue-500">TrustReply AI</h1>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold">
              AI Service:{' '}
              {apiStatus === 'connected'
                ? 'Connected'
                : apiStatus === 'missing'
                ? 'Config Required'
                : 'Checking'}
            </span>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-4 py-2 border rounded"
            >
              Toggle Theme
            </button>
          </div>
        </header>

        {apiStatus === 'missing' && (
          <div className="mb-8 p-4 border border-red-500 text-red-500 rounded">
            API Key not detected. Please add <b>VITE_API_KEY</b> in Vercel
            environment variables.
          </div>
        )}

        {/* STEP 1 – UPLOAD (STABLE) */}
        {currentStep === 1 && (
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (apiStatus !== 'connected') {
                  alert('Please configure VITE_API_KEY first.');
                  return;
                }

                setIsExtracting(true);
                const reader = new FileReader();
                reader.readAsDataURL(file);

                reader.onload = async () => {
                  const base64 = (reader.result as string).split(',')[1];
                  try {
                    const extracted = await extractDataFromNotice(base64, file.type);
                    setDetails(prev => ({
                      ...prev,
                      trustName: extracted.trustName || '',
                      pan: (extracted.pan || '').toUpperCase(),
                      din: extracted.din || '',
                      date: extracted.date || '',
                      noticeType:
                        extracted.noticeType === 'RULE_17A'
                          ? NoticeType.RULE_17A
                          : NoticeType.RULE_11AA
                    }));
                    setCurrentStep(2);
                  } catch {
                    alert('Extraction failed.');
                  } finally {
                    setIsExtracting(false);
                  }
                };
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={apiStatus !== 'connected'}
              className={`px-10 py-6 rounded text-2xl font-black
                ${apiStatus === 'connected'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-400 text-slate-700 cursor-not-allowed'}`}
            >
              {isExtracting ? 'Extracting…' : 'Upload Official Notice'}
            </button>
          </div>
        )}

        {/* STEP 3 – CONTEXT */}
        {currentStep === 3 && (
          <div className="text-center">
            <textarea
              value={customContext}
              onChange={e => setCustomContext(e.target.value)}
              className="w-full h-40 p-4 border rounded"
              placeholder="Optional context..."
            />

            <button
              onClick={handleGenerate}
              className="mt-6 px-12 py-6 bg-blue-600 text-white rounded text-2xl font-black"
            >
              Generate Reply
            </button>
          </div>
        )}

        {/* STEP 4 – PREVIEW */}
        {currentStep === 4 && (
          <div>
            <textarea
              value={generatedReply}
              onChange={e => setGeneratedReply(e.target.value)}
              className="w-full h-[500px] p-6 font-serif border rounded"
            />

            <div className="mt-6 flex justify-center gap-6">
              <button
                onClick={generatePDF}
                className="px-10 py-5 bg-green-600 text-white rounded font-black"
              >
                Export PDF
              </button>

              <button
                onClick={() => setCurrentStep(3)}
                className="px-10 py-5 bg-slate-700 text-white rounded font-black"
              >
                Back
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TrustReplyApp;
