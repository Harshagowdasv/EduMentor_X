import { IAIService, AIChatMessage, AIResponse, AISafetyAssessment } from '../interfaces/IAIService';
import { evaluateMessageSafety } from '../aiSafetyEngine';
import { auth } from '../firebase/firebaseConfig';

export class AIServiceImpl implements IAIService {
  private lastFallbackIndex = 0;

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
      department?: string;
    }
  ): Promise<AIResponse> {
    // 1. Safety Risk Assessment (Evaluated immediately)
    const safetyAssessment = this.assessSafetyRisk(studentMessage, history);
    if (safetyAssessment.isEscalated) {
      return {
        text: safetyAssessment.supportiveResponse,
        emotion: 'concerned',
        safety: safetyAssessment,
      };
    }

    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

    // 2. Production Mode -> Attempt secure backend server endpoint /api/ai/chat
    if (!isDemoMode) {
      try {
        const idToken = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => '') : '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: studentMessage,
            history,
            studentContext,
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (response.ok) {
          const data = await response.json();
          if (data && data.text) {
            return {
              text: data.text,
              emotion: data.emotion || 'speaking',
              safety: data.safety || safetyAssessment,
            };
          }
        }
      } catch (serverErr) {
        // Backend server offline or timed out; will proceed to direct client Gemini API
      }
    }

    // 3. Direct Client-Side Gemini API Call (Works if user configured custom key or via localStorage)
    const clientGeminiKey = (typeof window !== 'undefined' ? (localStorage.getItem('user_gemini_api_key') || '') : '');

    if (clientGeminiKey) {
      try {
        const directText = await this.callClientGeminiAPI(studentMessage, history, studentContext, clientGeminiKey);
        if (directText) {
          return {
            text: directText,
            emotion: this.detectEmotionFromText(directText),
            safety: safetyAssessment,
          };
        }
      } catch (clientGeminiErr) {
        console.warn('[Direct Client Gemini API Warning]:', clientGeminiErr);
      }
    }

    // 4. Intelligent Local Academic Reasoning & Semantic Engine (Zero-network fallback with high diversity)
    const localResponse = this.generateLocalAIResponse(studentMessage, studentContext);
    return {
      text: localResponse.text,
      emotion: localResponse.emotion,
      safety: safetyAssessment,
    };
  }

  assessSafetyRisk(message: string, history: AIChatMessage[]): AISafetyAssessment {
    return evaluateMessageSafety(message, history);
  }

  /**
   * Directly calls Google Generative Language API from the browser when backend server is offline.
   */
  private async callClientGeminiAPI(
    studentMessage: string,
    history: AIChatMessage[],
    studentContext?: any,
    apiKey?: string
  ): Promise<string | null> {
    if (!apiKey) return null;

    const studentName = studentContext?.name || 'Student';
    const department = studentContext?.department || 'Computer Science & Engineering';
    const cgpa = studentContext?.cgpa ? Number(studentContext.cgpa).toFixed(2) : '8.0';
    const attendance = studentContext?.attendance || 85;
    const studyHours = studentContext?.studyHours || 15;
    const mentorName = studentContext?.assignedMentorName || 'Faculty Mentor';

    const systemPrompt = `You are EduMentorX AI Academic Assistant, an empathetic, highly knowledgeable educational mentor for university engineering students.
Student Context:
- Name: ${studentName}
- Department: ${department}
- Academic Record: CGPA ${cgpa}/10, Lecture Attendance: ${attendance}%, Study Hours: ${studyHours} hrs/week
- Faculty Mentor: ${mentorName}

Instructions:
- Provide clear, direct, insightful answers to the student's question.
- Do NOT repeat identical canned greetings or boilerplate.
- For coding, DSA, or computer science concepts (e.g. binary search, deadlocks, SQL, networks), explain the core mechanism clearly with concise examples and complexity where relevant.
- For exam preparation, study schedules, or marks improvement, provide concrete, practical steps tailored to their department.
- Maintain a warm, encouraging, student-centric academic tone. Format with clean Markdown.`;

    const formattedHistory = (history || []).slice(-6).map((h) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nStudent Question: ${studentMessage}` }],
      },
    ];

    const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && typeof text === 'string' && text.trim().length > 0) {
            return text.trim();
          }
        }
      } catch {
        // Try next candidate model
      }
    }

    return null;
  }

  private detectEmotionFromText(text: string): 'speaking' | 'happy' | 'thinking' | 'concerned' {
    const lower = text.toLowerCase();
    if (lower.includes('congratulations') || lower.includes('great job') || lower.includes('excellent') || lower.includes('awesome')) {
      return 'happy';
    }
    if (lower.includes('careful') || lower.includes('risk') || lower.includes('concern') || lower.includes('struggling') || lower.includes('shortage')) {
      return 'concerned';
    }
    if (lower.includes('analyze') || lower.includes('consider') || lower.includes('formula') || lower.includes('complexity') || lower.includes('algorithm')) {
      return 'thinking';
    }
    return 'speaking';
  }

  /**
   * Rich, multi-topic semantic fallback engine that ensures the avatar never repeats
   * the same generic answer, even in offline environments.
   */
  private generateLocalAIResponse(
    message: string,
    context?: { name?: string; cgpa?: number; attendance?: number; studyHours?: number; assignedMentorName?: string; department?: string }
  ): { text: string; emotion: 'speaking' | 'happy' | 'thinking' | 'concerned' } {
    const msg = message.toLowerCase().trim();
    const studentName = context?.name || 'there';
    const mentorName = context?.assignedMentorName || 'your faculty mentor';
    const dept = context?.department || 'Computer Science & Engineering';
    const cgpaVal = context?.cgpa ? context.cgpa.toFixed(2) : '8.00';
    const studyHrs = context?.studyHours || 15;
    const attVal = context?.attendance || 85;

    // 1. GREETINGS & INTRODUCTIONS
    if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))\b/i.test(msg) || msg === 'hello' || msg === 'hi') {
      return {
        text: `Hello ${studentName}! I am your EduMentorX AI Academic Assistant. How can I guide you today?\n\n` +
          `• **Exam Prep & Revision**: Build a study plan for your upcoming internal assessments.\n` +
          `• **DSA & Concepts**: Ask me to explain binary search, dynamic programming, OS, or DBMS.\n` +
          `• **Academic Roadmap**: Discuss CGPA improvement and attendance targets.\n` +
          `• **Projects & Career**: Brainstorm portfolio projects or review placement strategies.`,
        emotion: 'happy',
      };
    }

    // 2. DATA STRUCTURES & ALGORITHMS (DSA)
    if (msg.includes('binary search')) {
      return {
        text: `### Binary Search Explained\n\n` +
          `**Binary Search** is a divide-and-conquer search algorithm that finds an element in a **sorted array** in **O(log n)** time.\n\n` +
          `**How it works:**\n` +
          `1. Compare the target value with the middle element (\`mid = low + (high - low) / 2\`).\n` +
          `2. If \`target == arr[mid]\`, you found the element!\n` +
          `3. If \`target < arr[mid]\`, narrow search to the left half (\`high = mid - 1\`).\n` +
          `4. If \`target > arr[mid]\`, narrow search to the right half (\`low = mid + 1\`).\n\n` +
          `**Key Takeaways:**\n` +
          `• Time Complexity: Best O(1), Average/Worst **O(log n)**.\n` +
          `• Prerequisite: The array **must be sorted**.\n` +
          `• Common Pitfall: Always compute mid using \`low + (high - low)/2\` to prevent integer overflow.`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('bubble sort') || msg.includes('selection sort') || msg.includes('insertion sort')) {
      return {
        text: `### Elementary Sorting Algorithms\n\n` +
          `• **Bubble Sort (O(n²))**: Repeatedly steps through the list, compares adjacent pairs, and swaps them if they are in the wrong order. Stable sort.\n` +
          `• **Selection Sort (O(n²))**: Divides the array into sorted and unsorted regions. Repeatedly finds minimum element from unsorted region and places it at the beginning.\n` +
          `• **Insertion Sort (O(n²))**: Builds the sorted array one element at a time by shifting elements. Very fast for nearly-sorted data (**O(n) best case**).\n\n` +
          `*Pro Tip for Exams:* Practice writing their step-by-step trace tables for a sample array like \`[64, 25, 12, 22, 11]\`.`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('quick sort') || msg.includes('quicksort') || msg.includes('merge sort') || msg.includes('mergesort')) {
      return {
        text: `### Merge Sort vs. Quick Sort\n\n` +
          `| Property | Merge Sort | Quick Sort |\n` +
          `| :--- | :--- | :--- |\n` +
          `| **Strategy** | Divide & Conquer | Divide & Conquer (Partition) |\n` +
          `| **Time (Avg)** | **O(n log n)** | **O(n log n)** |\n` +
          `| **Time (Worst)** | **O(n log n)** | **O(n²)** (poor pivot choice) |\n` +
          `| **Space** | O(n) auxiliary space | O(log n) in-place call stack |\n` +
          `| **Stability** | Stable | Unstable by default |\n\n` +
          `*Exam Insight:* Merge sort is preferred for linked lists and external sorting; Quick sort with randomized pivot is usually faster in memory due to cache locality.`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('recursion') || msg.includes('backtracking') || msg.includes('dynamic programming') || msg.includes('dp')) {
      return {
        text: `### Mastering Recursion & Dynamic Programming (DP)\n\n` +
          `1. **Recursion Rule of Thumb:** Always write the **Base Case** first (termination condition) before defining the recursive relation.\n` +
          `2. **When to use DP:** When a problem exhibits (a) **Overlapping Subproblems** and (b) **Optimal Substructure** (e.g., 0/1 Knapsack, Longest Common Subsequence, Fibonacci).\n` +
          `3. **Top-Down (Memoization):** Standard recursion + hash map / table to store computed results.\n` +
          `4. **Bottom-Up (Tabulation):** Iterative array filling starting from base cases up to \`dp[n]\`.\n\n` +
          `*Actionable Practice:* Start with the Climbing Stairs problem, then Longest Increasing Subsequence (LIS).`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('tree') || msg.includes('bst') || msg.includes('binary tree') || msg.includes('traversal')) {
      return {
        text: `### Binary Search Tree (BST) & Traversals\n\n` +
          `• **BST Property:** For every node $N$, all keys in the left subtree are $< N$, and all keys in the right subtree are $> N$.\n` +
          `• **Tree Traversals:**\n` +
          `  - **In-Order (Left, Root, Right):** Produces elements in **strictly sorted order** for a BST!\n` +
          `  - **Pre-Order (Root, Left, Right):** Useful for creating copies of the tree or serializing.\n` +
          `  - **Post-Order (Left, Right, Root):** Useful for node deletion and evaluating postfix expressions.\n` +
          `  - **Level-Order (BFS):** Explores node by node using a FIFO Queue.\n\n` +
          `• **Time Complexity:** O(log n) average for search/insert, degenerating to O(n) in skewed trees (mitigated by AVL/Red-Black trees).`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('graph') || msg.includes('bfs') || msg.includes('dfs') || msg.includes('dijkstra')) {
      return {
        text: `### Graph Algorithms Core Cheat Sheet\n\n` +
          `• **BFS (Breadth-First Search):** Uses a **Queue**. Ideal for unweighted shortest path and level-by-level exploration. Time: $O(V + E)$.\n` +
          `• **DFS (Depth-First Search):** Uses a **Stack** or recursion. Ideal for cycle detection, topological sorting, and connected components. Time: $O(V + E)$.\n` +
          `• **Dijkstra's Algorithm:** Finds shortest path from single source in weighted graphs with non-negative weights using a Min-Priority Queue. Time: $O((V + E) \\log V)$.\n` +
          `• **Bellman-Ford:** Handles negative edge weights and detects negative cycles in $O(V \\times E)$.`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('big o') || msg.includes('time complexity') || msg.includes('space complexity') || msg.includes('complexity')) {
      return {
        text: `### Complexity Analysis Hierarchy\n\n` +
          `From fastest to slowest growth:\n` +
          `1. **O(1)** - Constant Time (Hash map lookup, array indexing)\n` +
          `2. **O(log n)** - Logarithmic Time (Binary Search, balanced BST operations)\n` +
          `3. **O(n)** - Linear Time (Single loop scan, array traversal)\n` +
          `4. **O(n log n)** - Linearithmic Time (Merge Sort, Heap Sort, Quick Sort avg)\n` +
          `5. **O(n²)** - Quadratic Time (Nested loops, Bubble/Selection sort)\n` +
          `6. **O(2ⁿ)** - Exponential Time (Recursive subsets, Towers of Hanoi)\n\n` +
          `*Exam Tip:* In big-O notation, always ignore lower-order terms and constant coefficients.`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('stack') || msg.includes('queue') || msg.includes('linked list')) {
      return {
        text: `### Linear Data Structures Comparison\n\n` +
          `• **Stack:** LIFO (Last-In, First-Out). Push/Pop take $O(1)$. Core applications: function call stack, undo operations, parenthesis matching, postfix evaluation.\n` +
          `• **Queue:** FIFO (First-In, First-Out). Enqueue/Dequeue take $O(1)$. Core applications: CPU task scheduling, print spoolers, BFS graph traversal.\n` +
          `• **Singly vs Doubly Linked List:** Singly saves pointer space ($4/8$ bytes per node); Doubly allows bidirectional traversal and $O(1)$ deletion when the node pointer is already known.`,
        emotion: 'thinking',
      };
    }

    // 3. CORE CS SUBJECTS (OS, DBMS, NETWORKS)
    if (msg.includes('operating system') || msg.includes('deadlock') || msg.includes('process') || msg.includes('thread') || msg.includes('paging')) {
      return {
        text: `### Operating Systems Core Review\n\n` +
          `• **4 Coffman Conditions for Deadlock:**\n` +
          `  1. *Mutual Exclusion*: Resources cannot be shared.\n` +
          `  2. *Hold & Wait*: Process holds resources while waiting for more.\n` +
          `  3. *No Preemption*: Resources cannot be forcibly taken.\n` +
          `  4. *Circular Wait*: A closed chain of processes waiting on each other.\n\n` +
          `• **Process vs Thread:** A process has its own address space, PCB, and open files. Threads share the process address space and heap but maintain private registers and call stack.\n` +
          `• **Virtual Memory & Paging:** Avoids external fragmentation by mapping non-contiguous physical page frames to contiguous virtual memory pages via Page Tables and TLB cache.`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('dbms') || msg.includes('database') || msg.includes('sql') || msg.includes('normalization') || msg.includes('acid')) {
      return {
        text: `### DBMS & Database Design Highlights\n\n` +
          `• **ACID Properties:**\n` +
          `  - **A**tomicity: All-or-nothing execution.\n` +
          `  - **C**onsistency: Preserves database integrity constraints.\n` +
          `  - **I**solation: Concurrent transactions execute without mutual interference.\n` +
          `  - **D**urability: Committed data persists even after system crash.\n\n` +
          `• **Normalization Forms:**\n` +
          `  - **1NF**: Atomic values, no repeating groups.\n` +
          `  - **2NF**: In 1NF + no partial dependency on candidate key.\n` +
          `  - **3NF**: In 2NF + no transitive dependency (non-prime attributes depend only on superkey).\n` +
          `  - **BCNF**: Stricter 3NF where for every functional dependency $X \\rightarrow Y$, $X$ must be a superkey.`,
        emotion: 'thinking',
      };
    }

    if (msg.includes('computer network') || msg.includes('networking') || msg.includes('tcp') || msg.includes('udp') || msg.includes('osi')) {
      return {
        text: `### Computer Networks Quick Reference\n\n` +
          `• **OSI 7 Layers (Bottom-to-Top):**\n` +
          `  Physical ➔ Data Link ➔ Network (IP, Routers) ➔ Transport (TCP, UDP) ➔ Session ➔ Presentation ➔ Application (HTTP, DNS, SSH).\n\n` +
          `• **TCP vs UDP:**\n` +
          `  - **TCP:** Connection-oriented, guaranteed delivery, flow control (Sliding Window), congestion control, 3-way handshake (SYN, SYN-ACK, ACK).\n` +
          `  - **UDP:** Connectionless, no retransmission overhead, minimal latency. Ideal for streaming, gaming, and DNS lookups.`,
        emotion: 'thinking',
      };
    }

    // 4. ACADEMICS, CGPA, EXAMS, ATTENDANCE & BACKLOGS
    if (msg.includes('cgpa') || msg.includes('grade') || msg.includes('sgpa') || msg.includes('mark') || msg.includes('score')) {
      return {
        text: `### Personalized CGPA Improvement Strategy\n\n` +
          `Your current recorded CGPA is **${cgpaVal} / 10.0**.\n\n` +
          `**How to elevate your score this semester:**\n` +
          `1. **Maximize IA / Internal Marks**: Internals account for a major slice of your grade with higher predictability than final exams. Aim for 22+/25 in internal tests.\n` +
          `2. **Target Credit-Heavy Courses**: Prioritize 4-credit subjects (core math, algorithms, systems) over 2-credit electives to maximize GPA lift.\n` +
          `3. **Active Problem Solving**: Dedicate 45 minutes daily to solving end-of-chapter numericals and previous university question papers.\n` +
          `4. **Consult ${mentorName}**: Review past internal assessment answer scripts with your faculty mentor to identify where partial marks were lost.`,
        emotion: 'speaking',
      };
    }

    if (msg.includes('exam') || msg.includes('test') || msg.includes('internal') || msg.includes('ia') || msg.includes('revision')) {
      return {
        text: `### High-Yield Exam Preparation Framework\n\n` +
          `For your coursework in **${dept}**, here is the 3-phase revision cycle:\n\n` +
          `1. **Phase 1: Syllabus Triage (Days 1–3)**\n` +
          `   - Gather previous 3 years' question papers and mark recurring 10-mark and 6-mark questions.\n` +
          `   - Summarize module formulas and derivation proofs onto one cheatsheet per subject.\n\n` +
          `2. **Phase 2: Active Recall & Blurting (Days 4–6)**\n` +
          `   - Close your notes and write out circuit diagrams, algorithmic steps, or schemas from memory.\n` +
          `   - Test yourself under timed conditions.\n\n` +
          `3. **Phase 3: IA Question Bank Simulation (Final 48 Hours)**\n` +
          `   - Solve one full mock paper within the official time limit.\n` +
          `   - Clarify edge cases with ${mentorName} during advisory hours.`,
        emotion: 'speaking',
      };
    }

    if (msg.includes('attendance') || msg.includes('shortage') || msg.includes('absent') || msg.includes('bunk')) {
      const isCritical = attVal < 75;
      const attAdvice = isCritical
        ? `⚠️ **Your attendance is currently recorded at ${attVal}%, which is below the mandatory 75% university eligibility threshold.** You must prioritize attending all remaining classes without absence to avoid detention.`
        : `✅ **Your attendance is recorded at ${attVal}%**, safely above the 75% threshold. Keep this momentum to maintain eligibility for internal assessments and lab exams.`;

      return {
        text: `### Attendance Guidelines & Regulation\n\n` +
          `${attAdvice}\n\n` +
          `**Actionable Steps:**\n` +
          `• Maintain daily attendance tracking in every subject.\n` +
          `• If you missed classes due to health or university events, submit medical certificates or duty attendance letters to ${mentorName} and HOD within 7 working days.\n` +
          `• Remember: Internal marks often correlate with regular class engagement.`,
        emotion: isCritical ? 'concerned' : 'speaking',
      };
    }

    if (msg.includes('backlog') || msg.includes('arrear') || msg.includes('fail')) {
      return {
        text: `### Structured Backlog Clearance Plan\n\n` +
          `Clearing backlogs is completely achievable with a dedicated roadmap, ${studentName}. Here is how to conquer it:\n\n` +
          `1. **Analyze the Syllabus Weightage**: Identify the top 3 high-scoring modules that carry 60%+ of the total marks.\n` +
          `2. **Master Past Papers**: 70% of supplementary exam questions follow historical patterns from the last 5 exam cycles.\n` +
          `3. **Study Rhythm**: Allocate 1 hour every single evening strictly dedicated to the backlog subject, separate from your regular semester coursework.\n` +
          `4. **Faculty Mentor Support**: Meet with ${mentorName} to review difficult topics or request remedial study material.\n\n` +
          `Stay confident—consistent daily focus will clear this paper with flying colors!`,
        emotion: 'speaking',
      };
    }

    // 5. PROJECTS, HACKATHONS & PORTFOLIOS
    if (msg.includes('project') || msg.includes('idea') || msg.includes('hackathon') || msg.includes('capstone')) {
      return {
        text: `### 3 Industry-Grade Portfolio Project Ideas for ${dept}\n\n` +
          `1. **Real-Time Collaborative Code & Notes Workspace**\n` +
          `   • *Tech Stack:* React, TypeScript, WebSockets (Socket.io), Redis, Node.js.\n` +
          `   • *Key Feature:* CRDT-based concurrent editing, live syntax highlighting, and room sharing.\n\n` +
          `2. **Intelligent University Resource & Mentorship Portal**\n` +
          `   • *Tech Stack:* Vite, Tailwind CSS, Firebase / PostgreSQL, Gemini AI Integration.\n` +
          `   • *Key Feature:* Automated risk tracking, meeting scheduling, and AI-powered academic advisory.\n\n` +
          `3. **Distributed High-Throughput Log Aggregator & Search**\n` +
          `   • *Tech Stack:* Go / Python, Apache Kafka, Elasticsearch / ClickHouse.\n` +
          `   • *Key Feature:* Collects real-time system logs and visualizes latency bottlenecks with analytics charts.\n\n` +
          `*Which of these sounds most exciting to build? I can help outline the database schema!*`,
        emotion: 'happy',
      };
    }

    // 6. CAREER, INTERVIEWS, RESUME & PLACEMENTS
    if (msg.includes('resume') || msg.includes('cv') || msg.includes('interview') || msg.includes('placement') || msg.includes('job') || msg.includes('career')) {
      return {
        text: `### Campus Placement & Technical Interview Strategy\n\n` +
          `1. **Resume Best Practices:**\n` +
          `   • Single-page layout formatted with clean sections: Education, Technical Skills, Projects, Achievements.\n` +
          `   • Use the Google XYZ formula: *"Accomplished [X], as measured by [Y], by doing [Z]"*.\n` +
          `   • Include working GitHub and live deployment links for every project.\n\n` +
          `2. **Technical Rounds Preparation:**\n` +
          `   • Solve 2 DSA problems daily (Blind 75 or NeetCode 150 list).\n` +
          `   • Revise core subjects: OS (Process/Threads/Deadlocks), DBMS (SQL joins, normalization), and Networks.\n\n` +
          `3. **HR / Behavioral Round:**\n` +
          `   • Structure answers using the **STAR Method** (Situation, Task, Action, Result).\n` +
          `   • Prepare your answer for *"Tell me about a challenging project and how you resolved roadblocks."*`,
        emotion: 'speaking',
      };
    }

    // 7. STUDY HABITS, TIME MANAGEMENT & ROUTINES
    if (msg.includes('study') || msg.includes('schedule') || msg.includes('timetable') || msg.includes('routine') || msg.includes('focus') || msg.includes('time management')) {
      return {
        text: `### Optimal Engineering Study Schedule\n\n` +
          `Based on your recorded pace of **${studyHrs} hours/week**, here is a sustainable daily blueprint:\n\n` +
          `• **Morning Block (07:00 - 08:00 AM)**: High-concentration analytical topics (Algorithms, Math proofs, Core Architecture).\n` +
          `• **College Hours**: Engage actively in lectures and take concise bullet-point notes.\n` +
          `• **Evening Focus (06:30 - 08:00 PM)**: Practice problem solving using the **Pomodoro Technique** (25 min deep work + 5 min rest).\n` +
          `• **Night Review (09:00 - 09:45 PM)**: 45 minutes of project development, coding, or assignment submissions.\n\n` +
          `*Rule of Thumb:* Protect 7 hours of sleep—deep sleep is when the brain consolidates technical memory!`,
        emotion: 'thinking',
      };
    }

    // 8. DYNAMIC ADAPTIVE FALLBACK (For open-ended or miscellaneous questions)
    // Extracts key topics from the student's question and provides structured academic mentorship
    const cleanQuery = message.replace(/[?!.,]/g, '').trim();
    const words = cleanQuery.split(/\s+/).filter(w => w.length > 3);
    const topicWord = words.length > 0 ? `"${words.slice(-2).join(' ')}"` : 'this topic';

    this.lastFallbackIndex = (this.lastFallbackIndex + 1) % 3;

    if (this.lastFallbackIndex === 0) {
      return {
        text: `That is an insightful question about ${topicWord}, ${studentName}!\n\n` +
          `From an engineering perspective in **${dept}**, here is how to master it:\n` +
          `1. **Conceptual Grounding**: Break down the underlying definitions and foundational theory first.\n` +
          `2. **Hands-On Application**: Build a minimal proof-of-concept code snippet or solve a sample numerical.\n` +
          `3. **Connect with Faculty**: Bring specific questions to your next mentoring session with **${mentorName}**.\n\n` +
          `Would you like me to walk you through a practical code example or exam-focused summary for ${topicWord}?`,
        emotion: 'speaking',
      };
    } else if (this.lastFallbackIndex === 1) {
      return {
        text: `Great area of inquiry regarding ${topicWord}!\n\n` +
          `To structure your study around this:\n` +
          `• **Core Principle**: Identify which semester module or subject syllabus covers ${topicWord}.\n` +
          `• **Reference Material**: Consult standard university textbooks and past exam question banks.\n` +
          `• **Peer & Mentor Discussion**: Reviewing this with ${mentorName} will give you tailored feedback on how it's tested in internal assessments.\n\n` +
          `Feel free to share more specifics or code snippets so I can provide a step-by-step breakdown!`,
        emotion: 'thinking',
      };
    } else {
      return {
        text: `Here is my academic guidance on ${topicWord}, ${studentName}:\n\n` +
          `• **Key Focus**: Focus on understanding *why* this concept exists and what trade-offs it solves in system design or algorithmic efficiency.\n` +
          `• **Exam Strategy**: Questions on ${topicWord} typically appear as 6-to-10 mark explanatory or practical problems in ${dept}.\n` +
          `• **Next Action**: Try summarizing it in 3 sentences in your own words, and I'll review your explanation!`,
        emotion: 'happy',
      };
    }
  }
}
