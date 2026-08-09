import { TaskManager } from '../../state/task-manager.js';
import { validateTask } from '../../utils/validation.js';

export class TaskForm {
  constructor() {
    this.taskManager = new TaskManager();
    this.formElement = null;
    this.init();
  }

  init() {
    this.createForm();
    this.bindEvents();
  }

  createForm() {
    this.formElement = document.createElement('form');
    this.formElement.className = 'task-form';
    
    this.formElement.innerHTML = `
      <div class="form-group">
        <label for="task-title">Title</label>
        <input type="text" id="task-title" name="title" required />
      </div>
      
      <div class="form-group">
        <label for="task-description">Description</label>
        <textarea id="task-description" name="description"></textarea>
      </div>
      
      <div class="form-group">
        <label for="task-due-date">Due Date</label>
        <input type="date" id="task-due-date" name="dueDate" />
      </div>
      
      <div class="form-group">
        <label for="task-priority">Priority</label>
        <select id="task-priority" name="priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      
      <button type="submit">Add Task</button>
    `;
  }

  bindEvents() {
    this.formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  handleSubmit() {
    const formData = new FormData(this.formElement);
    const taskData = Object.fromEntries(formData);
    
    // Validate the task data
    const validationErrors = validateTask(taskData);
    
    if (validationErrors.length > 0) {
      this.displayErrors(validationErrors);
      return;
    }
    
    // Add the task
    this.taskManager.addTask(taskData);
    
    // Reset form
    this.formElement.reset();
    
    // Clear any previous errors
    this.clearErrors();
  }

  displayErrors(errors) {
    this.clearErrors();
    
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-messages';
    
    errors.forEach(error => {
      const errorElement = document.createElement('p');
      errorElement.textContent = error;
      errorElement.className = 'error-message';
      errorContainer.appendChild(errorElement);
    });
    
    this.formElement.insertBefore(errorContainer, this.formElement.firstChild);
  }

  clearErrors() {
    const existingErrors = this.formElement.querySelectorAll('.error-messages');
    existingErrors.forEach(el => el.remove());
  }

  render(container) {
    if (container) {
      container.appendChild(this.formElement);
    }
  }
}