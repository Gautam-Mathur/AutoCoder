import { TaskItem } from './task-item.js';
import { TaskManager } from '../../state/task-manager.js';

class TaskList extends HTMLElement {
  constructor() {
    super();
    this.taskManager = TaskManager.getInstance();
    this.tasks = [];
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.subscribeToTaskUpdates();
  }

  subscribeToTaskUpdates() {
    this.taskManager.on('tasksUpdated', () => {
      this.tasks = this.taskManager.getTasks();
      this.render();
    });
  }

  render() {
    const tasksHtml = this.tasks.map(task => `
      <task-item data-id="${task.id}" data-completed="${task.completed}">
        ${task.text}
      </task-item>
    `).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 1rem;
        }

        task-item {
          display: block;
          margin-bottom: 0.5rem;
        }
      </style>

      <div class="task-list">
        ${tasksHtml}
      </div>
    `;
  }
}

customElements.define('task-list', TaskList);

export { TaskList };