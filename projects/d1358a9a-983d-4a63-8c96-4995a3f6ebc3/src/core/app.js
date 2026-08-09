import { initializeUI } from '../ui/index.js';
import { initializeStore } from '../state/store.js';

export function initializeApp() {
  // Initialize the application state store
  initializeStore();
  
  // Initialize the user interface
  initializeUI();
  
  // Additional app initialization logic can be added here
  console.log('Application initialized successfully');
}