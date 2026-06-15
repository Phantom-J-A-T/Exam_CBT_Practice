import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  ArrowLeft, 
  RotateCcw, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronRight, 
  GraduationCap
} from 'lucide-react';
import { Question, SubjectType, ExamType } from '../types';

interface CbtTutorProps {
  subject: SubjectType;
  examType: ExamType;
  sessionQuestions: Question[];
  answeredQuestions: Record<string, number>;
  onClose: () => void;
  onRetake: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUBJECT_LABELS: Record<string, string> = {
  maths: 'Mathematics',
  english: 'Use of English',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology'
};

const EXAM_BODY_LABELS: Record<string, string> = {
  waec: "WAEC",
  neco: "NECO",
  gce: "GCE",
  jamb: "JAMB"
};

export default function CbtTutor({
  subject,
  examType,
  sessionQuestions,
  answeredQuestions,
  onClose,
  onRetake
}: CbtTutorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [selectedTopicQuestion, setSelectedTopicQuestion] = useState<Question | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of the chat list
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Welcome diagnostic load on entry
  useEffect(() => {
    const welcomeUserAndDiagnosticSummary = async () => {
      setIsLoading(true);
      setErrorStatus(null);
      
      const welcomePrompt = {
        role: 'user',
        content: `Connect to my ${EXAM_BODY_LABELS[examType] || 'past-paper'} mock session, welcome me warmly as a supportive Nigerian CBT study coach, share a breakdown analysis of my performance (summarizing which specific topics I was correct in, and which ones I need study-room help with), and ask how we can start learning together!`
      };

      try {
        const response = await fetch('/api/tutoring/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            examType,
            questions: sessionQuestions,
            answeredQuestions,
            messages: [welcomePrompt]
          })
        });

        const data = await response.json();
        if (response.ok && data.text) {
          setMessages([
            {
              id: 'diag_welcome',
              role: 'assistant',
              content: data.text,
              timestamp: new Date()
            }
          ]);
        } else {
          setErrorStatus(data.error || "Could not start study session. Is your Gemini API key configured?");
        }
      } catch (err: any) {
        console.error("Welcome loader error:", err);
        setErrorStatus("Unable to connect to the AI Tutoring server. Verify that your server is running and GEMINI_API_KEY is active.");
      } finally {
        setIsLoading(false);
      }
    };

