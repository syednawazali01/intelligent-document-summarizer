
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  error?: boolean;
}