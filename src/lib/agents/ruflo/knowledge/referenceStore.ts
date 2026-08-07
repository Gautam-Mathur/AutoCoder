import fs from 'fs';
import path from 'path';

export interface ReferenceDocument {
  id: string;
  category: string;
  title: string;
  keyTechniques: string[];
  avoid: string[];
  referenceExample: string;
}

export class ReferenceStore {
  private static instance: ReferenceStore;
  private referencesMap: Map<string, ReferenceDocument> = new Map();

  private constructor() {
    this.loadAllReferences();
  }

  public static getInstance(): ReferenceStore {
    if (!ReferenceStore.instance) {
      ReferenceStore.instance = new ReferenceStore();
    }
    return ReferenceStore.instance;
  }

  private loadAllReferences(): void {
    let baseDir = path.join(__dirname, 'references');
    if (!fs.existsSync(baseDir)) {
      baseDir = path.join(process.cwd(), 'src', 'lib', 'agents', 'ruflo', 'knowledge', 'references');
    }
    if (!fs.existsSync(baseDir)) return;

    const subdirs = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const dirent of subdirs) {
      if (dirent.isDirectory()) {
        const categoryPath = path.join(baseDir, dirent.name);
        const files = fs.readdirSync(categoryPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(path.join(categoryPath, file), 'utf8');
              const doc: ReferenceDocument = JSON.parse(content);
              if (doc && doc.id) {
                this.referencesMap.set(doc.id.toLowerCase(), doc);
              }
            } catch (e) {
              console.error(`Failed to parse reference file: ${file}`, e);
            }
          }
        }
      }
    }
  }

  public getReference(id: string): ReferenceDocument | undefined {
    return this.referencesMap.get(id.toLowerCase());
  }

  public getAllReferences(): ReferenceDocument[] {
    return Array.from(this.referencesMap.values());
  }
}
