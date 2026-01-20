
import { GoogleGenAI } from "@google/genai";
import { AppModel } from "../types";

export interface CategorizedImage {
  data: string;
  mimeType: string;
  label: string;
}

export interface VideoGenerationResult {
  blobUrl: string;
  videoObject: any;
}

export class GeminiService {
  constructor() {}

  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateInitialFrames(prompt: string, categorizedImages: CategorizedImage[]) {
    const ai = this.getClient();
    const parts: any[] = categorizedImages.map(img => ([
      { text: `Directorial reference for ${img.label}:` },
      {
        inlineData: {
          data: img.data.split(',')[1] || img.data,
          mimeType: img.mimeType
        }
      }
    ])).flat();
    
    parts.push({ 
      text: `TASK: Generate 4 cinematic starting frames for a video based on the script: "${prompt}".
IDENTITY LOCK: The character provided in the 'Lead Character' reference MUST be the protagonist. Maintain their exact likeness, hair, facial structure, and clothing across all 4 frames.` 
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const results: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          results.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }
    }
    return results;
  }

  async refineFrame(baseImage: string, instructions: string) {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: baseImage.split(',')[1],
              mimeType: 'image/png'
            }
          },
          { text: `Refine this frame: ${instructions}. Maintain protagonist identity.` }
        ]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  }

  async generateVideo(
    model: AppModel, 
    prompt: string, 
    startFrame?: string, 
    referenceImages?: { data: string, mimeType: string, label: string }[],
    aspectRatio: '16:9' | '9:16' = '16:9'
  ): Promise<VideoGenerationResult> {
    const ai = this.getClient();
    
    let enhancedPrompt = prompt;
    const characterRef = referenceImages?.find(img => img.label.toLowerCase().includes('character'));
    if (characterRef) {
      enhancedPrompt = `CRITICAL IDENTITY MAPPING: The character from the reference MUST be the main subject. Script: ${prompt}`;
    }

    const config: any = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio
    };

    if (referenceImages && referenceImages.length > 0) {
      config.referenceImages = referenceImages.slice(0, 3).map(img => ({
        image: {
          imageBytes: img.data.split(',')[1] || img.data,
          mimeType: img.mimeType
        },
        referenceType: 'ASSET'
      }));
    }

    const payload: any = {
      model,
      prompt: enhancedPrompt,
      config
    };

    if (startFrame) {
      payload.image = {
        imageBytes: startFrame.split(',')[1],
        mimeType: 'image/png'
      };
    }

    let operation = await ai.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoObject = operation.response?.generatedVideos?.[0]?.video;
    const downloadUri = videoObject?.uri;
    if (!downloadUri) throw new Error("No video URI returned.");

    const res = await fetch(`${downloadUri}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    return {
      blobUrl: URL.createObjectURL(blob),
      videoObject: videoObject
    };
  }

  async extendVideo(previousVideoObject: any, prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<VideoGenerationResult> {
    const ai = this.getClient();
    
    let operation = await ai.models.generateVideos({
      model: AppModel.VEO_3_1,
      prompt: `STORY CONTINUITY: ${prompt}`,
      video: previousVideoObject,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoObject = operation.response?.generatedVideos?.[0]?.video;
    const downloadLink = videoObject?.uri;
    const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    return {
      blobUrl: URL.createObjectURL(blob),
      videoObject: videoObject
    };
  }
}
