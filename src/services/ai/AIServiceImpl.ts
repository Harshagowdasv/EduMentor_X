import { IAIService, AIChatMessage, AIResponse, AISafetyAssessment } from '../interfaces/IAIService';
import { evaluateMessageSafety } from '../aiSafetyEngine';
import { auth } from '../firebase/firebaseConfig';

export class AIServiceImpl implements IAIService {
  async chat(
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
    }
  ): Promise<AIResponse> {
    // 1. First, evaluate contextual safety risk
    const safetyAssessment = this.assessSafetyRisk(studentMessage, history);

    // If immediate danger or high concern, prioritize supportive safety response
    if (safetyAssessment.isEscalated) {
      return {
        text: safetyAssessment.supportiveResponse,
        emotion: 'concerned',
        safety: safetyAssessment,
      };
    }

    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

    // 2. Demo Mode -> Local AI fallback engine
    if (isDemoMode) {
      const localResponse = this.generateLocalAIResponse(studentMessage, studentContext);
      return {
        text: localResponse.text,
        emotion: localResponse.emotion,
        safety: safetyAssessment,
      };
    }

    // 3. Production Mode -> Call secure server endpoint /api/ai/chat with ID Token
    try {
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: studentMessage,
          history,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) {
          return {
            text: data.text,
            emotion: data.emotion || 'speaking',
            safety: data.safety || safetyAssessment,
          };
        }
      } else {
        const fallback = this.generateLocalAIResponse(studentMessage, studentContext);
        return {
          text: fallback.text,
          emotion: fallback.emotion,
          safety: safetyAssessment,
        };
      }
    } catch (err) {
      console.warn('[AI Service Network/Server Notice, using local fallback]:', err);
    }

    const fallbackResponse = this.generateLocalAIResponse(studentMessage, studentContext);
    return {
      text: fallbackResponse.text,
      emotion: fallbackResponse.emotion,
      safety: safetyAssessment,
    };
  }

  assessSafetyRisk(message: string, history: AIChatMessage[]): AISafetyAssessment {
    return evaluateMessageSafety(message, history);
  }

  private generateLocalAIResponse(
    message: string,
    context?: { name?: string; cgpa?: number; attendance?: number; studyHours?: number; assignedMentorName?: string }
  ): { text: string; emotion: 'speaking' | 'happy' | 'thinking' | 'concerned' } {
    const msg = message.toLowerCase();
    const studentName = context?.name || 'there';
    const mentorName = context?.assignedMentorName || 'your faculty mentor';

    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return {
        text: `Hello ${studentName}! I am your EduMentorX AI Assistant. I'm here to help with your studies, project ideas, time management, and career goals. How can I assist you today?`,
        emotion: 'happy',
      };
    }

    if (msg.includes('cgpa') || msg.includes('grade') || msg.includes('mark') || msg.includes('score')) {
      const cgpaText = context?.cgpa ? `Your current recorded CGPA is **${context.cgpa.toFixed(2)}**.` : 'Keep striving for academic excellence!';
      return {
        text: `${cgpaText} To elevate your academic score, I recommend dedicating 2-3 focused hours daily to problem-solving, reviewing lecture slides right after class, and consulting with ${mentorName}.`,
        emotion: 'speaking',
      };
    }

    if (msg.includes('project') || msg.includes('idea') || msg.includes('hackathon') || msg.includes('code')) {
      return {
        text: `Great initiative, ${studentName}! Here are 3 high-impact project ideas for your portfolio:\n\n` +
          "1. **EduMentorX AI Portal**: Full-stack dashboard with TypeScript & LLM integration.\n" +
          "2. **Smart Campus Asset Tracker**: IoT/Web app for tracking university lab hardware.\n" +
          "3. **Distributed Micro-Learning Platform**: Gamified flashcard system with WebSockets.\n\n" +
          `Would you like to build a detailed roadmap or review github setup for one of these?`,
        emotion: 'happy',
      };
    }

    if (msg.includes('resume') || msg.includes('interview') || msg.includes('career') || msg.includes('job')) {
      return {
        text: `Career preparation is key! Make sure your EduMentorX Portfolio is updated with your latest projects, certifications, and GitHub links. I can also help you structure an ATS-friendly single-page resume layout!`,
        emotion: 'speaking',
      };
    }

    if (msg.includes('study') || msg.includes('schedule') || msg.includes('time management')) {
      const hrsText = context?.studyHours ? `You currently log about **${context.studyHours} hours/week**.` : '';
      return {
        text: `Effective study habits win! ${hrsText} Try using the Pomodoro method (25 mins focus + 5 mins break) and group difficult topics early in your morning study blocks.`,
        emotion: 'thinking',
      };
    }

    return {
      text: `That is a great question, ${studentName}! As your AI Mentor, I recommend setting clear milestone goals for this semester. Don't forget you can also drop notes to ${mentorName} for one-on-one academic guidance! What specific area would you like to focus on next?`,
      emotion: 'speaking',
    };
  }
}
