import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function gradeCodingAnswer(questionText: string, studentCode: string, totalMarks: number): Promise<{ score: number, feedback: string }> {
  if (!studentCode || studentCode.trim() === '') {
    return { score: 0, feedback: "No code provided." };
  }

  const prompt = `You are an expert programming instructor grading a student's code.
Question:
${questionText}

Student's Code:
${studentCode}

Total Marks Available: ${totalMarks}

Evaluate the code based on logic, effort, and correctness. 
- If the student hardcoded the output (e.g., just printing the expected output without logic), give 0 marks.
- If the student attempted the logic but has minor syntax errors or edge-case failures, give partial marks (e.g., 50% to 80% of total marks).
- If the code is completely correct and optimal, give full marks.
- The score must be an integer between 0 and ${totalMarks}.

Provide brief feedback explaining the score.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "The score awarded to the student."
            },
            feedback: {
              type: Type.STRING,
              description: "Brief feedback explaining the score."
            }
          },
          required: ["score", "feedback"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"score": 0, "feedback": "Failed to parse evaluation."}');
    return {
      score: Math.min(Math.max(result.score, 0), totalMarks),
      feedback: result.feedback
    };
  } catch (error) {
    console.error("Error grading code with Gemini:", error);
    return { score: 0, feedback: "Error occurred during AI evaluation." };
  }
}
