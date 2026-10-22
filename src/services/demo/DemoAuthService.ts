import { IAuthService, LoginCredentials } from '../interfaces/IAuthService';
import { User, UserRole, Mentor, Student } from '../../types';
import { initialMentors, initialStudents } from '../seedData';
import { logLoginStage } from '../../utils/loginPerfLogger';

const STORAGE_KEY_USER = 'edumentorx_current_user';
const STORAGE_KEY_PASSWORDS = 'edumentorx_user_passwords_map';

const getStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setStorageItem = (key: string, val: string): void => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, val);
  }
};

const removeStorageItem = (key: string): void => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
};

export class DemoAuthService implements IAuthService {
  private listeners: ((user: User | null) => void)[] = [];
  private currentUser: User | null = null;
  private passwordsMap: Record<string, string> = {};

  constructor() {
    const storedUser = getStorageItem(STORAGE_KEY_USER);
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch {
        this.currentUser = null;
      }
    }

    const storedPass = getStorageItem(STORAGE_KEY_PASSWORDS);
    if (storedPass) {
      try {
        this.passwordsMap = JSON.parse(storedPass);
      } catch {
        this.passwordsMap = {};
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const { email, password, role } = credentials;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    let user: User;

    if (role === 'admin') {
      user = {
        id: 'admin_1',
        email: cleanEmail || 'admin@edumentorx.edu',
        name: 'System Administrator',
        role: 'admin',
        department: 'Institutional Administration',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      };
    } else if (role === 'mentor') {
      let mentorList: Mentor[] = [];
      try {
        const { dbService } = await import('../serviceFactory');
        mentorList = await dbService.getMentors();
      } catch {
        mentorList = initialMentors;
      }
      if (!mentorList || mentorList.length === 0) {
        mentorList = initialMentors;
      }

      let matchedMentor = mentorList.find(
        (m) => m.email.trim().toLowerCase() === cleanEmail
      );

      if (!matchedMentor && !cleanEmail) {
        matchedMentor = mentorList[0];
      }

      if (!matchedMentor) {
        matchedMentor = initialMentors.find(
          (m) => m.email.trim().toLowerCase() === cleanEmail
        );
      }

      if (!matchedMentor) {
        throw new Error(`No mentor account found matching email '${email}'. Please verify your credentials.`);
      }

      if (matchedMentor.status === 'inactive' || (matchedMentor as any).status === 'deactivated') {
        throw new Error('This mentor account is deactivated. Please contact the system administrator.');
      }

      const userIdKey = matchedMentor.email.toLowerCase();
      const storedCustomPassword = this.passwordsMap[userIdKey];
      const phoneDigits = (matchedMentor.phone || '').replace(/\D/g, '');
      const passDigits = cleanPassword.replace(/\D/g, '');
      const isInitialPhonePass =
        cleanPassword === matchedMentor.phone ||
        (phoneDigits.length > 0 && passDigits.length >= 7 && (passDigits === phoneDigits || phoneDigits.endsWith(passDigits) || passDigits.endsWith(phoneDigits)));

      let mustChangePassword = false;

      if (storedCustomPassword) {
        if (cleanPassword !== storedCustomPassword) {
          throw new Error('Invalid password. Temporary phone number password is no longer active. Please use your updated password.');
        }
        mustChangePassword = false;
      } else {
        if (cleanPassword && !isInitialPhonePass && cleanPassword !== 'password123' && cleanPassword !== 'admin123') {
          throw new Error(`Invalid password for mentor account '${matchedMentor.email}'. Initial password is registered phone number: ${matchedMentor.phone}`);
        }
        mustChangePassword = true;
      }

      user = {
        id: matchedMentor.id,
        email: matchedMentor.email,
        name: matchedMentor.name,
        role: 'mentor',
        department: matchedMentor.department,
        phone: matchedMentor.phone,
        mustChangePassword,
        avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=250',
      };
    } else {
      // Student Role
      const tLookup = performance.now();
      let matchedStudent: Student | null = null;
      try {
        const { dbService } = await import('../serviceFactory');
        if (cleanEmail) {
          matchedStudent = await dbService.getStudentById(cleanEmail);
        }
        if (!matchedStudent) {
          const res = await dbService.getStudents(1, 1000);
          matchedStudent =
            res.students.find(
              (s) => s.email.trim().toLowerCase() === cleanEmail || s.usn.trim().toLowerCase() === cleanEmail
            ) || null;
        }
      } catch {
        // Fallback to seed data
      }

      if (!matchedStudent) {
        matchedStudent =
          initialStudents.find((s) => s.email.trim().toLowerCase() === cleanEmail) || initialStudents[0];
      }
      logLoginStage('4_firestoreUserProfileFetch', performance.now() - tLookup, 'SUCCESS', 'demo-roster');

      const userIdKey = matchedStudent ? matchedStudent.email.toLowerCase() : cleanEmail;
      const storedCustomPassword = this.passwordsMap[userIdKey];
      const phoneDigits = (matchedStudent?.phone || '').replace(/\D/g, '');
      const passDigits = cleanPassword.replace(/\D/g, '');
      const isInitialPhonePass =
        cleanPassword === matchedStudent?.phone ||
        (phoneDigits.length > 0 && passDigits.length >= 7 && (passDigits === phoneDigits || phoneDigits.endsWith(passDigits) || passDigits.endsWith(phoneDigits)));

      let mustChangePassword = false;

      if (storedCustomPassword) {
        if (cleanPassword !== storedCustomPassword) {
          throw new Error('Invalid password. Temporary phone number password is no longer active. Please use your updated password.');
        }
        mustChangePassword = false;
      } else {
        if (cleanPassword && !isInitialPhonePass && cleanPassword !== 'password123' && cleanPassword !== 'admin123') {
          throw new Error(`Invalid password for student '${matchedStudent?.email}'. Initial password is registered phone number.`);
        }
        mustChangePassword = true;
      }

      user = {
        id: matchedStudent ? matchedStudent.id : 's1',
        email: matchedStudent ? matchedStudent.email : (cleanEmail || 'student.alex@edumentorx.edu'),
        name: matchedStudent ? matchedStudent.name : 'Alex Rivera',
        role: 'student',
        department: matchedStudent ? matchedStudent.department : 'Computer Science & Engineering',
        phone: matchedStudent?.phone || '',
        mustChangePassword,
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
      };
    }

    this.currentUser = user;
    setStorageItem(STORAGE_KEY_USER, JSON.stringify(user));
    this.notifyListeners();
    return user;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    removeStorageItem(STORAGE_KEY_USER);
    this.notifyListeners();
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (this.currentUser) {
      const userKey = this.currentUser.email.toLowerCase();
      this.passwordsMap[userKey] = newPassword;
      setStorageItem(STORAGE_KEY_PASSWORDS, JSON.stringify(this.passwordsMap));

      this.currentUser.mustChangePassword = false;
      setStorageItem(STORAGE_KEY_USER, JSON.stringify(this.currentUser));
      this.notifyListeners();
    }
    return true;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }
}
