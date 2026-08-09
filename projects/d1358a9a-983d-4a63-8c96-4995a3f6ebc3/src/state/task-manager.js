import { store } from './store.js';

export function createTask(task) {
  const newTask = {
    id: Date.now().toString(),
    ...task,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  store.tasks.push(newTask);
  return newTask;
}

export function updateTask(id, updates) {
  const taskIndex = store.tasks.findIndex(task => task.id === id);
  
  if (taskIndex === -1) {
    throw new Error(`Task with id ${id} not found`);
  }
  
  const updatedTask = {
    ...store.tasks[taskIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  store.tasks[taskIndex] = updatedTask;
  return updatedTask;
}

export function deleteTask(id) {
  const taskIndex = store.tasks.findIndex(task => task.id === id);
  
  if (taskIndex === -1) {
    throw new Error(`Task with id ${id} not found`);
  }
  
  return store.tasks.splice(taskIndex, 1)[0];
}

export function toggleTaskStatus(id) {
  const taskIndex = store.tasks.findIndex(task => task.id === id);
  
  if (taskIndex === -1) {
    throw new Error(`Task with id ${id} not found`);
  }
  
  const updatedTask = {
    ...store.tasks[taskIndex],
    isCompleted: !store.tasks[taskIndex].isCompleted,
    updatedAt: new Date().toISOString()
  };
  
  store.tasks[taskIndex] = updatedTask;
  return updatedTask;
}