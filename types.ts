
export interface TranscriptEntry {
  id: number;
  speaker: 'user' | 'ai';
  text: string;
}

export enum AppState {
  Idle = 'IDLE',
  Connecting = 'CONNECTING',
  Listening = 'LISTENING',
  Error = 'ERROR',
}

export interface LanguageOption {
  code: string;
  name: string;
  emoji: string;
}