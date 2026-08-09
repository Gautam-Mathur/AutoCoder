const store = {
  tasks: [],
  
  getTasks() {
    return this.tasks;
  },
  
  setTasks(tasks) {
    this.tasks = tasks;
  }
};

export { store as getTasks, store as setTasks };