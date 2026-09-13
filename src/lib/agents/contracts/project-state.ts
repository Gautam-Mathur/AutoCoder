import { QueenOutput, PlannerOutput, ArchitectOutput, SystemOutput, DesignerOutput, BlueprinterOutput } from './stage-output';
import { ReviewOutput } from './verification';

export interface ProjectState {
  conversationId: string;
  queen?: QueenOutput;
  planner?: PlannerOutput;
  architect?: ArchitectOutput;
  system?: SystemOutput;
  designer?: DesignerOutput;
  blueprinter?: BlueprinterOutput;
  review?: ReviewOutput;
  updatedAt: Date;
}
