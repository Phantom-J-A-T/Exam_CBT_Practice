import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper function to query Gemini API with transient error retries (exponential backoff)
 * and seamless fallback model candidates when the primary model experiences high demand (503).
 */
async function generateWithFallbackAndRetry(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config: any;
  },
  primaryModel: string = "gemini-3.5-flash",
  fallbackModels: string[] = ["gemini-3.1-flash-lite"]
) {
  const modelsToTry = [primaryModel, ...fallbackModels];
  const maxRetries = 2; // Retries for each model on failure

  for (const model of modelsToTry) {
    let delay = 1000;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Connecting to Gemini API using model: ${model} (attempt ${attempt + 1}/${maxRetries + 1})...`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const isTransient = 
          errorMsg.includes("503") || 
          errorMsg.includes("500") ||
          errorMsg.includes("UNAVAILABLE") || 
          errorMsg.includes("RESOURCE_EXHAUSTED") || 
          errorMsg.includes("high demand") || 
          errorMsg.includes("429") ||
          errorMsg.includes("overburdened");

        if (isTransient && attempt < maxRetries) {
          console.warn(`Transient Gemini API error on model '${model}'. Retrying in ${delay}ms: ${errorMsg}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        } else {
          console.error(`Gemini API call failed for model '${model}': ${errorMsg}`);
          break; // Stop retrying this model, proceed to the fallback model
        }
      }
    }
  }
  throw new Error("All integrated Gemini model endpoints and retry fallbacks failed due to service unavailability or high demand. Please try again in a few moments.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse incoming JSON payloads
  app.use(express.json());

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dynamic Syllabus-Compliant Real WAEC/NECO/GCE Questions API proxy and generator
  app.get("/api/questions", async (req, res) => {
    try {
      const subject = (req.query.subject as string) || "maths";
      const examType = (req.query.examType as string) || "waec";
      const limit = parseInt(req.query.limit as string) || 20;

      const alocToken = process.env.ALOC_API_TOKEN;

      // If ALOC Token is configured, attempt connecting to ALOC API
      if (alocToken) {
        try {
          const alocSubject = subject === "maths" ? "mathematics" : subject;
          // Format standard path for multiple queries
          const response = await fetch(
            `https://questions.aloc.com.ng/api/v2/m?subject=${alocSubject}&limit=${limit}`,
            {
              headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${alocToken}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result && result.data && Array.isArray(result.data)) {
              const mappedQuestions = result.data.map((item: any, idx: number) => {
                const options = [
                  item.option?.a || "Option A",
                  item.option?.b || "Option B",
                  item.option?.c || "Option C",
                  item.option?.d || "Option D",
                ];

                const ansLetter = (item.answer || "a").toLowerCase().trim();
                const correctOptionIndex =
                  ansLetter === "a"
                    ? 0
                    : ansLetter === "b"
                    ? 1
                    : ansLetter === "c"
                    ? 2
                    : ansLetter === "d"
                    ? 3
                    : 0;

                return {
                  id: `aloc_${item.id || idx}_${Date.now()}`,
                  subject: subject,
                  topic: item.topic || "General Concepts",
                  questionText: item.question || "No question text.",
                  options,
                  correctOptionIndex,
                  explanation: item.solution || "Refer to WAEC standard textbooks for step-by-step details.",
                  examType: examType,
                  examYear: item.examYear || "2020",
                };
              });

              // Randomize list using Fisher-Yates shuffle
              for (let i = mappedQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mappedQuestions[i], mappedQuestions[j]] = [mappedQuestions[j], mappedQuestions[i]];
              }

              return res.json({ questions: mappedQuestions, source: "aloc_api" });
            }
          }
        } catch (alocErr) {
          console.error("ALOC API failed, falling back to Gemini generator:", alocErr);
        }
      }

      // Default high-fidelity fallback: Generate questions using Gemini 3.5-flash with a structured response schema
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const subjectTitles: Record<string, string> = {
            maths: "Mathematics",
            english: "Use of English",
            physics: "Physics",
            chemistry: "Chemistry",
            biology: "Biology",
          };
          const subjectTitle = subjectTitles[subject] || subject;

          const prompt = `Generate exactly ${limit} authentic-style, realistic past questions for ${subjectTitle} corresponding to West African high school and West African/Nigerian entrance exams.
The questions MUST correspond perfectly to the ${examType.toUpperCase()} standard syllabus.
Include a highly randomized diversity of core curriculum chapters and topics in ${subjectTitle}, matching the real question styles, topics, logic traps, calculations, or sentence constructions found in WASSCE/WAEC or NECO past papers.

The output MUST be a strict JSON array matching our schema:
- 4 multiple-choice options
- correctOptionIndex (0=A, 1=B, 2=C, 3=D)
- topic name
- questionText
- detailed explanation describing why the correct answer is selected.

Random seed reference: ${Date.now()}-${Math.random()}`;

          const genResponse = await generateWithFallbackAndRetry(ai, {
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "A unique random string ID" },
                    subject: { type: Type.STRING, description: "Subject tag (maths, english, physics, chemistry, biology)" },
                    topic: { type: Type.STRING, description: "Specific curriculum topic from secondary education" },
                    questionText: { type: Type.STRING, description: "The full question text or expression" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of exactly 4 choices (A, B, C, D)"
                    },
                    correctOptionIndex: { type: Type.INTEGER, description: "The 0-based index of the correct option (0 to 3)" },
                    explanation: { type: Type.STRING, description: "Detailed academic breakdown or step-by-step formula solution" },
                    examType: { type: Type.STRING, description: "The exam identifier" },
                    examYear: { type: Type.STRING, description: "The question past year (e.g. 2018)" }
                  },
                  required: ["id", "subject", "topic", "questionText", "options", "correctOptionIndex", "explanation", "examType", "examYear"]
                }
              },
              temperature: 0.95,
            }
          });

          const questionsText = genResponse.text;
          if (questionsText) {
            const parsed = JSON.parse(questionsText);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.map((q: any) => ({
                id: q.id || `ai_${Math.random().toString(36).substring(2, 11)}`,
                subject: (subject as any),
                topic: q.topic || "General Practice",
                questionText: q.questionText,
                options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
                correctOptionIndex: typeof q.correctOptionIndex === "number" && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3 ? q.correctOptionIndex : 0,
                explanation: q.explanation || "No step-by-step documentation provided.",
                examType: examType,
                examYear: q.examYear || "2021"
              }));

              // Fisher-Yates shuffle
              for (let i = cleaned.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cleaned[i], cleaned[j]] = [cleaned[j], cleaned[i]];
              }

              return res.json({ questions: cleaned, source: "gemini_generation" });
            }
          }
        } catch (geminiErr) {
          console.error("Dynamic past question generation failed:", geminiErr);
        }
      }

      // If nothing worked on the server, send empty list indicating to client to use local fallback
      return res.json({ questions: [], source: "offline_fallback_required" });
    } catch (parentErr: any) {
      console.error("Questions retrieval main router crash:", parentErr);
      res.status(500).json({ error: parentErr.message || "Failed to retrieve questions." });
    }
  });

  // AI Guided UTME/WAEC/CBT Tutoring endpoint
  app.post("/api/tutoring/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Gemini API Key is missing. Please add GEMINI_API_KEY inside Settings > Secrets."
        });
      }

      const { subject, questions, answeredQuestions, messages, examType } = req.body;

      if (!subject || !questions || !answeredQuestions || !messages) {
        return res.status(400).json({
          error: "Missing required fields: subject, questions, answeredQuestions, or messages."
        });
      }

      // Initialize the GoogleGenAI SDK with aistudio-build telemetry
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Map subject key to professional label
      const subjectLabels: Record<string, string> = {
        maths: "Mathematics",
        english: "Use of English",
        physics: "Physics",
        chemistry: "Chemistry",
        biology: "Biology",
      };
      const subjectLabel = subjectLabels[subject] || subject;

      const examLabels: Record<string, string> = {
        waec: "WAEC (West African Examinations Council)",
        neco: "NECO (National Examinations Council)",
        gce: "WAEC/GCE past paper",
        jamb: "JAMB/UTME (Unified Tertiary Matriculation Examination)"
      };
      const examLabel = examLabels[examType] || "WAEC/JAMB";

      // Construct a summary of student performance for the system instruction
      let perfSummary = "";
      questions.forEach((q: any, idx: number) => {
        const studentAnsIdx = answeredQuestions[q.id];
        const studentSelectedVal = studentAnsIdx !== undefined ? q.options[studentAnsIdx] : "None (Unanswered)";
        const correctVal = q.options[q.correctOptionIndex];
        const isCorrect = studentAnsIdx === q.correctOptionIndex;

        perfSummary += `Question ${idx + 1}: "${q.questionText}"\n`;
        perfSummary += `- Topic: ${q.topic}\n`;
        perfSummary += `- Options: A) ${q.options[0]}, B) ${q.options[1]}, C) ${q.options[2]}, D) ${q.options[3]}\n`;
        perfSummary += `- Correct Answer Option: [Index ${q.correctOptionIndex}] "${correctVal}"\n`;
        perfSummary += `- Candidate Selected Option: ${studentAnsIdx !== undefined ? `[Index ${studentAnsIdx}]` : ""} "${studentSelectedVal}"\n`;
        perfSummary += `- Result: ${isCorrect ? "CORRECT ✅" : "INCORRECT ❌"}\n`;
        perfSummary += `- Syllabus explanation: ${q.explanation}\n\n`;
      });

      // System instruction explaining their tutoring persona
      const systemInstruction = `You are "Naija CBT AI Tutor", an expert, positive, and deeply encouraging Nigerian academic tutor specializing in ${examLabel} preparations.
Your goal is to guide the student to perform exceptionally well and achieve high grades/scores in their local exams through premium conceptual mentoring.

You have access to the student's recent practice mock exam details on the subject: "${subjectLabel}".

Here is the exact layout of their exam results:
=========================================
${perfSummary}
=========================================

RULES OF INTERACTION:
1. Speak with the warmth, zeal, and friendly enthusiasm of a supportive Nigerian classroom mentor or Lagos study-hub coach ("Excellent try!", "You're getting there!", "Let's crack this together", "Correct answer is simple!").
2. Dynamic syllabus context: Adapt perfectly to ${examLabel} rules and constraints.
3. Highlight which topics they did well in and which ones need deep study-room attention (e.g., cell biology, organic chemistry, indices, mechanics) based on their score.
4. Walk them through problem-solving steps carefully. Use clear markdown and logical bullet points for formulas/expressions.
5. When they query about a specific question (e.g., "Explain Question 2"), look up the details in the layout above and provide an engaging, easy-to-understand academic breakdown.
6. Offer to give them a parallel practice problem to try out if they seem stuck.
7. Keep answers concise, direct, helpful, and highly legible. Always write in standard English with a touch of polite Nigerian educational warmth.`;

      // Convert message history to @google/genai format
      const contentsPayload = messages.map((msg: any) => ({
        role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.content || msg.text || "" }],
      }));

      // Call Gemini using robust retry and fallback mechanism to circumvent any temporary resource constraints (503)
      const response = await generateWithFallbackAndRetry(ai, {
        contents: contentsPayload,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "I was unable to formulate an explanation. Let's try again!";
      res.json({ text: replyText });
    } catch (err: any) {
      console.error("Tutoring API error:", err);
      res.status(500).json({ error: err.message || "Something went wrong on the server." });
    }
  });

  // Vite middleware for development or static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
