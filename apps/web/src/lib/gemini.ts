import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    model?: string;
    prompt?: string;
    systemInstruction?: string;
  };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

export interface PipelineData {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export async function generatePipeline(prompt: string): Promise<PipelineData> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a visual pipeline of AI models to accomplish this task: "${prompt}".
    Available models:
    - gemini-3.1-pro-preview (Complex reasoning, coding, writing)
    - gemini-3-flash-preview (General tasks, fast)
    - gemini-3.1-flash-image-preview (Image generation)
    - claude-3-opus (Alternative reasoning)
    - cursor-ai (Code generation)
    - jules-ai (Data analysis)
    
    Return a JSON object with 'nodes' and 'edges'.
    Nodes should have: id, type (e.g., 'modelNode', 'inputNode', 'outputNode'), position (x, y), and data (label, model, prompt).
    Edges should have: id, source, target.
    Space the nodes out horizontally (x += 300).`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                position: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                  }
                },
                data: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    model: { type: Type.STRING },
                    prompt: { type: Type.STRING }
                  }
                }
              }
            }
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                source: { type: Type.STRING },
                target: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse pipeline JSON", e);
    return { nodes: [], edges: [] };
  }
}

export async function chat(history: { role: string; parts: { text: string }[] }[], message: string) {
  const chatSession = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are OrenSymphony, an advanced AI orchestrator assistant. You help users build, connect, and manage AI pipelines.",
    }
  });
  
  // We can't easily set history in the create() method in this SDK version without passing it correctly, 
  // so we'll just append the history to the message for simplicity if needed, or use the SDK's history if supported.
  // The @google/genai SDK supports passing history to chats.create:
  // Actually, let's just use generateContent with the history array.
  
  const contents = [...history, { role: "user", parts: [{ text: message }] }];
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents as any,
    config: {
      systemInstruction: "You are OrenSymphony, an advanced AI orchestrator assistant. You help users build, connect, and manage AI pipelines.",
    }
  });
  
  return response.text;
}

export async function generateImage(prompt: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    },
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function executeTextModel(model: string, prompt: string, inputData: string): Promise<string> {
  // Fallback to gemini if it's a simulated external model for this demo
  const actualModel = model.includes("gemini") ? model : "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model: actualModel as any,
    contents: `Task: ${prompt}\n\nInput Data: ${inputData}`
  });
  
  return response.text || "";
}
