export function validateTaskInput(task) {
  // Check if task is provided
  if (!task) {
    return {
      isValid: false,
      errors: ['Task is required']
    };
  }

  const errors = [];

  // Validate title
  if (!task.title || task.title.trim() === '') {
    errors.push('Title is required');
  } else if (task.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  // Validate description
  if (task.description && task.description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }

  // Validate priority
  if (task.priority !== undefined && task.priority !== null) {
    if (!['low', 'medium', 'high'].includes(task.priority)) {
      errors.push('Priority must be one of: low, medium, high');
    }
  }

  // Validate status
  if (task.status !== undefined && task.status !== null) {
    if (!['todo', 'in-progress', 'completed'].includes(task.status)) {
      errors.push('Status must be one of: todo, in-progress, completed');
    }
  }

  // Validate dueDate
  if (task.dueDate !== undefined && task.dueDate !== null) {
    const date = new Date(task.dueDate);
    if (isNaN(date.getTime())) {
      errors.push('Due date must be a valid date');
    }
  }

  // Validate assignee
  if (task.assignee !== undefined && task.assignee !== null) {
    if (!task.assignee.email || task.assignee.email.trim() === '') {
      errors.push('Assignee email is required');
    } else if (!isValidEmail(task.assignee.email)) {
      errors.push('Assignee email must be valid');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}