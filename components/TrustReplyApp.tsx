import React, { useState, useRef, useEffect } from 'react';
import { NoticeDetails, NoticeType, TrustType, ActivityDetail, RuleResponse, RegistrationAuthority, CreationDocument } from '../types';
import { RULE_12A_DEFAULTS, RULE_80G_DEFAULTS } from '../constants';
import { generateLegalReply, extractDataFromNotice, testApiConnection } from '../services/geminiService';

const STORAGE_KEY = 'trustreply_final_deterministic_v12';

const SCENARIO_MATRIX_12A = {
  DEED_CHARITY: {
    a: "The applicant trust has been created and established under a written Trust Deed. A self-certified copy of the Trust Deed has already been duly uploaded along with Form No. 10AB.",
    c: "The applicant trust is duly registered with the Office of the Charity Commissioner. A self-certified copy of the Public Trust Registration Certificate (PTR) has already been duly uploaded along with Form No. 10AB."
  },
  DEED_ROC: {
    a: "The applicant trust has been created and established under a written Trust Deed. A self-certified copy of the Trust Deed has already been duly uploaded along with Form No. 10AB.",
    c: "The applicant trust is a Section 8 company duly registered with the Registrar of Companies (ROC). A self-certified copy of the Certificate of Incorporation and Memorandum of Association has already been duly uploaded."
  },
  NO_DEED_CHARITY: {
    a: "There is no formal Trust Deed for the applicant trust. We have attached the Public Trust Registration Certificate (PTR) obtained from the Charity Commissioner office as the primary creation document.",
    c: "The applicant trust is duly registered with the Office of the Charity Commissioner. A self-certified copy of the PTR certificate has already been duly uploaded along with Form No. 10AB."
  },
  WAQF_LOGIC: {
    a: "The applicant is a Waqf. There is no Trust Deed as the entity is a Waqf. We have attached the Public Trust Registration (PTR) issued by the Waqf Board.",
    c: "The applicant is duly registered with the Waqf Board. A self-certified copy of the Waqf Registration Certificate (PTR) has been uploaded along with Form No. 10AB."
  }
};

const SCENARIO_MATRIX_80G = {
  DEED_CHARITY: {
    a: "The applicant trust has been created and established under a written Trust Deed. A self-certified copy of the Trust Deed has already been duly uploaded along with Form No. 10AB.",
    b: "The applicant trust is duly registered with the Office of the Charity Commissioner. A self-certified copy of the Public Trust Registration Certificate (PTR) has been uploaded."
  },
  DEED_ROC: {
    a: "The applicant trust has been created and established under a written Trust Deed. A self-certified copy of the Trust Deed has already been duly uploaded along with Form No. 10AB.",
    b: "The applicant trust is duly registered with the Registrar of Companies (ROC) as a non-profit company. A copy of the Registration Certificate is uploaded."
  },
  NO_DEED_CHARITY: {
    a: "There is no formal Trust Deed for the applicant trust. We have attached the Public Trust Registration Certificate (PTR) obtained from the Charity Commissioner office.",
    b: "The applicant trust is duly registered with the Office of the Charity Commissioner under the Public Trust Act. The PTR certificate is uploaded."
  }
};