    welcomeUserAndDiagnosticSummary();
  }, [subject, examType, sessionQuestions, answeredQuestions]);

  // Standard interactive message submission
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    // Add user message
    const newUserMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    if (!customText) setInputValue('');
    setIsLoading(true);
    setErrorStatus(null);

    // Formulate previous messages for the endpoint payload
    const updatedHistory = [...messages, newUserMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch('/api/tutoring/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          examType,
          questions: sessionQuestions,
          answeredQuestions,
          messages: updatedHistory
        })
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: data.text,
            timestamp: new Date()
          }
        ]);
      } else {
        setErrorStatus(data.error || "Tutor model failed to formulate reply. Please try again.");
      }
    } catch (err) {
      console.error("Tutor communication error:", err);
      setErrorStatus("A network error occurred. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clickable questions shortcut: triggers custom mentoring prompt
  const handleAskAboutQuestion = (q: Question, idx: number) => {
    setSelectedTopicQuestion(q);
    const query = `Tutor me on Question ${idx + 1}: Let's review "${q.questionText}". Walk me through the step-by-step logic, calculations, or grammar rule, and show me why Option "${q.options[q.correctOptionIndex]}" is the correct answer. Give me a custom strategy to crack similar issues in WAEC or JAMB exams.`;
    handleSendMessage(query);
  };

  // Render and format inline markdown beautifully
  const formatTextAsMarkdown = (text: string) => {
    const paragraphs = text.split('\n\n');
    return paragraphs.map((para, pIdx) => {
      // Bullet lists
      if (para.startsWith('- ') || para.startsWith('* ')) {
        const items = para.split('\n').map(line => line.replace(/^[-*]\s+/, ''));
        return (
          <ul key={pIdx} className="list-disc pl-5 my-2.5 space-y-1 text-slate-700 text-xs md:text-sm">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="leading-relaxed">{formatInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
      }
      
      // Numbered lists
      if (/^\d+\.\s+/.test(para)) {
        const items = para.split('\n').map(line => line.replace(/^\d+\.\s+/, ''));
        return (
          <ol key={pIdx} className="list-decimal pl-5 my-2.5 space-y-1 text-slate-700 text-xs md:text-sm">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="leading-relaxed">{formatInlineMarkdown(item)}</li>
            ))}
          </ol>
        );
      }

      // Normal paragraph text
      return (
        <p key={pIdx} className="leading-relaxed mb-2.5 last:mb-0 text-slate-700 text-xs md:text-sm">
          {formatInlineMarkdown(para)}
        </p>
      );
    });
  };

  const formatInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-extrabold text-slate-900 border-b border-indigo-100 pb-0.5">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-xs font-semibold border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row h-[720px] max-w-7xl mx-auto">
      {/* LEFT COLUMN: Practice Stats review & Clickable Question Matrix */}
      <div className="w-full md:w-80 bg-white border-r border-slate-150 flex flex-col h-1/3 md:h-full">
        {/* Banner header */}
        <div className="p-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
            <h3 className="font-black text-xs uppercase tracking-wider font-mono">Exam Study Lounge</h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Subject: <span className="text-indigo-300 font-bold">{SUBJECT_LABELS[subject]}</span>
          </p>
        </div>

        {/* Scrollable Questions list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono">Click a question to learn</span>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
              Total: {sessionQuestions.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {sessionQuestions.map((q, idx) => {
              const studentAnswerIdx = answeredQuestions[q.id];
              const isCorrect = studentAnswerIdx === q.correctOptionIndex;
              const isSelected = selectedTopicQuestion?.id === q.id;

              return (
                <button
                  key={q.id}
                  onClick={() => handleAskAboutQuestion(q, idx)}
                  disabled={isLoading}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 select-none ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' 
                      : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {studentAnswerIdx === undefined ? (
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    ) : isCorrect ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase font-mono text-slate-400 tracking-wide">
                      <span>Q. {(idx + 1).toString().padStart(2, '0')} — {q.topic}</span>
                      {selectedTopicQuestion?.id === q.id && (
                        <span className="text-indigo-600 animate-pulse text-[8px]">ACTIVE TUTORING</span>
                      )}
                    </div>
                    <p className="text-slate-700 font-medium truncate mt-0.5 leading-snug">
                      {q.questionText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Retake direct shortcut */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          <button
            onClick={onRetake}
            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <RotateCcw size={14} />
            RETAKE THIS CBT EXAM
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-mono font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={14} />
            BACK TO REVIEW MATRIX
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive AI Companion chat */}
      <div className="flex-1 flex flex-col bg-slate-50 h-2/3 md:h-full">
        {/* Tutor Active header status */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center relative shadow-sm">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-slate-900 text-sm">Naija CBT AI Tutor</h4>
                <span className="text-[9px] bg-indigo-100 text-indigo-800 font-black px-1.5 py-0.5 rounded uppercase font-mono">GEMINI-POWERED</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">UTME exam-prep simulation coach</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors font-semibold flex items-center gap-1 cursor-pointer"
            >
              Exit Lounge
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Chat Timeline list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${
                      isUser
                        ? 'bg-slate-900 text-slate-100 border-slate-800 rounded-tr-none'
                        : 'bg-white text-slate-800 border-slate-150 rounded-tl-none font-sans'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-2 border-b border-slate-100 pb-1.5">
                        <BookOpen size={12} className="text-indigo-600" />
                        <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider font-mono">TUTOR EXPLANATION</span>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      {isUser ? (
                        <p className="text-xs md:text-sm font-semibold leading-relaxed font-mono whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        formatTextAsMarkdown(message.content)
                      )}
                    </div>

                    <div className="text-[8px] font-mono font-bold mt-2 text-right opacity-40">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* SKELETON LOADING LOADER */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-white rounded-2xl p-4 shadow-sm border border-slate-150 rounded-tl-none w-full max-w-sm space-y-3">
                <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2">
                  <Sparkles size={12} className="text-indigo-500 animate-spin" />
                  <span className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-widest">Tutor calculating concepts...</span>
                </div>
                
                <div className="space-y-2 animate-pulse">
                  <div className="h-3.5 bg-slate-100 rounded w-5/6"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-11/12"></div>
                  <div className="h-3.5 bg-slate-100 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          )}

          {/* HELP HINT & ERROR MESSAGE IF NOT WORKING */}
          {errorStatus && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <h4 className="font-bold text-xs">AI Tutor Setup Notification</h4>
              </div>
              <p className="text-xs leading-relaxed">
                {errorStatus}
              </p>
              <div className="text-[10px] bg-white p-2.5 rounded-lg border border-amber-100 text-slate-500 leading-relaxed font-mono">
                💡 <strong>Admin Guide</strong>: Go to your AI Studio dashboard, click <strong>Settings</strong> at the top-right, open the <strong>Secrets</strong> panel, and add a secret key named <code>GEMINI_API_KEY</code> with your free key. Afterward, your personal AI study coach will be completely active!
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* INPUT SEND BLOCK */}
        <div className="p-4 bg-white border-t border-slate-150">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Ask me a question (e.g. 'Solve Question 2 step-by-step' or 'Explain Charles Law examples')"
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-sans"
            />
            
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className={`p-2.5 rounded-xl text-white font-bold transition-all shadow-md flex items-center justify-center cursor-pointer ${
                isLoading || !inputValue.trim()
                  ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95'
              }`}
            >
              <Send size={15} />
            </button>
          </form>
          <div className="text-[9px] font-mono text-slate-400 text-center mt-2 uppercase tracking-tight">
            Naija CBT study companion. Retake the exam anytime once you master the calculations!
          </div>
        </div>
      </div>
    </div>
  );
}
