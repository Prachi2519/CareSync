import { Urgency } from "@prisma/client";
import { POST_VISIT_PROMPT, PRE_VISIT_PROMPT } from "@/lib/prompts";

type PreVisitResult = {
  urgency: Urgency;
  chiefComplaint: string;
  suggestedQuestions: string[];
  source: "llm" | "fallback";
};

type PostVisitResult = {
  summary: string;
  medicationSchedule: string;
  followUpSteps: string[];
  source: "llm" | "fallback";
};

async function completeJson(system: string, user: string) {
  if (!process.env.GROQ_API_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`LLM responded with ${response.status}`);
    const body = await response.json();
    return JSON.parse(body.choices?.[0]?.message?.content || "null") as Record<string, unknown> | null;
  } catch (error) {
    console.error("LLM request failed; using fallback summary", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function summarizeSymptoms(symptoms: string): Promise<PreVisitResult> {
  const result = await completeJson(PRE_VISIT_PROMPT, `Symptoms: ${symptoms}`);
  if (result && ["LOW", "MEDIUM", "HIGH"].includes(String(result.urgency))) {
    return {
      urgency: result.urgency as Urgency,
      chiefComplaint: String(result.chiefComplaint || symptoms.slice(0, 240)),
      suggestedQuestions: Array.isArray(result.suggestedQuestions)
        ? result.suggestedQuestions.slice(0, 3).map(String)
        : [],
      source: "llm",
    };
  }

  const normalized = symptoms.toLowerCase();
  const high = ["chest pain", "difficulty breathing", "can't breathe", "fainting", "heavy bleeding", "stroke", "suicidal"];
  const medium = ["fever", "vomiting", "persistent pain", "infection", "dizziness", "worsening"];
  const urgency: Urgency = high.some((word) => normalized.includes(word))
    ? "HIGH"
    : medium.some((word) => normalized.includes(word))
      ? "MEDIUM"
      : "LOW";
  return {
    urgency,
    chiefComplaint:
      urgency === "HIGH"
        ? `Potentially urgent symptoms reported: ${symptoms.slice(0, 220)}. Seek emergency care now if symptoms are severe or worsening.`
        : symptoms.slice(0, 240),
    suggestedQuestions: [
      "When did these symptoms begin, and have they changed?",
      "What makes the symptoms better or worse?",
      "Are there relevant medicines, allergies, or prior conditions?",
    ],
    source: "fallback",
  };
}

export async function summarizeVisit(notes: string, prescription?: string): Promise<PostVisitResult> {
  const result = await completeJson(POST_VISIT_PROMPT, `Clinical notes: ${notes}\nPrescription: ${prescription || "None"}`);
  if (result) {
    return {
      summary: String(result.summary || notes),
      medicationSchedule: String(result.medicationSchedule || prescription || "No medication recorded"),
      followUpSteps: Array.isArray(result.followUpSteps) ? result.followUpSteps.map(String).slice(0, 5) : [],
      source: "llm",
    };
  }
  return {
    summary: `Your clinician recorded: ${notes}`,
    medicationSchedule: prescription || "No medication was recorded for this visit.",
    followUpSteps: ["Follow the care instructions provided by your clinician.", "Contact the clinic if symptoms worsen or you have concerns."],
    source: "fallback",
  };
}
