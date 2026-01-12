import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResponse } from "../types";

// Utility to sleep for exponential backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanCode = (code: string): string => {
  // Remove non-breaking spaces and other invisible gremlins often found in web-copied code
  return code.replace(/\u00A0/g, ' ').trim();
};

export const analyzeCode = async (code: string): Promise<DiagnosisResponse> => {
  console.log(`[CodeDoctor] Starting analysis. Code length: ${code.length}`);
  
  if (!process.env.API_KEY) {
    console.error("[CodeDoctor] Critical Error: API Key is missing in environment variables.");
    throw new Error("API Key is missing in environment variables.");
  } else {
    console.log("[CodeDoctor] API Key present.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanedCode = cleanCode(code);

  const prompt = `
    请为初学者分析这段 Python 代码片段。
    
    待分析代码:
    """
    ${cleanedCode}
    """
    
    任务：
    1. 追踪逻辑流，找出错误。
    2. 如果发现错误，请生成“学习闪卡”数据。将具体的错误抽象为概念（例如：将 "df['a']" 的 KeyError 抽象为 "DataFrame 列索引机制"）。
    3. 返回结构化的诊断 JSON。确保所有文本为**中文**。
  `;

  const systemInstruction = `
    你是 'Code Doctor' (代码医生)，一位专为零基础初学者服务的 Python 教学专家。
    
    核心任务：
    1. 诊断代码逻辑。
    2. 为每一个发现的 **逻辑错误 (Error)** 生成一张 **闪卡 (Flashcard)**。
       - 闪卡应包含：核心概念名称、错误代码片段、正确代码片段、一句话原理解释。
    
    输出要求：
    - 不要使用晦涩的专业术语。多使用比喻。
    - 'trace' 数组代表执行流。
    - 'generatedFlashcards' 数组包含针对错误的练习题。
    - 针对错误代码，务必提供 'errorHighlight' 字段，指出具体出错的子字符串。
  `;

  // Define Schema
  const schema = {
    type: Type.OBJECT,
    properties: {
      rawError: {
        type: Type.STRING,
        description: "A one-sentence summary of the main pain point.",
      },
      trace: {
        type: Type.ARRAY,
        description: "The logic execution steps.",
        items: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["success", "warning", "error"] },
            title: { type: Type.STRING },
            desc: { type: Type.STRING },
            isError: { type: Type.BOOLEAN },
            badCode: { type: Type.STRING },
            errorHighlight: { type: Type.STRING, description: "The exact substring in badCode to highlight as the error source" },
            goodCode: { type: Type.STRING },
            reason: { type: Type.STRING },
            tip: { type: Type.STRING },
          },
          required: ["status", "title", "desc", "isError"],
        },
      },
      generatedFlashcards: {
        type: Type.ARRAY,
        description: "List of flashcards generated from the errors found.",
        items: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING, description: "The abstract concept name (e.g. Variable Naming)" },
            frontCode: { type: Type.STRING, description: "The specific line of code with the error" },
            errorHighlight: { type: Type.STRING, description: "The exact substring in frontCode to highlight" },
            backCode: { type: Type.STRING, description: "The corrected line of code" },
            explanation: { type: Type.STRING, description: "Why the fix works" },
          },
          required: ["concept", "frontCode", "backCode", "explanation"]
        }
      }
    },
    required: ["rawError", "trace"],
  };

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      console.log(`[CodeDoctor] Attempt ${attempts + 1}/${maxAttempts} - Sending request to Gemini...`);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          systemInstruction: systemInstruction,
          temperature: 0.4, 
        },
      });

      if (!response.text) {
        console.warn("[CodeDoctor] Received empty response from API.");
        throw new Error("Empty response from AI");
      }

      console.log("[CodeDoctor] Response received. Length:", response.text.length);
      // Helpful for debugging bad JSON structure
      if (process.env.NODE_ENV === 'development') {
         console.debug("[CodeDoctor] Raw text snippet:", response.text.substring(0, 500));
      }

      const parsedData = JSON.parse(response.text) as DiagnosisResponse;
      console.log("[CodeDoctor] JSON parsed successfully. Trace steps:", parsedData.trace?.length);
      return parsedData;

    } catch (error) {
      attempts++;
      console.error(`[CodeDoctor] Analysis failed on attempt ${attempts}:`, error);
      
      if (attempts >= maxAttempts) {
        console.error("[CodeDoctor] Exhausted all retry attempts.");
        throw new Error("Failed to analyze code after multiple attempts. Please try again.");
      }
      
      const backoff = 1000 * Math.pow(2, attempts - 1);
      console.log(`[CodeDoctor] Waiting ${backoff}ms before retry...`);
      await sleep(backoff);
    }
  }

  throw new Error("Unexpected error in retry loop.");
};