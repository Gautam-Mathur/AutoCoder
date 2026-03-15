// Offline Mode - Work without internet using cached templates

export interface CachedTemplate {
  id: string;
  name: string;
  description: string;
  files: { path: string; content: string; language: string }[];
  cachedAt: number;
  size: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  lastOnline: number | null;
  cachedTemplates: number;
  cacheSize: number;
}

class OfflineModeManager {
  private storageKey = 'autocoder-offline-cache';
  private templates: Map<string, CachedTemplate> = new Map();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB max cache
  private statusListeners: ((status: OfflineStatus) => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.setupNetworkListener();
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Get current status
  getStatus(): OfflineStatus {
    const cacheSize = Array.from(this.templates.values()).reduce((sum, t) => sum + t.size, 0);
    return {
      isOnline: this.isOnline(),
      lastOnline: this.isOnline() ? Date.now() : this.getLastOnlineTime(),
      cachedTemplates: this.templates.size,
      cacheSize
    };
  }

  // Register status listener
  onStatusChange(listener: (status: OfflineStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      const idx = this.statusListeners.indexOf(listener);
      if (idx > -1) this.statusListeners.splice(idx, 1);
    };
  }

  // Cache a template for offline use
  cacheTemplate(
    id: string,
    name: string,
    description: string,
    files: { path: string; content: string; language: string }[]
  ): boolean {
    const size = files.reduce((sum, f) => sum + f.content.length, 0);
    const currentSize = Array.from(this.templates.values()).reduce((sum, t) => sum + t.size, 0);

    // Check if would exceed cache limit
    if (currentSize + size > this.maxCacheSize) {
      // Remove oldest templates until there's room
      const sorted = Array.from(this.templates.entries())
        .sort(([, a], [, b]) => a.cachedAt - b.cachedAt);

      let freed = 0;
      for (const [key, template] of sorted) {
        if (currentSize - freed + size <= this.maxCacheSize) break;
        freed += template.size;
        this.templates.delete(key);
      }

      if (currentSize - freed + size > this.maxCacheSize) {
        console.warn('Template too large to cache');
        return false;
      }
    }

    const cached: CachedTemplate = {
      id,
      name,
      description,
      files: JSON.parse(JSON.stringify(files)),
      cachedAt: Date.now(),
      size
    };

    this.templates.set(id, cached);
    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  // Get cached template
  getCachedTemplate(id: string): CachedTemplate | null {
    return this.templates.get(id) || null;
  }

  // Get all cached templates
  getAllCachedTemplates(): CachedTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => b.cachedAt - a.cachedAt);
  }

  // Remove cached template
  removeCachedTemplate(id: string): boolean {
    const result = this.templates.delete(id);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }

  // Clear all cached templates
  clearCache(): void {
    this.templates.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  // Get cache size in bytes
  getCacheSize(): number {
    return Array.from(this.templates.values()).reduce((sum, t) => sum + t.size, 0);
  }

  // Format cache size for display
  formatCacheSize(): string {
    const bytes = this.getCacheSize();
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Check if template is cached
  isTemplateCached(id: string): boolean {
    return this.templates.has(id);
  }

  // Pre-cache essential templates
  async preCacheEssentials(
    templates: { id: string; name: string; description: string; files: { path: string; content: string; language: string }[] }[]
  ): Promise<number> {
    let cached = 0;
    for (const template of templates) {
      if (this.cacheTemplate(template.id, template.name, template.description, template.files)) {
        cached++;
      }
    }
    return cached;
  }

  // Get last online time
  private getLastOnlineTime(): number | null {
    try {
      const stored = localStorage.getItem('autocoder-last-online');
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }

  // Save last online time
  private saveLastOnlineTime(): void {
    try {
      localStorage.setItem('autocoder-last-online', String(Date.now()));
    } catch {
      // Ignore storage errors
    }
  }

  // Setup network status listener
  private setupNetworkListener(): void {
    window.addEventListener('online', () => {
      this.saveLastOnlineTime();
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.notifyListeners();
    });

    // Initial save if online
    if (this.isOnline()) {
      this.saveLastOnlineTime();
    }
  }

  // Notify status listeners
  private notifyListeners(): void {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const data = Array.from(this.templates.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save offline cache:', e);
      // If storage is full, remove oldest templates
      if ((e as Error).name === 'QuotaExceededError') {
        const sorted = Array.from(this.templates.entries())
          .sort(([, a], [, b]) => a.cachedAt - b.cachedAt);

        // Remove oldest half
        const toRemove = Math.ceil(sorted.length / 2);
        for (let i = 0; i < toRemove; i++) {
          this.templates.delete(sorted[i][0]);
        }

        // Try again
        try {
          const data = Array.from(this.templates.entries());
          localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch {
          console.error('Failed to save offline cache after cleanup');
        }
      }
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as [string, CachedTemplate][];
        this.templates = new Map(data);
      }
    } catch (e) {
      console.warn('Failed to load offline cache:', e);
    }
  }

  // Export cache as JSON (for backup)
  exportCache(): string {
    return JSON.stringify(Array.from(this.templates.entries()), null, 2);
  }

  // Import cache from JSON
  importCache(json: string): number {
    try {
      const data = JSON.parse(json) as [string, CachedTemplate][];
      let imported = 0;
      for (const [id, template] of data) {
        if (this.cacheTemplate(id, template.name, template.description, template.files)) {
          imported++;
        }
      }
      return imported;
    } catch (e) {
      console.error('Failed to import cache:', e);
      return 0;
    }
  }
}

// Singleton instance
export const offlineMode = new OfflineModeManager();

// React hook for offline mode
export function useOfflineMode() {
  return {
    isOnline: () => offlineMode.isOnline(),
    getStatus: () => offlineMode.getStatus(),
    onStatusChange: (listener: (status: OfflineStatus) => void) => offlineMode.onStatusChange(listener),
    cacheTemplate: (id: string, name: string, description: string, files: { path: string; content: string; language: string }[]) =>
      offlineMode.cacheTemplate(id, name, description, files),
    getCachedTemplate: (id: string) => offlineMode.getCachedTemplate(id),
    getAllCachedTemplates: () => offlineMode.getAllCachedTemplates(),
    isTemplateCached: (id: string) => offlineMode.isTemplateCached(id),
    clearCache: () => offlineMode.clearCache(),
    formatCacheSize: () => offlineMode.formatCacheSize()
  };
}

// Service Worker registration for full offline support
export async function registerServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registered:', registration.scope);
      return true;
    } catch (e) {
      console.warn('ServiceWorker registration failed:', e);
      return false;
    }
  }
  return false;
}