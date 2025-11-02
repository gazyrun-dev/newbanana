export type Theme = 'light' | 'dark';
export type Mode = 'single' | 'multi' | 'video' | 'character';
export type AspectRatio = '16:9' | '9:16';
export type OutputStatus = 'pending' | 'generating' | 'complete' | 'error';

export interface UploadedImage {
  id: number;
  file: File;
  base64Data: string;
}

export interface Prompt {
    id: number;
    text: string;
}

export interface Output {
  id: number;
  sourceImageId: number | null; // null for video from text
  promptText: string;
  imageUrl: string | null;
  videoUrl: string | null;
  status: OutputStatus;
  error: string | null;
  type: 'image' | 'video';
  progressMessage?: string;
}