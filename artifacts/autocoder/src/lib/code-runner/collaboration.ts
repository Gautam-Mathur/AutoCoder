// Real-time Collaboration - Share and collaborate on generated projects

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  lastActive: number;
}

export interface CollaborationSession {
  id: string;
  projectId: number;
  createdAt: number;
  createdBy: string;
  collaborators: Collaborator[];
  isPublic: boolean;
  accessCode?: string;
}

export interface CodeChange {
  type: 'insert' | 'delete' | 'replace';
  path: string;
  position: { line: number; column: number };
  content?: string;
  length?: number;
  timestamp: number;
  author: string;
}

// Generate unique collaborator colors
const collaboratorColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

// Generate random access code
function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get random color for new collaborator
function getNextColor(usedColors: string[]): string {
  const available = collaboratorColors.filter(c => !usedColors.includes(c));
  if (available.length === 0) {
    return collaboratorColors[Math.floor(Math.random() * collaboratorColors.length)];
  }
  return available[0];
}

class CollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();
  private changeLog: Map<string, CodeChange[]> = new Map();
  private listeners: Map<string, Set<(event: CollaborationEvent) => void>> = new Map();
  private userId: string;
  private userName: string;

  constructor() {
    this.userId = this.getOrCreateUserId();
    this.userName = this.getOrCreateUserName();
    this.loadFromStorage();
  }

  // Create a new collaboration session
  createSession(projectId: number, isPublic: boolean = false): CollaborationSession {
    const session: CollaborationSession = {
      id: generateId(),
      projectId,
      createdAt: Date.now(),
      createdBy: this.userId,
      collaborators: [{
        id: this.userId,
        name: this.userName,
        color: collaboratorColors[0],
        lastActive: Date.now()
      }],
      isPublic,
      accessCode: isPublic ? undefined : generateAccessCode()
    };

    this.sessions.set(session.id, session);
    this.changeLog.set(session.id, []);
    this.saveToStorage();

    return session;
  }

  // Join an existing session
  joinSession(sessionId: string, accessCode?: string): { success: boolean; session?: CollaborationSession; error?: string } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (!session.isPublic && session.accessCode !== accessCode) {
      return { success: false, error: 'Invalid access code' };
    }

    // Check if already in session
    if (!session.collaborators.find(c => c.id === this.userId)) {
      const usedColors = session.collaborators.map(c => c.color);
      session.collaborators.push({
        id: this.userId,
        name: this.userName,
        color: getNextColor(usedColors),
        lastActive: Date.now()
      });
      this.saveToStorage();
      this.emit(sessionId, { type: 'collaborator-joined', collaborator: session.collaborators[session.collaborators.length - 1] });
    }

    return { success: true, session };
  }

  // Leave a session
  leaveSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const collaborator = session.collaborators.find(c => c.id === this.userId);
    session.collaborators = session.collaborators.filter(c => c.id !== this.userId);

    if (session.collaborators.length === 0) {
      // Delete session if no one left
      this.sessions.delete(sessionId);
      this.changeLog.delete(sessionId);
    } else if (collaborator) {
      this.emit(sessionId, { type: 'collaborator-left', collaborator });
    }

    this.saveToStorage();
  }

  // Get session by ID
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Get sessions for a project
  getSessionsForProject(projectId: number): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.projectId === projectId);
  }

  // Update cursor position
  updateCursor(sessionId: string, cursor: { line: number; column: number }): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const collaborator = session.collaborators.find(c => c.id === this.userId);
    if (collaborator) {
      collaborator.cursor = cursor;
      collaborator.lastActive = Date.now();
      this.emit(sessionId, { type: 'cursor-moved', collaborator });
    }
  }

  // Update selection
  updateSelection(sessionId: string, selection: { start: { line: number; column: number }; end: { line: number; column: number } } | undefined): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const collaborator = session.collaborators.find(c => c.id === this.userId);
    if (collaborator) {
      collaborator.selection = selection;
      collaborator.lastActive = Date.now();
      this.emit(sessionId, { type: 'selection-changed', collaborator });
    }
  }

  // Record a code change
  recordChange(sessionId: string, change: Omit<CodeChange, 'timestamp' | 'author'>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const fullChange: CodeChange = {
      ...change,
      timestamp: Date.now(),
      author: this.userId
    };

    const changes = this.changeLog.get(sessionId) || [];
    changes.push(fullChange);

    // Keep only last 1000 changes
    if (changes.length > 1000) {
      changes.shift();
    }

    this.changeLog.set(sessionId, changes);
    this.emit(sessionId, { type: 'code-changed', change: fullChange });
  }

  // Get change history
  getChangeHistory(sessionId: string): CodeChange[] {
    return this.changeLog.get(sessionId) || [];
  }

  // Subscribe to session events
  subscribe(sessionId: string, callback: (event: CollaborationEvent) => void): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }

    this.listeners.get(sessionId)!.add(callback);

    return () => {
      this.listeners.get(sessionId)?.delete(callback);
    };
  }

  // Generate shareable link
  getShareableLink(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';

    const baseUrl = window.location.origin;
    const params = new URLSearchParams({ session: sessionId });

    if (session.accessCode) {
      params.set('code', session.accessCode);
    }

    return `${baseUrl}/collaborate?${params.toString()}`;
  }

  // Set user name
  setUserName(name: string): void {
    this.userName = name;
    localStorage.setItem('autocoder-collab-username', name);

    // Update name in all sessions
    for (const session of Array.from(this.sessions.values())) {
      const collaborator = session.collaborators.find((c: Collaborator) => c.id === this.userId);
      if (collaborator) {
        collaborator.name = name;
        this.emit(session.id, { type: 'collaborator-updated', collaborator });
      }
    }

    this.saveToStorage();
  }

  // Get current user info
  getCurrentUser(): { id: string; name: string } {
    return { id: this.userId, name: this.userName };
  }

  // Emit event to listeners
  private emit(sessionId: string, event: CollaborationEvent): void {
    const listeners = this.listeners.get(sessionId);
    if (listeners) {
      for (const callback of Array.from(listeners)) {
        callback(event);
      }
    }
  }

  // Get or create user ID
  private getOrCreateUserId(): string {
    let id = localStorage.getItem('autocoder-collab-userid');
    if (!id) {
      id = generateId();
      localStorage.setItem('autocoder-collab-userid', id);
    }
    return id;
  }

  // Get or create user name
  private getOrCreateUserName(): string {
    let name = localStorage.getItem('autocoder-collab-username');
    if (!name) {
      name = `User-${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('autocoder-collab-username', name);
    }
    return name;
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        changeLog: Array.from(this.changeLog.entries())
      };
      localStorage.setItem('autocoder-collab-sessions', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save collaboration data:', e);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('autocoder-collab-sessions');
      if (stored) {
        const data = JSON.parse(stored);
        this.sessions = new Map(data.sessions);
        this.changeLog = new Map(data.changeLog);

        // Clean up old sessions (older than 7 days)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const [id, session] of Array.from(this.sessions.entries())) {
          if (session.createdAt < weekAgo) {
            this.sessions.delete(id);
            this.changeLog.delete(id);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load collaboration data:', e);
    }
  }
}

// Event types
export type CollaborationEvent =
  | { type: 'collaborator-joined'; collaborator: Collaborator }
  | { type: 'collaborator-left'; collaborator: Collaborator }
  | { type: 'collaborator-updated'; collaborator: Collaborator }
  | { type: 'cursor-moved'; collaborator: Collaborator }
  | { type: 'selection-changed'; collaborator: Collaborator }
  | { type: 'code-changed'; change: CodeChange };

// Singleton instance
export const collaboration = new CollaborationManager();

// React hook for collaboration
export function useCollaboration(sessionId?: string) {
  return {
    createSession: (projectId: number, isPublic?: boolean) =>
      collaboration.createSession(projectId, isPublic),
    joinSession: (id: string, accessCode?: string) =>
      collaboration.joinSession(id, accessCode),
    leaveSession: (id: string) => collaboration.leaveSession(id),
    getSession: (id: string) => collaboration.getSession(id),
    updateCursor: (id: string, cursor: { line: number; column: number }) =>
      collaboration.updateCursor(id, cursor),
    updateSelection: (id: string, selection?: { start: { line: number; column: number }; end: { line: number; column: number } }) =>
      collaboration.updateSelection(id, selection),
    recordChange: (id: string, change: Omit<CodeChange, 'timestamp' | 'author'>) =>
      collaboration.recordChange(id, change),
    subscribe: (id: string, callback: (event: CollaborationEvent) => void) =>
      collaboration.subscribe(id, callback),
    getShareableLink: (id: string) => collaboration.getShareableLink(id),
    getCurrentUser: () => collaboration.getCurrentUser(),
    setUserName: (name: string) => collaboration.setUserName(name)
  };
}