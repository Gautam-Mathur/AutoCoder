import { Requirement } from './requirements';

export interface QueenOutput {
  projectName: string;
  problemStatement: string;
  projectGoal: string;
  deliverables: string[];
}

export interface PlannerOutput {
  mvpId: string;
  features: string[];
  requirements: Requirement[];
}

export interface ArchitectOutput {
  architectureStyle: string;
  directories: string[];
  files: Array<{ path: string; purpose: string }>;
}

export interface SystemOutput {
  databaseType: string;
  entities: Array<{ name: string; fields: string[] }>;
  apis: Array<{ name: string; method: string; route: string }>;
}

export interface DesignerOutput {
  colorPalette: Record<string, string>;
  typography: Record<string, string>;
  layoutComponents: string[];
}

export interface BlueprinterOutput {
  files: Array<{
    filePath: string;
    description: string;
    imports: string[];
    exports: string[];
  }>;
}
