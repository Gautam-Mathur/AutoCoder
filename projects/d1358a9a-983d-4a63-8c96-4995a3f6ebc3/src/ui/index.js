import { renderMainView } from './views/main-view.js';
import { getTasks, addTask, deleteTask } from '../state/task-manager.js';

export function renderUI() {
  const tasks = getTasks();
  renderMainView(tasks);
}
