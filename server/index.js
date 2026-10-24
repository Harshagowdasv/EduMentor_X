import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createInitialAdminAccount, checkAdminStatus } from './initAdminService.js';
import { adminAuth, adminDb } from './firebaseAdmin.js';
import {
  createMentorAuthAccount,
  deactivateMentorAccount,
  reactivateMentorAccount,
  deleteMentorAccount,
  createAuthAccountWithPhonePassword,
  importStudentsBatch,
} from './accountService.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check Initial Admin Status
app.get('/api/admin/status', async (req, res) => {
  try {
    const status = await checkAdminStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One-Time Initial Admin Account Creation Endpoint
app.post('/api/admin/init-initial-admin', async (req, res) => {
  try {
    const { initialPassword } = req.body;

    if (!initialPassword) {
      return res.status(400).json({ error: 'initialPassword is required in request body.' });
    }

    const result = await createInitialAdminAccount(initialPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('[Admin Init Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create Mentor Endpoint (Auth Account + Firestore Profile)
app.post('/api/admin/create-mentor', async (req, res) => {
  try {
    const { name, email, phone, department, staffId, actorId } = req.body;
    const result = await createMentorAuthAccount({ name, email, phone, department, staffId, actorId });
    res.status(201).json(result);
  } catch (err) {
    console.error('[Create Mentor Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Deactivate Mentor Endpoint (Disables Auth + Firestore Status Inactive)
app.post('/api/admin/deactivate-mentor', async (req, res) => {
  try {
    const { mentorId, actorId } = req.body;
    if (!mentorId) return res.status(400).json({ error: 'mentorId is required.' });
    const result = await deactivateMentorAccount({ mentorId, actorId });
    res.json(result);
  } catch (err) {
    console.error('[Deactivate Mentor Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Reactivate Mentor Endpoint (Enables Auth + Firestore Status Active)
app.post('/api/admin/reactivate-mentor', async (req, res) => {
  try {
    const { mentorId, actorId } = req.body;
    if (!mentorId) return res.status(400).json({ error: 'mentorId is required.' });
    const result = await reactivateMentorAccount({ mentorId, actorId });
    res.json(result);
  } catch (err) {
    console.error('[Reactivate Mentor Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Delete Mentor Endpoint (Deletes Auth User + Firestore Doc)
app.post('/api/admin/delete-mentor', async (req, res) => {
  try {
    const { mentorId, actorId } = req.body;
    if (!mentorId) return res.status(400).json({ error: 'mentorId is required.' });
    const result = await deleteMentorAccount({ mentorId, actorId });
    res.json(result);
  } catch (err) {
    console.error('[Delete Mentor Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Create Mentor/Student Auth Account Endpoint (Generic)
app.post('/api/admin/create-user-auth', async (req, res) => {
  try {
    const { email, phone, role, name, department } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'email and role are required.' });
    }

    const result = await createAuthAccountWithPhonePassword({ email, phone, role, name, department });
    res.status(201).json(result);
  } catch (err) {
    console.error('[Create User Auth Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Import Students CSV Endpoint (Batch Auth + Firestore Documents)
app.post('/api/admin/import-students', async (req, res) => {
  try {
    const { csvRows, actorId, duplicateStrategy } = req.body;
    if (!Array.isArray(csvRows)) {
      return res.status(400).json({ error: 'csvRows array is required in request body.' });
    }
    const result = await importStudentsBatch({ csvRows, actorId, duplicateStrategy });
    res.json(result);
  } catch (err) {
    console.error('[Import Students Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Delete / Deactivate Student Endpoint
app.post('/api/admin/delete-student', async (req, res) => {
  try {
    const { studentId, actorId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId is required.' });

    if (adminDb) {
      const studentDocRef = adminDb.collection('students').doc(studentId);
      const studentSnap = await studentDocRef.get();

      if (studentSnap.exists) {
        const studentData = studentSnap.data();

        if (studentData.email && adminAuth) {
          try {
            const userRecord = await adminAuth.getUserByEmail(studentData.email).catch(() => null);
            if (userRecord) {
              await adminAuth.updateUser(userRecord.uid, { disabled: true });
            }
          } catch (authErr) {
            console.warn('[Admin Delete Student Auth Notice]:', authErr.message);
          }
        }

        await studentDocRef.set({
          academicStatus: 'Deactivated',
          status: 'DEACTIVATED',
          isDeactivated: true,
          mentorId: null,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        const allocQuery = await adminDb.collection('mentorAllocations')
          .where('studentId', '==', studentId)
          .where('status', '==', 'ACTIVE')
          .get();

        const batch = adminDb.batch();
        allocQuery.docs.forEach((docSnap) => {
          batch.update(docSnap.ref, { status: 'DEACTIVATED' });
        });
        await batch.commit().catch(() => null);

        await adminDb.collection('auditLogs').add({
          actorId: actorId || 'admin',
          actorName: 'Admin User',
          actorRole: 'admin',
          action: 'DELETE_STUDENT',
          targetType: 'Student',
          targetId: studentId,
          timestamp: new Date().toISOString(),
          details: `Admin disabled Auth account and marked student ${studentData.name} (${studentData.usn}) as deactivated.`,
        }).catch(() => null);
      }
    }

    res.json({ success: true, message: 'Student account disabled and active allocations cleared.' });
  } catch (err) {
    console.error('[Delete Student Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Edit Student Endpoint
app.post('/api/admin/edit-student', async (req, res) => {
  try {
    const { studentId, updates, actorId } = req.body;
    if (!studentId || !updates) return res.status(400).json({ error: 'studentId and updates are required.' });

    delete updates.usn;
    delete updates.id;

    if (adminDb) {
      const studentDocRef = adminDb.collection('students').doc(studentId);
      const studentSnap = await studentDocRef.get();
      if (studentSnap.exists) {
        const currentData = studentSnap.data();
        await studentDocRef.set({
          ...updates,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        await adminDb.collection('auditLogs').add({
          actorId: actorId || 'admin',
          actorName: 'Admin User',
          actorRole: 'admin',
          action: 'EDIT_STUDENT',
          targetType: 'Student',
          targetId: studentId,
          timestamp: new Date().toISOString(),
          details: `Admin updated student ${currentData.name} (${currentData.usn}) fields: ${Object.keys(updates).join(', ')}`,
        }).catch(() => null);
      }
    }

    res.json({ success: true, message: 'Student profile updated successfully.' });
  } catch (err) {
    console.error('[Edit Student Error]:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Rate Limiting Store for AI Endpoint
const aiRateLimitMap = new Map();

function evaluateMessageSafetyServer(message, history = []) {
  const lowerMsg = String(message || '').toLowerCase().trim();

  const immediateDangerPatterns = [
    /\b(end my life|kill myself|suicide|suicidal|want to die|going to die tonight|slash my wrists|take all my pills|goodbye forever|decided to end my life)\b/i,
    /\b(decided to end|plan to end|cannot go on living|goodbye world)\b/i,
  ];

  const highConcernPatterns = [
    /\b(don't see any point in continuing|no point in continuing|no point in living|better off dead|nobody cares if i die|want everything to stop|cannot take this pain anymore)\b/i,
    /\b(giving up on everything|don't want to wake up|disappear forever|worthless|no reason to live)\b/i,
  ];

  const casualExemptions = [
    /\b(stressed because my exams are|stressed about|exam stress|stressed for exam|stressed because of|exams coming|exams are coming|exams near|exams approaching|due date|scared of result|sad because i failed my exam|sad about grade|sad about mark|die of embarrassment|die laughing)\b/i,
  ];

  const isCasualExempt = casualExemptions.some((pattern) => pattern.test(lowerMsg));

  let severity = 'NORMAL';
  let reasoning = 'Standard academic / general conversation.';
  let contextSummary = 'Student inquiring about study, career, or general guidance.';

  if (!isCasualExempt) {
    if (immediateDangerPatterns.some((pattern) => pattern.test(lowerMsg))) {
      severity = 'IMMEDIATE_DANGER';
      reasoning = 'Detected explicit self-harm or suicidal intent requiring immediate crisis safety escalation.';
      contextSummary = `Student expressed urgent crisis intent: "${message.substring(0, 100)}"`;
    } else if (highConcernPatterns.some((pattern) => pattern.test(lowerMsg))) {
      severity = 'HIGH_CONCERN';
      reasoning = 'Detected severe emotional distress or hopelessness statements indicating self-harm risk.';
      contextSummary = `Student expressed high emotional concern: "${message.substring(0, 100)}"`;
    } else if (/\b(sad|depressed|lonely|overwhelmed|struggling|exhausted|stressed|stress)\b/i.test(lowerMsg)) {
      severity = 'LOW_CONCERN';
      reasoning = 'Student expressed normal academic pressure or general sadness without self-harm intent.';
      contextSummary = 'Student mentioned feeling overwhelmed or sad regarding general stress.';
    }
  } else {
    if (/\b(stressed|stress|sad|overwhelmed)\b/i.test(lowerMsg)) {
      severity = 'LOW_CONCERN';
      reasoning = 'Student expressed normal academic exam stress without self-harm risk.';
      contextSummary = 'Student mentioned feeling stressed about upcoming exams or coursework.';
    }
  }

  const isEscalated = severity === 'HIGH_CONCERN' || severity === 'IMMEDIATE_DANGER';
  let supportiveResponse = '';

  if (severity === 'IMMEDIATE_DANGER') {
    supportiveResponse =
      "I hear how deeply overwhelmed you are right now, and I care about your safety. You don't have to carry this heavy burden alone. Please reach out right now to someone who can help:\n\n" +
      "• **National Crisis Helpline**: Call or text **988** (or emergency line 112 / 911)\n" +
      "• **Student Support Helpline**: Available 24/7 for confidential counseling\n" +
      "• **Contact Your Faculty Mentor or Campus Health Center**\n\n" +
      "Please stay safe and talk to a trusted professional or family member right away. Human support resources are being alerted so you receive compassionate care.";
  } else if (severity === 'HIGH_CONCERN') {
    supportiveResponse =
      "Thank you for sharing your feelings with me. It sounds like you are carrying a lot of weight right now. While I am an AI mentor, your well-being matters deeply. " +
      "I encourage you to reach out to your faculty mentor, a campus counselor, or a loved one. Sharing what you're going through with a trusted human can bring real clarity and relief.";
  } else if (severity === 'LOW_CONCERN') {
    supportiveResponse =
      "It is completely normal to feel stressed or tired when balancing academic responsibilities. Remember to take small breaks, stay hydrated, and break your work into manageable tasks. I'm right here to support your study plan!";
  } else {
    supportiveResponse = "I'm here to help you succeed in your academic and career journey! How can we tackle your goals today?";
  }

  return {
    severity,
    contextSummary,
    confidenceReasoning: reasoning,
    isEscalated,
    supportiveResponse,
  };
}

// Secure Server-side AI Endpoint (Verified Firebase Auth Token & Context Loading)
app.post('/api/ai/chat', async (req, res) => {
  try {
    // 1. Authentication Verification via Firebase ID Token
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized. Firebase ID token required in Authorization header.' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.warn('[AI Endpoint Auth Failed]:', err.message);
      return res.status(401).json({ error: 'Unauthorized. Invalid or expired Firebase ID token.' });
    }

    const uid = decodedToken.uid;
    const userRole = decodedToken.role || 'student';

    if (userRole !== 'student' && !decodedToken.student) {
      return res.status(403).json({ error: 'Forbidden. Only student accounts may access the Student AI Mentor endpoint.' });
    }

    // 2. Rate / Abuse Protection (Max 1 request per 1.0s per user)
    const lastReqTime = aiRateLimitMap.get(uid) || 0;
    const nowTime = Date.now();
    if (nowTime - lastReqTime < 1000) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment before sending another message.' });
    }
    aiRateLimitMap.set(uid, nowTime);

    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message string is required in request body.' });
    }

    // 3. Safety Risk Assessment (Server-side Safety Engine)
    const safetyAssessment = evaluateMessageSafetyServer(message, history || []);

    // 4. Fetch Student Document & Context from Firestore (Server-side using adminDb)
    let studentData = {};
    try {
      if (adminDb) {
        const studentsSnap = await adminDb.collection('students').where('uid', '==', uid).limit(1).get();
        if (!studentsSnap.empty) {
          studentData = studentsSnap.docs[0].data();
        } else {
          const userDocSnap = await adminDb.collection('users').doc(uid).get();
          if (userDocSnap.exists) {
            studentData = userDocSnap.data();
          }
        }
      }
    } catch (err) {
      console.warn(`[AI Context Fetch Notice]: Firestore student context read notice for UID (${uid}): ${err.message}. Using safe default context.`);
    }

    const studentName = studentData.name || decodedToken.name || 'Student';
    const department = studentData.department || 'Computer Science & Engineering';
    const cgpa = typeof studentData.cgpa === 'number' ? studentData.cgpa : 8.0;
    const attendance = typeof studentData.attendance === 'number' ? studentData.attendance : 85;
    const studyHours = studentData.studyHours || 15;
    const backlogs = studentData.previousYearBacklogs || studentData.currentBacklogs || 0;
    const academicStatus = studentData.academicStatus || 'Active';
    const mentorName = studentData.mentorName || 'Faculty Mentor';
    const mentorId = studentData.mentorId || null;
    const careerGoal = studentData.careerGoal || 'Software Engineer';
    const skills = studentData.skills ? (Array.isArray(studentData.skills) ? studentData.skills.join(', ') : String(studentData.skills)) : 'General Technical Skills';

    // 5. Handle Escalated Safety Risk (HIGH_CONCERN / IMMEDIATE_DANGER)
    if (safetyAssessment.isEscalated) {
      try {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const existingAlerts = await adminDb.collection('safetyAlerts')
          .where('studentId', '==', studentData.usn || uid)
          .where('timestamp', '>=', fifteenMinsAgo)
          .limit(1)
          .get();

        if (existingAlerts.empty) {
          const alertRef = adminDb.collection('safetyAlerts').doc();
          await alertRef.set({
            id: alertRef.id,
            studentId: studentData.usn || uid,
            studentName,
            studentUsn: studentData.usn || uid,
            mentorId: mentorId || 'ADMIN_UNASSIGNED',
            severity: safetyAssessment.severity,
            triggerMessage: message.substring(0, 200),
            contextSummary: safetyAssessment.contextSummary,
            confidenceReasoning: safetyAssessment.confidenceReasoning,
            status: 'NEW',
            timestamp: new Date().toISOString(),
          });

          const recipientId = mentorId || 'admin';
          const recipientRole = mentorId ? 'mentor' : 'admin';
          await adminDb.collection('notifications').add({
            id: `notif_${Date.now()}`,
            recipientUserId: recipientId,
            recipientRole,
            title: `Safety Alert: ${studentName}`,
            message: `Confidential safety assessment triggered (${safetyAssessment.severity}) for ${studentName}.`,
            type: 'safety_alert',
            severity: safetyAssessment.severity,
            read: false,
            timestamp: new Date().toISOString(),
          });

          console.log(`[Safety Engine] Confidential alert created for ${studentName} (${safetyAssessment.severity}).`);
        }
      } catch (alertErr) {
        console.warn('[Safety Alert Creation Notice]:', alertErr.message);
      }

      return res.json({
        text: safetyAssessment.supportiveResponse,
        emotion: 'concerned',
        safety: safetyAssessment,
      });
    }

    // 6. Gemini API Call (Production Mode)
    if (!GEMINI_API_KEY) {
      console.warn('[Gemini API Notice]: GEMINI_API_KEY not configured on server.');
      return res.status(503).json({ error: 'AI Mentor is temporarily unavailable. Please try again.' });
    }

    const systemPrompt = `You are EduMentorX AI Academic Assistant, an empathetic, encouraging EdTech educational mentor for university students. 
Identity: Clearly identify yourself as an AI academic assistant, NOT a human faculty member.
Student Context:
- Name: ${studentName}
- Department: ${department}
- Academic Record: CGPA ${cgpa.toFixed(2)}/10, Lecture Attendance ${attendance}%, Study Hours ${studyHours} hrs/week
- Backlogs: ${backlogs} subject(s), Academic Status: ${academicStatus}
- Target Career Role: ${careerGoal}
- Current Technical Skills: ${skills}
- Assigned Faculty Mentor: ${mentorName}

Guidelines:
- Provide structured, practical academic, study habit, project, and career guidance tailored to the student's context.
- If attendance is low (<75%), provide actionable advice to prioritize lectures and catch up.
- If backlogs exist, help prioritize subjects and build a manageable study plan.
- Align career guidance with their target role (${careerGoal}) and suggest practical skill improvements.
- Encourage healthy study habits and consulting with ${mentorName} for official department queries.
- Keep responses clear, warm, concise, and structured with markdown formatting.`;

    const formattedHistory = (history || []).map((h) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nStudent Message: ${message}` }],
      },
    ];

    // Helper to sanitize log output to prevent leaking secret API key
    const sanitizeLogOutput = (input) => {
      if (!input) return '';
      let str = typeof input === 'string' ? input : JSON.stringify(input);
      if (GEMINI_API_KEY) {
        str = str.split(GEMINI_API_KEY).join('[REDACTED_API_KEY]');
      }
      return str.replace(/key=[A-Za-z0-9._-]+/g, 'key=[REDACTED_API_KEY]');
    };

    // Candidate supported Gemini models in order of preference
    const geminiCandidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];

    let responseText = null;
    let lastErrorMsg = '';

    for (const modelName of geminiCandidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        let geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        // Handle transient 503 high demand spike with a quick 250ms retry
        if (geminiRes.status === 503) {
          console.warn(`[Gemini API Warning]: Model ${modelName} returned HTTP 503. Retrying in 250ms...`);
          await new Promise((r) => setTimeout(r, 250));
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 20000);
          geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
            signal: retryController.signal,
          }).finally(() => clearTimeout(retryTimeoutId));
        }

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;
          if (responseText) break;
        } else {
          const errText = await geminiRes.text();
          lastErrorMsg = sanitizeLogOutput(`Model ${modelName} returned HTTP ${geminiRes.status}: ${errText}`);
          console.warn('[Gemini API Attempt Failed]:', lastErrorMsg);
        }
      } catch (reqErr) {
        lastErrorMsg = sanitizeLogOutput(`Model ${modelName} request error: ${reqErr.message}`);
        console.warn('[Gemini API Request Error]:', lastErrorMsg);
      }
    }

    if (!responseText) {
      console.warn('[Gemini Backend Fallback]: Using contextual academic guidance fallback. Reason:', lastErrorMsg);
      const msgLower = (message || '').toLowerCase();
      let fallbackText = `Hello ${studentName}! I am your EduMentorX AI Academic Assistant. I am here to help you excel in your studies, projects, and career planning. How can I guide you today?`;

      if (msgLower.includes('exam') || msgLower.includes('study') || msgLower.includes('syllabus')) {
        fallbackText = `Great question, ${studentName}! For your exams in ${department}, I recommend breaking your revision into 45-minute focused blocks followed by active recall. Your current weekly study pace is ${studyHours} hours—increasing this by just 30 minutes daily before internal assessments will create a noticeable improvement.`;
      } else if (msgLower.includes('project') || msgLower.includes('code') || msgLower.includes('idea')) {
        fallbackText = `Exciting initiative, ${studentName}! For your target role as ${careerGoal}, building production-ready projects with React, TypeScript, and Cloud databases will stand out to recruiters. Consider building an automated university resource portal or a real-time collaborative workspace.`;
      } else if (msgLower.includes('attendance') || msgLower.includes('absent')) {
        fallbackText = `Your recorded lecture attendance is ${attendance}%. If you are nearing or below 75%, prioritize attending every scheduled session this month and connect with ${mentorName} to verify your leave documentation.`;
      } else if (msgLower.includes('cgpa') || msgLower.includes('marks') || msgLower.includes('grade')) {
        fallbackText = `Your current recorded CGPA is ${cgpa.toFixed(2)}. To boost your academic score this term, review IA question patterns, focus on high-weightage subjects, and discuss difficult topics during your mentor meetings with ${mentorName}.`;
      }

      return res.json({
        text: fallbackText,
        emotion: 'speaking',
        safety: safetyAssessment,
      });
    }

    return res.json({
      text: responseText,
      emotion: 'speaking',
      safety: safetyAssessment,
    });
  } catch (err) {
    console.error('[AI Chat Endpoint Error]:', err.message);
    return res.status(500).json({ error: 'AI Mentor is temporarily unavailable. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`[EduMentorX Backend Server] Listening on http://localhost:${PORT}`);
});
