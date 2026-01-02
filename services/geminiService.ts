import { GoogleGenAI } from "@google/genai";
import { PhotoSettings, DressType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert blob to base64 Data URL (includes prefix)
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export interface FaceAnalysisResult {
    rollAngle: number;
    faceBox: { ymin: number; xmin: number; ymax: number; xmax: number } | null;
}

// Analyze image to get face bounding box and tilt angle
export const getFaceAnalysis = async (imageInput: string): Promise<FaceAnalysisResult> => {
    try {
        const model = 'gemini-2.5-flash';
        
        let mimeType = 'image/jpeg';
        let imageBase64 = imageInput;
        if (imageInput.startsWith('data:')) {
            const parts = imageInput.split(',');
            if (parts.length === 2) {
                 const mimeMatch = parts[0].match(/:(.*?);/);
                 if (mimeMatch) mimeType = mimeMatch[1];
                 imageBase64 = parts[1];
            }
        }

        const prompt = `
            Analyze this passport photo candidate.
            1. Detect the main face box [ymin, xmin, ymax, xmax] (0-1000 scale).
            2. Estimate head tilt roll angle in degrees to make eyes level.
            Return JSON: { "rollAngle": number, "faceBox": [ymin, xmin, ymax, xmax] }
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: imageBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text; 
        if (!text) return { rollAngle: 0, faceBox: null };
        
        const data = JSON.parse(text);
        return {
            rollAngle: data.rollAngle || 0,
            faceBox: data.faceBox ? {
                ymin: data.faceBox[0],
                xmin: data.faceBox[1],
                ymax: data.faceBox[2],
                xmax: data.faceBox[3]
            } : null
        };

    } catch (e) {
        console.error("Face analysis failed", e);
        return { rollAngle: 0, faceBox: null };
    }
};

export const generatePassportPhoto = async (
  imageInput: string,
  settings: PhotoSettings
): Promise<string> => {
    // Determine mime type and base64 data
    let mimeType = 'image/jpeg';
    let imageBase64 = imageInput;
    if (imageInput.startsWith('data:')) {
        const parts = imageInput.split(',');
        if (parts.length === 2) {
            const mimeMatch = parts[0].match(/:(.*?);/);
            if (mimeMatch) mimeType = mimeMatch[1];
            imageBase64 = parts[1];
        }
    }

    let dressPrompt = "Keep original clothing.";
    if (settings.dress !== DressType.None) {
        const dressDesc = settings.dress === DressType.Custom ? settings.customDressDescription : settings.dress;
        dressPrompt = `Change clothing to: ${dressDesc}. Ensure the clothing fits naturally and looks professional.`;
    }

    // New logic for face brightening with intensity
    let faceBrighteningPrompt = "";
    if (settings.brightenFace || settings.brightenFaceIntensity > 0) {
        const intensity = settings.brightenFaceIntensity;
        faceBrighteningPrompt = `Slightly brighten the face (${intensity}% intensity) to improve visibility, but keep it natural.`;
    }

    // Refined prompt to prevent text generation on image
    const prompt = `
        Transform this image into a professional passport photo.
        
        STRICT INSTRUCTIONS:
        1. Background: Change background to a solid ${settings.bgColor} color.
        2. Clothing: ${dressPrompt}
        3. Face: ${settings.smoothFace ? "Apply subtle skin smoothing to reduce noise." : "Keep skin texture natural."}
        4. Lighting: ${settings.enhanceLighting ? "Balance the lighting for a studio look." : "Keep original lighting."}
        5. ${faceBrighteningPrompt}
        
        NEGATIVE CONSTRAINTS (CRITICAL):
        - DO NOT add any text, code, overlay, numbers, or watermarks on the image.
        - DO NOT change the person's identity or facial features.
        - DO NOT distort the face.
        - Output MUST be a clean photo only.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: imageBase64 } },
                { text: prompt }
            ]
        },
        config: {
            imageConfig: {
                aspectRatio: "3:4" 
            }
        }
    });

    // Check parts for the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
    }
    
    // If we get here, no image was generated.
    if (response.text) {
        console.warn("Gemini Refusal:", response.text);
        let errorMsg = response.text;
        if (errorMsg.length > 200) errorMsg = errorMsg.substring(0, 200) + "...";
        throw new Error(errorMsg);
    }
    
    throw new Error("No image generated. Please try a different photo or setting.");
};