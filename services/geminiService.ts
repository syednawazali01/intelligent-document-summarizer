import { GoogleGenAI, Chat } from "@google/genai";

// IMPORTANT: Do NOT configure an API KEY here.
// The API KEY is automatically managed by the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

export type SummaryMode = 'LEGAL' | 'FINANCIAL' | 'DUAL';

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  const base64Data = await fileToBase64(file);
  const filePart = {
    inlineData: {
      mimeType: file.type,
      data: base64Data,
    },
  };
  
  const prompt = "Extract all text from this document. Preserve formatting as much as possible.";

  try {
    const response = await ai.models.generateContent({
      model, // gemini-2.5-flash is multimodal
      contents: { parts: [filePart, {text: prompt}] },
    });
    return response.text;
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error);
    // Re-throw a more user-friendly error
    throw new Error(`Failed to process file "${file.name}". The file type may be unsupported or the file could be corrupt.`);
  }
};

export const generateSummaries = async (originalText: string, mode: SummaryMode): Promise<string> => {
  if (!originalText.trim()) {
    return "Please provide the document to summarize.";
  }

  const prompt = `You are an intelligent NLP summarization model trained to handle complex **Legal** and **Financial** documents. 
Your goal is to produce accurate, concise, and trustworthy summaries — without distorting any factual, legal, or financial details.


SELECT MODE:
- Mode: [${mode}]

When Mode = LEGAL:
  → Focus on legal case background, involved parties, legal issues, key rulings, court reasoning, and outcomes.
  → Maintain formal tone with legal accuracy and clarity.
  → Avoid opinions; stick to judicial logic.

When Mode = FINANCIAL:
  → Focus on financial performance, metrics, trends, decisions, obligations, and implications.
  → Maintain a professional analytical tone suitable for business summaries.

When Mode = DUAL:
  → Combine both legal and financial relevance — highlight connections between legal rulings and financial implications.


TASK INSTRUCTIONS:
Generate two separate summaries for the given text:

1. **Extractive Summary**
   - Directly uses sentences or phrases from the original text.
   - Keep it concise and factual (bullet or paragraph form).
   - Do NOT paraphrase.

2. **Abstractive Summary**
   - Rephrase and condense the document into clear, professional language.
   - Maintain the same factual and legal/financial meaning.
   - Should be easy to understand for non-experts.
   - Limit to 250–400 words.

3. **Main Points**
   - 5–8 bullet points summarizing the key takeaways.
   - **Each bullet point should be formatted in bold for emphasis.**

At the end, append this line:
“Note: This summary is generated for educational and research purposes only.”


STYLE GUIDELINES:
- Preserve all names, dates, amounts, judgments, and key terms exactly.
- Avoid bias, speculation, or omission of critical facts.
- Use neutral, professional, and formal language.
- Separate each section with clear headings.


OUTPUT FORMAT:
**Extractive Summary:**
<model output>

**Abstractive Summary:**
<model output>

**Main Points:**
**• point 1**
**• point 2**
**• ...**

**Document to Summarize:**
---
${originalText}
---
`;

  try {
    const response = await ai.models.generateContent({
        model,
        contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Error generating summaries:", error);
    return "An error occurred while generating the summaries. Please check the console for details.";
  }
};


export const createChatSession = (): Chat => {
  return ai.chats.create({
    model,
    // You can add a system instruction to guide the chatbot's behavior
    config: {
        systemInstruction: "You are a helpful AI assistant. You can answer questions about concepts from the summarized documents, explain terminology, or discuss the documents' content. Always provide information for educational purposes and not as professional advice."
    }
  });
};