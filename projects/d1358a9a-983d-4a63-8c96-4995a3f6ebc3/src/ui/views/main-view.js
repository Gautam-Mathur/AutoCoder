import { TaskForm } from '../components/task-form.js';
import { TaskList } from '../components/task-list.js';

export class MainView {
  constructor() {
    this.taskForm = new TaskForm();
    this.taskList = new TaskList();
  }

  render() {
    const container = document.createElement('div');
    container.className = 'main-view';
    
    const formElement = this.taskForm.render();
    const listElement = this.taskList.render();
    
    container.appendChild(formElement);
    container.appendChild(listElement);
    
    return container;
  }

  updateTasks(tasks) {
    this.taskList.updateTasks(tasks);
  }
}