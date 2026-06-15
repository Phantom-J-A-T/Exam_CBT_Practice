import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse incoming JSON payloads
  app.use(express.json());

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Guided UTME/CBT Tutoring endpoint
  app.post("/api/tutoring/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Gemini API Key is missing. Please add GEMINI_API_KEY inside Settings > Secrets."
        });
      }

      const { subject, questions, answeredQuestions, messages } = req.body;

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
        maths: "Mathematics (UTME/JAMB Level)",
        english: "Use of English (UTME/JAMB Level)",
        physics: "Physics (UTME/WAEC Level)",
        chemistry: "Chemistry (UTME/WAEC Level)",
        biology: "Biology (UTME/JAMB Level)",
      };
      const subjectLabel = subjectLabels[subject] || subject;

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
        perfSummary += `- Short syllabus explanation: ${q.explanation}\n\n`;
      });

      // System instruction explaining their tutoring persona
      const systemInstruction = `You are "Naija CBT AI Tutor", an expert, positive, and deeply encouraging Nigerian academic tutor specializing in UTME/JAMB entrance preparations.
Your goal is to guide the student to score 280+ in their exams through premium conceptual mentoring.

You have access to the student's recent practice exam details on: "${subjectLabel}".

Here is the exact layout of their exam results:
=========================================
${perfSummary}
=========================================

RULES OF INTERACTION:
1. Speak with the warmth and enthusiasm of a supportive Nigerian classroom mentor or study-hub coach ("Excellent try!", "You're getting there!", "Let's crack this together").
2. Highlight which topics they did well in and which ones need attention (e.g., Charles' law/Trigonometry) based on their scores.
3. Walk them through problem-solving steps carefully. Use clear markdown and logical bullet points for formulas/expressions.
4. When they query about a specific question (e.g., "Explain Question 2"), look up the details in the layout above and provide an engaging, easy-to-understand breakdown.
5. Offer to give them a parallel practice problem to try out if they seem stuck.
6. Keep answers concise, direct, helpful, and highly legible. Always write in standard English with a touch of polite Nigerian educational warmth.`;

      // Convert message history to @google/genai format
      const contentsPayload = messages.map((msg: any) => ({
        role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.content || msg.text || "" }],
      }));

      // Call Gemini 3.5 Flash for fast tutoring
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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
