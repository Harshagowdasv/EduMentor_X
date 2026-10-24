import { SafetySeverity } from '../../types';

export interface AIChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AISafetyAssessment {
  severity: SafetySeverity;
  contextSummary: string;
  confidenceReasoning: string;
  isEscalated: boolean;
  supportiveResponse: string;
}

export interface AIResponse {
  text: string;
  emotion: 'idle' | 'speaking' | 'happy' | 'concerned' | 'thinking';
  safety: AISafetyAssessment;
}

export interface IAIService {
  chat(
    studentMessage: string,
    history: AIChatMessage[],
    studentContext?: {
      name: string;
      cgpa: number;
      attendance: number;
      studyHours: number;
      assignedMentorName?: string;
      mentorId?: string;
      studentId: string;
      usn: string;
      department?: string;
    }
  ): Promise<AIResponse>;

  assessSafetyRisk(message: string, history: AIChatMessage[]): AISafetyAssessment;
}
