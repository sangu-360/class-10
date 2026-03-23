import OpenAI from 'openai';

// Client-side: Using Groq API key from environment variables.
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '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',
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true
});

export async function generateQuestions(subject: string, topic: string, count: number = 3) {
  const prompt = `Generate ${count} multiple choice questions for a test on ${subject}, specifically focusing on the topic: ${topic}. 
  Return the response as a JSON array of objects. Each object must have:
  - "type": always "mcq"
  - "text": the question text
  - "options": an array of exactly 4 string options
  - "correctAnswer": the integer index of the correct option (0 to 3)
  - "explanation": explanation of the correct answer
  Do not include any markdown formatting like \`\`\`json, just return the raw JSON array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful educational assistant that outputs raw, valid JSON arrays.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const text = response.choices[0]?.message?.content || '[]';
    // Clean up potential markdown formatting if the model still includes it
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
}

export async function evaluateCode(code: string, language: string) {
  if (!code || code.trim() === '') {
    return '';
  }

  const prompt = `You are a strict code compiler and executor for ${language}. 
  Analyze the following code EXACTLY as written. DO NOT fix any typos, syntax errors, or logical mistakes.
  
  1. If there are syntax errors, compilation errors, or runtime errors (e.g., invalid comments, missing semicolons, undefined variables), output ONLY the error message exactly as a real compiler or interpreter would.
  2. If the code is completely valid, simulate its execution and output ONLY the exact stdout result.
  3. If the code is empty, output nothing.
  
  CRITICAL INSTRUCTIONS:
  - Do not include any explanations, markdown formatting, or conversational text. 
  - Output ONLY the raw compiler error or the raw execution output. 
  - NEVER output phrases like "execution successfully", "Hello World", or "The code is valid" unless the code explicitly prints them.
  - If the code has a syntax error (like a wrong comment format), you MUST output the syntax error.
  
  Code to evaluate:
  \`\`\`${language}
  ${code}
  \`\`\``;

  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a strict code execution engine. Output only the result of the execution or the compiler errors. Never fix the user\'s code. Never output conversational text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0
    });

    let output = response.choices[0]?.message?.content?.trim() || 'No output';
    
    // Strip markdown code blocks if present
    if (output.startsWith('\`\`\`')) {
      const lines = output.split('\n');
      if (lines.length >= 2) {
        // Remove first line (e.g., ```plain)
        lines.shift();
        // Remove last line if it's ```
        if (lines[lines.length - 1].trim() === '\`\`\`') {
          lines.pop();
        }
        output = lines.join('\n').trim();
      }
    }
    
    return output;
  } catch (error) {
    console.error("Error evaluating code:", error);
    return "Error: Could not evaluate code at this time.";
  }
}

export async function generateCodingQuestions(subject: string, topic: string, count: number = 1) {
  const prompt = `Generate ${count} coding questions for a test on ${subject}, specifically focusing on the topic: ${topic}. 
  Return the response as a JSON array of objects. Each object must have:
  - "type": always "coding"
  - "text": the coding problem description and requirements
  - "initialCode": initial boilerplate code for the student to start with
  - "explanation": explanation of the expected solution or algorithm
  Do not include any markdown formatting like \`\`\`json, just return the raw JSON array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful educational assistant that outputs raw, valid JSON arrays.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const text = response.choices[0]?.message?.content || '[]';
    // Clean up potential markdown formatting if the model still includes it
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error generating coding questions:", error);
    throw error;
  }
}
