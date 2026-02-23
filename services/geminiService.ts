import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppMode, AIResponse, SupportedLanguage } from "../types";

// Define the schema for the AI response to ensure structured data
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short, concise title for the solution or question." },
    explanation: { type: Type.STRING, description: "A detailed markdown explanation. Must include: Logic Breakdown, Purpose of sections, and Optimizations/Best Practices." },
    code: { type: Type.STRING, description: "The solution code or formula." },
    language: { 
      type: Type.STRING, 
      enum: [SupportedLanguage.PYTHON, SupportedLanguage.SQL, SupportedLanguage.DAX, SupportedLanguage.EXCEL, SupportedLanguage.UNKNOWN],
      description: "The programming language or tool used."
    },
    executionOutput: {
      type: Type.OBJECT,
      description: "The simulated output of running the code against a demo Retail/Sales database.",
      properties: {
        outputType: { 
          type: Type.STRING, 
          enum: ['text', 'table', 'error'],
          description: "Format of the output. Use 'table' for SQL/Dataframe results, 'text' for logs/scalar values."
        },
        content: {
          type: Type.STRING,
          description: "The actual output content. If outputType is table, provide a JSON string representing a 2D array (rows). If text, just the string."
        }
      },
      required: ["outputType", "content"]
    }
  },
  required: ["title", "explanation", "code", "language", "executionOutput"]
};

const SYSTEM_INSTRUCTION = `
You are CodeInsight, an expert AI coding assistant specializing in Data Analytics and Engineering. 
You are an expert in Python, SQL, PowerBI DAX, and Excel Formulas.

Your goal is to either SOLVE questions provided by the user OR GENERATE practice questions based on a topic.

CONTEXT:
Assume we are working with a standard "Demo Retail Database" (like AdventureWorks or Northwind) containing:
1. 'Sales' table (OrderID, Date, ProductID, CustomerID, Quantity, Amount)
2. 'Products' table (ProductID, ProductName, Category, UnitPrice)
3. 'Customers' table (CustomerID, CustomerName, Region, Segment)
4. 'Dates' table (Date, Month, Quarter, Year)

INSTRUCTIONS:
1. **Detailed Explanation**: Provide a comprehensive explanation in Markdown. You MUST structure it with the following sections:
   - **Logic Breakdown**: Divide the solution into logical steps.
   - **Code Explanation**: Explain the purpose of key functions, clauses, or formulas.
   - **Optimizations & Best Practices**: Highlight efficiency tips, alternative approaches, or industry standards relevant to the code.
2. **Code**: Provide the exact, executable code snippet.
   - **IMPORTANT**: Format the code with proper indentation and newlines. Do NOT provide one-liners. Readability is key.
3. **Execution Simulation**: SIMULATE the execution of this code against the Demo Database. 
   - If it's SQL, return a JSON 2D array representing the resulting query table.
   - If it's Python, return the print output or DataFrame head (as a table or text).
   - If it's DAX, return the calculated measure value or table.
   - If it's Excel, return the calculated cell result.
4. **Generator Mode**: If the user asks for a "Question" or is in Generator mode, create a challenging interview-style question and provide the solution immediately using the format above.

Ensure the 'executionOutput' is realistic based on the demo database schema provided.
`;

export const generateContent = async (
  prompt: string, 
  mode: AppMode, 
  imageBase64?: string
): Promise<AIResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is missing");

  const ai = new GoogleGenAI({ apiKey });

  let fullPrompt = prompt;
  if (mode === AppMode.GENERATOR) {
    fullPrompt = `Generate a challenging interview question and solution about: ${prompt}`;
  }

  const parts: any[] = [{ text: fullPrompt }];
  
  if (imageBase64) {
    parts.unshift({
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png', // Assuming PNG for simplicity in this demo, typically would detect
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    
    // Normalize table content if it comes as a stringified JSON
    let cleanContent = parsed.executionOutput.content;
    if (parsed.executionOutput.outputType === 'table' && typeof cleanContent === 'string') {
        try {
            // Sometimes the model double-encodes or just puts the raw string representation
            // We'll try to parse it if it looks like an array
            if (cleanContent.trim().startsWith('[')) {
                cleanContent = JSON.parse(cleanContent);
            }
        } catch (e) {
            console.warn("Failed to parse table content", e);
            // Fallback to text if parsing fails
            parsed.executionOutput.outputType = 'text'; 
        }
    }

    return {
      ...parsed,
      executionOutput: {
        ...parsed.executionOutput,
        content: cleanContent
      }
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};