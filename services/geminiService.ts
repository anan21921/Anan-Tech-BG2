import { GoogleGenAI } from "@google/genai";
import { PhotoSettings, DressType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generatePassportPhoto = async (
  imageBase64: string,
  settings: PhotoSettings
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';

    let prompt = `
      Task: Edit this photo to create a strictly professional passport-sized ID photo.
      
      Requirements:
      1. Crop and frame: Center the head and shoulders perfectly for a passport photo (Aspect ratio 40mm width x 50mm height). The face should take up about 70-80% of the frame.
      2. Background: Replace the entire background with a solid ${settings.bgColor} color. Ensure clean separation between hair/clothes and background.
      3. Lighting: ${settings.enhanceLighting ? 'Correct the lighting to be even, professional studio lighting. Remove harsh shadows.' : 'Ensure lighting is balanced.'}
      4. Face: ${settings.smoothFace ? 'Lightly smooth the skin and remove blemishes while keeping the person looking natural and recognizable. Do not alter facial structure.' : 'Keep the face natural.'}
      5. Look: The subject should look straight at the camera.
    `;

    if (settings.dress !== DressType.None) {
      prompt += `
      6. Clothing: Change the person's outfit to a ${settings.dress}. Ensure the clothing fits naturally at the neck and shoulders.
      `;
    } else {
      prompt += `
      6. Clothing: Keep the original clothing but ensure it looks neat.
      `;
    }

    prompt += `
      Output: Return ONLY the processed image. High resolution.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    // Check for image in response
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }

    throw new Error("No image generated.");

  } catch (error) {
    console.error("Error generating passport photo:", error);
    throw error;
  }
};