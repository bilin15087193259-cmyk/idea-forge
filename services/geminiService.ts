import { GoogleGenAI } from "@google/genai";
import { PromptConfig } from "../types";

const formatTwoDigits = (num: number) => num.toString().padStart(2, '0');

export const generateFormattedNote = async (input: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${formatTwoDigits(now.getMonth() + 1)}-${formatTwoDigits(now.getDate())}`;
  const timeStr = `${formatTwoDigits(now.getHours())}:${formatTwoDigits(now.getMinutes())}`;

  const systemInstruction = `
You are an expert thought organizer assistant. Your goal is to transform the user's natural language input into a structured, clean Markdown format suitable for Obsidian.

## Output Requirements:
1. You MUST ONLY output Markdown. Do not include any explanations, preambles, or conversational filler.
2. The top header MUST be in this exact format: # Idea — ${dateStr} ${timeStr}
3. You must extract and generate three core fields:
   - **Idea:** Refine the main idea (short, clear).
   - **Why:** Briefly explain why this is worth recording (infer from context).
   - **Next Step:** A concrete, actionable next step.
4. Generate 1-3 tags (without hashtags in the list) that summarize the topic.
5. In the 'Category' field, output them as Markdown tags (e.g., #Tag1 #Tag2).
6. You MUST include the original input at the very end under a separator.

## Output Format Template:

# Idea — ${dateStr} ${timeStr}

- **Idea:** {Refined Idea}
- **Why:** {Reasoning}
- **Next Step:** {Actionable Step}
- **Category:** #{Tag1} #{Tag2}

---
**Raw Input:**
{Original User Input}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: input,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, // Slight creativity for "Why" and "Next Step" inferencing
      }
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("No content generated from the model.");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};