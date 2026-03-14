
import { GoogleGenAI, Type } from "@google/genai";
import { Language, RecipeContent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to extract and parse JSON from a model response that might contain markdown blocks.
 */
function safeParseJson(text: string): any {
  try {
    const cleaned = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse failed for text:", text, e);
    return null;
  }
}

export async function generateRecipeImage(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ 
          text: `A professional, high-end food photography shot of: ${prompt}. 
          Style: Michelin star restaurant plating, professional lighting, macro food photography.
          Visual details: Clear texture of the food, vibrant natural colors, shallow depth of field.
          Background: Clean, elegant minimalist bone white or stone background.
          IMPORTANT: STRICTLY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO WRITING ON THE IMAGE. NO LOGOS. NO WATERMARKS. NO BLURRY GRAPHICS.` 
        }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (!response.candidates?.[0]?.content?.parts) return null;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

export async function translateRecipe(content: RecipeContent, targetLang: Language): Promise<RecipeContent | null> {
  const prompt = `Translate this recipe JSON into ${targetLang === Language.HE ? 'Hebrew' : 'Spanish'}. Maintain the exact JSON structure. Return ONLY the JSON.
  
  Recipe: ${JSON.stringify(content)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["id", "name", "amount", "unit", "category"]
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["id", "text", "category"]
              }
            },
            notes: { type: Type.STRING },
            ovenInstructions: { type: Type.STRING }
          },
          required: ["title", "description", "ingredients", "instructions"]
        }
      }
    });

    if (!response.text) return null;
    return safeParseJson(response.text);
  } catch (error) {
    console.error("Error translating recipe:", error);
    return null;
  }
}

export async function importRecipeFromUrl(url: string, targetLang: Language): Promise<RecipeContent | null> {
  const prompt = `Visit this URL: ${url} and extract the recipe information.
  Provide the result in ${targetLang === Language.HE ? 'Hebrew' : 'Spanish'}.
  Return a JSON object with title, description, ingredients, and instructions.
  Each ingredient must have an 'id' (random string), 'name', 'amount' (number), 'unit' (one of: gram, kg, tsp, tbsp, cup, pinch, drizzle, units, ml, liters), and 'category'.
  Each instruction step must have an 'id' (random string), 'text', and 'category'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["id", "name", "amount", "unit", "category"]
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["id", "text", "category"]
              }
            },
            notes: { type: Type.STRING },
            ovenInstructions: { type: Type.STRING }
          },
          required: ["title", "description", "ingredients", "instructions"]
        }
      }
    });

    if (!response.text) return null;
    return safeParseJson(response.text);
  } catch (error) {
    console.error("Error importing recipe from URL:", error);
    return null;
  }
}
