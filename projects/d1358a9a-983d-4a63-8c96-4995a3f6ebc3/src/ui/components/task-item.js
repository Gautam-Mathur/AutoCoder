import { TaskManager } from "../../state/task-manager.js";
import { createElement, addClass, removeClass, toggleClass } from "../../utils/dom-utils.js";

class TaskItem {
  constructor(taskData) {
    this.task = taskData;
    this.element = null;
    this.init();
  }

  init() {
    this.element = createElement('div', { className: 'task-item' });
    this.render();
    this.bindEvents();
  }

  render() {
    const { id, title, description, completed, priority } = this.task;
    
    this.element.innerHTML = `
      <div class="task-header">
        <input type="checkbox" ${completed ? 'checked' : ''} data-task-id="${id}" />
        <h3 class="task-title">${title}</h3>
        <span class="task-priority priority-${priority}">${priority}</span>
      </div>
      <p class="task-description">${description}</p>
      <div class="task-actions">
        <button class="edit-btn" data-task-id="${id}">Edit</button>
        <button class="delete-btn" data-task-id="${id}">Delete</button>
      </div>
    `;

    if (completed) {
      addClass(this.element, 'completed');
    }
  }

  bindEvents() {
    const checkbox = this.element.querySelector('input[type="checkbox"]');
    const editBtn = this.element.querySelector('.edit-btn');
    const deleteBtn = this.element.querySelector('.delete-btn');

    checkbox.addEventListener('change', (e) => {
      const taskId = parseInt(e.target.dataset.taskId);
      const isChecked = e.target.checked;
      
      TaskManager.updateTask(taskId, { completed: isChecked });
      
      if (isChecked) {
        addClass(this.element, 'completed');
      } else {
        removeClass(this.element, 'completed');
      }
    });

    editBtn.addEventListener('click', () => {
      const taskId = parseInt(editBtn.dataset.taskId);
      TaskManager.editTask(taskId);
    });

    deleteBtn.addEventListener('click', () => {
      const taskId = parseInt(deleteBtn.dataset.taskId);
      TaskManager.deleteTask(taskId);
    });
  }

  update(taskData) {
    this.task = { ...this.task, ...taskData };
    this.render();
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export { TaskItem };