const TrustReplyApp: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentStep, setCurrentStep] = useState(1);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error' | 'missing'>('checking');
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

  const [generatedReply, setGeneratedReply] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [customContext, setCustomContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // API Connection Check
    if (!process.env.API_KEY || process.env.API_KEY === 'YOUR_API_KEY') {
      setApiStatus('missing');
    } else {
      testApiConnection()
        .then(success => setApiStatus(success ? 'connected' : 'error'))
        .catch(() => setApiStatus('error'));
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDetails(parsed.details || details);
        setCustomContext(parsed.customContext || '');
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ details, customContext, currentStep }));
  }, [details, customContext, currentStep]);

  useEffect(() => {
    setDetails(prev => {
      const isWaqf = prev.trustType === TrustType.WAQF;
      const is12A = prev.noticeType === NoticeType.RULE_17A;
      let updatedResponses = [...prev.ruleResponses];

      if (is12A) {
        let sc;
        if (isWaqf) {
          sc = SCENARIO_MATRIX_12A.WAQF_LOGIC;
        } else {
          if (prev.creationDocument === CreationDocument.TRUST_DEED) {
            sc = prev.registrationAuthority === RegistrationAuthority.REGISTRAR_OF_COMPANIES ? SCENARIO_MATRIX_12A.DEED_ROC : SCENARIO_MATRIX_12A.DEED_CHARITY;
          } else {
            sc = SCENARIO_MATRIX_12A.NO_DEED_CHARITY;
          }
        }
        updatedResponses = updatedResponses.map(r => {
          if (r.rule === 'a') return { ...r, text: sc.a };
          if (r.rule === 'c') return { ...r, text: sc.c };
          return r;
        });
      } else {
        let sc;
        if (prev.creationDocument === CreationDocument.TRUST_DEED) {
          sc = prev.registrationAuthority === RegistrationAuthority.REGISTRAR_OF_COMPANIES ? SCENARIO_MATRIX_80G.DEED_ROC : SCENARIO_MATRIX_80G.DEED_CHARITY;
        } else {
          sc = SCENARIO_MATRIX_80G.NO_DEED_CHARITY;
        }
        updatedResponses = updatedResponses.map(r => {
          if (r.rule === 'a') return { ...r, text: sc.a };
          if (r.rule === 'b') return { ...r, text: sc.b };
          return r;
        });
      }

      return { ...prev, ruleResponses: updatedResponses };
    });
  }, [details.noticeType, details.trustType, details.registrationAuthority, details.creationDocument]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    if (name === 'trustType') {
      const isWaqf = value === TrustType.WAQF;
      setDetails(prev => ({
        ...prev,
        trustType: value as TrustType,
        noticeType: isWaqf ? NoticeType.RULE_17A : prev.noticeType,
        registrationAuthority: isWaqf ? RegistrationAuthority.WAQF_BOARD : RegistrationAuthority.CHARITY_COMMISSIONER,
        creationDocument: isWaqf ? CreationDocument.WAQF_DOCUMENT : CreationDocument.TRUST_DEED,
        ruleResponses: (isWaqf || prev.noticeType === NoticeType.RULE_17A ? RULE_12A_DEFAULTS : RULE_80G_DEFAULTS).map(r => ({ ...r }))
      }));
    } else if (name === 'noticeType') {
      const newType = value as NoticeType;
      setDetails(prev => ({
        ...prev,
        noticeType: newType,
        ruleResponses: (newType === NoticeType.RULE_17A ? RULE_12A_DEFAULTS : RULE_80G_DEFAULTS).map(r => ({ ...r }))
      }));
    } else {
      setDetails(prev => ({ ...prev, [name]: val }));
    }
  };

  const deleteRuleResponse = (ruleId: string) => {
    setDetails(prev => ({
      ...prev,
      ruleResponses: prev.ruleResponses.filter(r => r.id !== ruleId)
    }));
  };

  const resetToDefaults = () => {
    const defaults = details.noticeType === NoticeType.RULE_17A ? RULE_12A_DEFAULTS : RULE_80G_DEFAULTS;
    setDetails(prev => ({
      ...prev,
      ruleResponses: defaults.map(r => ({ ...r }))
    }));
  };

  const handleGenerate = async () => {
    if (apiStatus !== 'connected') {
      alert("AI Service is not connected. Please check your API_KEY environment variable.");
      return;
    }
    setIsGenerating(true);
    setCurrentStep(4);
    try {
      const reply = await generateLegalReply(details, customContext);
      setGeneratedReply(reply || '');
    } catch (err) { alert("Drafting Error."); }
    finally { setIsGenerating(false); }
  };

  const generatePDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 30;

    const cleanedText = (generatedReply || '').replace(/\*/g, '');
    const lines = doc.splitTextToSize(cleanedText, pageWidth - (margin * 2));

    lines.forEach((line: string, index: number) => {
      if (yPos > 275) { doc.addPage(); yPos = 30; }
      if (index === 0) { doc.setFont("times", "bold"); doc.setFontSize(22); }
      else if (index === 1) { doc.setFont("times", "bold"); doc.setFontSize(14); }
      else { doc.setFont("times", "normal"); doc.setFontSize(12); }
      doc.text(line, margin, yPos);
      yPos += index < 2 ? 14 : 8;
    });

    doc.save(`Legal_Reply_${details.pan || 'Draft'}.pdf`);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-6xl mx-auto p-8 md:p-14 font-sans">
        <header className="mb-20 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="flex items-center gap-10">
            <div className="p-8 rounded-[2rem] bg-blue-600 shadow-2xl shadow-blue-500/20">
              <i className="fas fa-gavel text-5xl text-white"></i>
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter text-blue-500">TrustReply AI</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Logic Engine v6.2</p>
                <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    apiStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 
                    apiStatus === 'missing' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-[0.6rem] font-black uppercase tracking-tighter text-slate-400">
                    AI Service: {apiStatus === 'connected' ? 'Connected' : apiStatus === 'missing' ? 'Config Required' : 'Checking...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} className="px-8 py-4 rounded-2xl border border-red-500/30 text-red-500 font-black uppercase tracking-widest text-sm hover:bg-red-500 hover:text-white transition-all">Reset</button>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="p-5 rounded-2xl border">
               <i className={`fas ${isDark ? 'fa-sun text-2xl text-yellow-400' : 'fa-moon text-2xl text-slate-700'}`}></i>
            </button>
          </div>
        </header>

        {apiStatus === 'missing' && (
          <div className="mb-10 p-6 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center gap-4 text-red-400">
            <i className="fas fa-exclamation-triangle text-2xl"></i>
            <p className="font-bold">API Key not detected. Please add <strong>API_KEY</strong> to your environment variables to enable AI features.</p>
          </div>
        )}

        <div className="mb-24 flex justify-between relative max-w-4xl mx-auto">
          <div className={`absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 -z-10 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex flex-col items-center gap-5 cursor-pointer" onClick={() => currentStep > s && setCurrentStep(s)}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black transition-all border-4 ${currentStep >= s ? 'bg-blue-600 border-blue-600 text-white shadow-2xl' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                {currentStep > s ? <i className="fas fa-check"></i> : s}
              </div>
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div 
              className="p-32 border-8 border-dashed rounded-[5rem] cursor-pointer hover:border-blue-500 transition-all group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" fileInputRef={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (apiStatus !== 'connected') { alert("Please configure API_KEY first."); return; }
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
                      noticeType: extracted.noticeType === 'RULE_17A' ? NoticeType.RULE_17A : NoticeType.RULE_11AA
                    }));
                    setCurrentStep(2);
                  } catch (err) {
                    alert("Extraction failed. Please check your API key.");
                  } finally {
                    setIsExtracting(false);
                  }
                };
              }} />
              <i className="fas fa-file-invoice text-9xl text-blue-500 mb-10 group-hover:scale-110 transition-transform"></i>
              <h2 className="text-5xl font-black">{isExtracting ? "Extracting Data..." : "Upload Official Notice"}</h2>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className={`p-14 rounded-[4rem] border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white shadow-xl'}`}>
              <h3 className="text-3xl font-black mb-10 flex items-center gap-4"><i className="fas fa-filter text-blue-500"></i> Primary Logic Toggles</h3>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">1. Are you a Trust or Waqf?</label>
                  <select name="trustType" value={details.trustType} onChange={handleInputChange} className="w-full p-6 rounded-3xl bg-slate-800 outline-none font-black text-2xl border-4 border-slate-700 focus:border-blue-600 transition-all">
                    <option value={TrustType.TRUST}>Trust (Normal/Community)</option>
                    <option value={TrustType.WAQF}>Waqf Board Entity</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">2. Select Notice Received</label>
                  <select name="noticeType" value={details.noticeType} onChange={handleInputChange} disabled={details.trustType === TrustType.WAQF} className={`w-full p-6 rounded-3xl bg-slate-800 outline-none font-black text-2xl border-4 border-slate-700 transition-all ${details.trustType === TrustType.WAQF ? 'opacity-50 grayscale cursor-not-allowed' : 'focus:border-blue-600'}`}>
                    <option value={NoticeType.RULE_17A}>12A Notice (Rule 17A)</option>
                    <option value={NoticeType.RULE_11AA}>80G Notice (Rule 11AA)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">3. Does Trust Deed Exist?</label>
                  <select name="creationDocument" value={details.creationDocument} onChange={handleInputChange} disabled={details.trustType === TrustType.WAQF} className={`w-full p-6 rounded-3xl bg-slate-800 outline-none font-black text-2xl border-4 border-slate-700 transition-all ${details.trustType === TrustType.WAQF ? 'opacity-50 grayscale cursor-not-allowed' : 'focus:border-blue-600'}`}>
                    <option value={CreationDocument.TRUST_DEED}>Yes, Trust Deed is available</option>
                    <option value={CreationDocument.NO_TRUST_DEED}>No Trust Deed (Reply will explicitly say 'No Trust Deed')</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">4. Registration Authority</label>
                  <select name="registrationAuthority" value={details.registrationAuthority} onChange={handleInputChange} disabled={details.trustType === TrustType.WAQF} className={`w-full p-6 rounded-3xl bg-slate-800 outline-none font-black text-2xl border-4 border-slate-700 transition-all ${details.trustType === TrustType.WAQF ? 'opacity-50 grayscale cursor-not-allowed' : 'focus:border-blue-600'}`}>
                    <option value={RegistrationAuthority.CHARITY_COMMISSIONER}>Charity Commissioner (Standard)</option>
                    <option value={RegistrationAuthority.REGISTRAR_OF_COMPANIES}>Registrar of Companies (Section 8)</option>
                  </select>
                </div>
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <input name="trustName" value={details.trustName} onChange={handleInputChange} placeholder="Trust Official Name" className="w-full p-6 bg-slate-800 rounded-3xl outline-none font-black text-2xl" />
                  <input name="pan" value={details.pan} onChange={handleInputChange} placeholder="PAN (Required)" className="w-full p-6 bg-slate-800 rounded-3xl outline-none font-black text-2xl uppercase" />
                </div>
              </div>
            </div>

            <div className={`p-14 rounded-[4rem] border flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white shadow-xl'}`}>
               <h3 className="text-3xl font-black mb-10 flex items-center gap-4"><i className="fas fa-coins text-blue-500"></i> Financial Table</h3>
               <div className="flex-1 overflow-auto border-4 border-slate-800 rounded-3xl">
                 <table className="w-full">
                    <thead className="bg-slate-800">
                       <tr>
                         <th className="p-4 text-left text-xs uppercase text-slate-500 font-black">Period</th>
                         <th className="p-4 text-left text-xs uppercase text-slate-500 font-black">Activity Description</th>
                         <th className="p-4 text-right text-xs uppercase text-slate-500 font-black">Amt (₹)</th>
                       </tr>
                    </thead>
                    <tbody>
                      {details.activities.map((a, i) => (
                        <tr key={a.id} className="border-t border-slate-800">
                          <td className="p-4"><input value={a.year} onChange={e => {
                            const n = [...details.activities]; n[i].year = e.target.value; setDetails({...details, activities: n});
                          }} className="bg-transparent w-full outline-none font-black text-xl" placeholder="23-24" /></td>
                          <td className="p-4"><input value={a.activity} onChange={e => {
                            const n = [...details.activities]; n[i].activity = e.target.value; setDetails({...details, activities: n});
                          }} className="bg-transparent w-full outline-none text-xl" placeholder="Charity" /></td>
                          <td className="p-4"><input value={a.expenditure} onChange={e => {
                            const n = [...details.activities]; n[i].expenditure = e.target.value; setDetails({...details, activities: n});
                          }} className="bg-transparent w-full outline-none text-right font-mono text-blue-500 font-black" placeholder="0" /></td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
               <button onClick={() => setCurrentStep(3)} className="mt-8 p-8 bg-blue-600 text-white rounded-[2.5rem] font-black text-4xl shadow-3xl hover:scale-105 transition-all">GENERATE CLAUSES</button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex justify-between items-center mb-10">
               <h2 className="text-5xl font-black">Scenario Clauses</h2>
               <button onClick={resetToDefaults} className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">Restore All</button>
            </div>
            
            <div className="space-y-6">
              {details.ruleResponses.map(r => (
                <div key={r.id} className={`p-10 rounded-[4rem] bg-slate-900 border-4 transition-all group relative overflow-hidden ${r.text.includes('no Trust Deed') || r.text.includes('is a Waqf') ? 'border-amber-500 shadow-2xl shadow-amber-500/10' : 'border-slate-800'}`}>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <span className="w-16 h-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center font-black text-3xl shadow-xl">{r.rule.toUpperCase()}</span>
                      <div>
                        <h4 className="font-black text-blue-500 uppercase text-xs tracking-[0.2em]">{r.label}</h4>
                        <p className="text-slate-500 text-[0.65rem] font-bold uppercase tracking-widest mt-1">Rule {details.noticeType === NoticeType.RULE_17A ? '17A' : '11AA'}(2)({r.rule})</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteRuleResponse(r.id)} 
                      className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl border border-red-500/20"
                      title="Delete Clause"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                  <p className="mt-8 text-2xl leading-relaxed text-slate-300 italic font-black">"{r.text}"</p>
                </div>
              ))}
            </div>

            <div className="p-14 bg-slate-900 rounded-[4.5rem] border-4 border-slate-800 shadow-3xl">
               <h3 className="text-3xl font-black mb-6 flex items-center gap-4"><i className="fas fa-feather text-blue-500"></i> Final Context (Optional)</h3>
               <textarea value={customContext} onChange={e => setCustomContext(e.target.value)} placeholder="E.g. Condone any delay in registration, or highlight specific community service mandates..." className="w-full p-8 rounded-[2.5rem] h-48 bg-slate-950 border-4 border-slate-800 font-black text-2xl outline-none focus:border-blue-600 transition-all placeholder:text-slate-700" />
               <button onClick={handleGenerate} className="w-full mt-12 p-10 bg-blue-600 text-white rounded-[3.5rem] font-black text-5xl shadow-3xl transform hover:-translate-y-3 transition-all">DRAFT FINAL SUBMISSION</button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-5xl mx-auto space-y-12">
            <div className={`p-16 md:p-24 bg-white text-slate-900 rounded-[4rem] md:rounded-[6rem] min-h-[1100px] shadow-3xl flex flex-col border-[12px] border-slate-200 transition-all ${isGenerating ? 'opacity-50' : ''}`}>
               {isGenerating ? (
                 <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                    <div className="w-32 h-32 border-[16px] border-blue-600 border-t-transparent rounded-full animate-spin shadow-2xl"></div>
                    <p className="text-5xl font-black text-blue-600 animate-pulse uppercase tracking-tighter">Drafting Submission...</p>
                 </div>
               ) : (
                 <>
                   <div className="mb-10 p-6 bg-blue-50 rounded-3xl border-4 border-blue-100 flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl shadow-lg">
                        <i className="fas fa-edit"></i>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-blue-700 uppercase tracking-tight">Interactive Draft Preview</p>
                        <p className="text-blue-500 font-bold text-sm uppercase tracking-widest">You can manually refine the text below before exporting to PDF</p>
                      </div>
                   </div>
                   <textarea
                     value={generatedReply}
                     onChange={(e) => setGeneratedReply(e.target.value)}
                     className="w-full flex-1 font-serif text-[1.6rem] md:text-[1.8rem] leading-[2.2] border-none outline-none resize-none bg-transparent text-slate-900 scrollbar-hide"
                     spellCheck={false}
                   />
                 </>
               )}
            </div>
            {!isGenerating && (
              <div className="flex flex-col md:flex-row justify-center gap-8 pb-32">
                 <button onClick={generatePDF} className="px-24 py-12 bg-blue-600 text-white rounded-[4rem] font-black text-4xl shadow-3xl hover:scale-105 transition-all flex items-center gap-6">
                    <i className="fas fa-file-pdf"></i> CONVERT TO PDF
                 </button>
                 <button onClick={() => setCurrentStep(3)} className="px-14 py-12 bg-slate-800 text-white rounded-[4rem] font-black text-2xl border-4 border-slate-700">
                    GO BACK TO LOGIC
                 </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustReplyApp;