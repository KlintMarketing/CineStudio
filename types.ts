
export interface ImageInput {
  id: string;
  type: 'character' | 'location' | 'object' | 'other';
  data: string | null; // base64
  name: string;
}

export interface StoryboardShot {
  id: string;
  prompt: string;
  duration: number;
  image: string | null; // Reference image for this specific shot
}

export interface ProjectHistory {
  id: string;
  timestamp: number;
  mainPrompt: string;
  videoUrl?: string; // Blob URL for local display
  videoObject?: any; // Original video object from API for extension
  modelUsed: string;
  initialFrames: string[];
}

export enum AppModel {
  VEO_3_FAST = 'veo-3.1-fast-generate-preview',
  VEO_3_1 = 'veo-3.1-generate-preview'
}
