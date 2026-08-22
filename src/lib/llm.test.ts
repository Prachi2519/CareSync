import { afterEach, describe, expect, it } from "vitest";
import { summarizeSymptoms, summarizeVisit } from "@/lib/llm";

const originalKey = process.env.GROQ_API_KEY;
afterEach(() => { process.env.GROQ_API_KEY = originalKey; });

describe("safe LLM fallbacks", () => {
  it("escalates emergency symptom phrases without an API key", async () => {
    delete process.env.GROQ_API_KEY;
    const result = await summarizeSymptoms("Sudden chest pain and difficulty breathing");
    expect(result.urgency).toBe("HIGH");
    expect(result.source).toBe("fallback");
    expect(result.suggestedQuestions).toHaveLength(3);
  });

  it("returns a useful post-visit summary when the provider is unavailable", async () => {
    delete process.env.GROQ_API_KEY;
    const result = await summarizeVisit("Rest and return if fever worsens", "Paracetamol once daily");
    expect(result.source).toBe("fallback");
    expect(result.medicationSchedule).toContain("Paracetamol");
    expect(result.followUpSteps.length).toBeGreaterThan(0);
  });
});
