class EmployeeManagementSystem {
  constructor() {
    this.employees = [];
    this.attendanceRecords = [];
    this.initializeApp();
  }

  initializeApp() {
    // Initialize with sample data
    this.loadSampleData();
    this.renderDashboard();
    this.setupEventListeners();
  }

  loadSampleData() {
    // Sample employee data
    this.employees = [
      { id: 1, name: 'John Doe', position: 'Software Engineer', department: 'Engineering', email: 'john.doe@company.com' },
      { id: 2, name: 'Jane Smith', position: 'Product Manager', department: 'Product', email: 'jane.smith@company.com' },
      { id: 3, name: 'Robert Johnson', position: 'UX Designer', department: 'Design', email: 'robert.johnson@company.com' }
    ];

    // Sample attendance records
    this.attendanceRecords = [
      { id: 1, employeeId: 1, date: '2023-05-01', status: 'present', checkIn: '09:00', checkOut: '17:30' },
      { id: 2, employeeId: 2, date: '2023-05-01', status: 'present', checkIn: '08:45', checkOut: '17:15' },
      { id: 3, employeeId: 3, date: '2023-05-01', status: 'absent', checkIn: null, checkOut: null }
    ];
  }

  setupEventListeners() {
    // Setup event listeners for dashboard interactions
    document.getElementById('addEmployeeBtn')?.addEventListener('click', () => this.showAddEmployeeForm());
    document.getElementById('viewAttendanceBtn')?.addEventListener('click', () => this.renderAttendanceView());
    document.getElementById('viewEmployeesBtn')?.addEventListener('click', () => this.renderEmployeeListView());
  }

  // API-001: Get all employees
  getEmployees() {
    return this.employees;
  }

  // API-002: Get employee by ID
  getEmployeeById(id) {
    return this.employees.find(emp => emp.id === id);
  }

  // API-003: Add new employee
  addEmployee(employeeData) {
    const newEmployee = {
      id: this.generateId(),
      ...employeeData
    };
    this.employees.push(newEmployee);
    return newEmployee;
  }

  // API-004: Update employee information
  updateEmployee(id, updatedData) {
    const employeeIndex = this.employees.findIndex(emp => emp.id === id);
    if (employeeIndex !== -1) {
      this.employees[employeeIndex] = { ...this.employees[employeeIndex], ...updatedData };
      return this.employees[employeeIndex];
    }
    return null;
  }

  // API-005: Delete employee
  deleteEmployee(id) {
    const employeeIndex = this.employees.findIndex(emp => emp.id === id);
    if (employeeIndex !== -1) {
      this.employees.splice(employeeIndex, 1);
      return true;
    }
    return false;
  }

  // API-006: Get attendance records
  getAttendanceRecords() {
    return this.attendanceRecords;
  }

  // API-007: Add attendance record
  addAttendanceRecord(recordData) {
    const newRecord = {
      id: this.generateId(),
      ...recordData
    };
    this.attendanceRecords.push(newRecord);
    return newRecord;
  }

  generateId() {
    return Math.max(0, ...this.employees.map(emp => emp.id), ...this.attendanceRecords.map(record => record.id)) + 1;
  }

  renderDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    const employeeCount = this.employees.length;
    const presentCount = this.attendanceRecords.filter(record => record.status === 'present').length;
    const absentCount = this.attendanceRecords.filter(record => record.status === 'absent').length;

    dashboard.innerHTML = `
      <div class="p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Employee Dashboard</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold text-blue-800">Total Employees</h3>
            <p class="text-3xl font-bold text-blue-600">${employeeCount}</p>
          </div>
          
          <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold text-green-800">Present Today</h3>
            <p class="text-3xl font-bold text-green-600">${presentCount}</p>
          </div>
          
          <div class="bg-red-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold text-red-800">Absent Today</h3>
            <p class="text-3xl font-bold text-red-600">${absentCount}</p>
          </div>
        </div>

        <div class="flex space-x-4">
          <button id="viewEmployeesBtn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            View Employees
          </button>
          <button id="viewAttendanceBtn" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            View Attendance
          </button>
          <button id="addEmployeeBtn" class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Add Employee
          </button>
        </div>
      </div>
    `;
  }

  renderEmployeeListView() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    const employeeList = this.employees.map(emp => `
      <tr class="border-b">
        <td class="py-2 px-4">${emp.id}</td>
        <td class="py-2 px-4">${emp.name}</td>
        <td class="py-2 px-4">${emp.position}</td>
        <td class="py-2 px-4">${emp.department}</td>
        <td class="py-2 px-4">${emp.email}</td>
      </tr>
    `).join('');

    dashboard.innerHTML = `
      <div class="p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Employee List</h2>
        
        <table class="min-w-full bg-white border border-gray-200">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-2 px-4 border-b text-left">ID</th>
              <th class="py-2 px-4 border-b text-left">Name</th>
              <th class="py-2 px-4 border-b text-left">Position</th>
              <th class="py-2 px-4 border-b text-left">Department</th>
              <th class="py-2 px-4 border-b text-left">Email</th>
            </tr>
          </thead>
          <tbody>
            ${employeeList}
          </tbody>
        </table>
        
        <button id="backToDashboardBtn" class="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          Back to Dashboard
        </button>
      </div>
    `;

    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => this.renderDashboard());
  }

  renderAttendanceView() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    const attendanceList = this.attendanceRecords.map(record => {
      const employee = this.getEmployeeById(record.employeeId);
      return `
        <tr class="border-b">
          <td class="py-2 px-4">${employee ? employee.name : 'Unknown'}</td>
          <td class="py-2 px-4">${record.date}</td>
          <td class="py-2 px-4">
            <span class="px-2 py-1 rounded ${record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
            </span>
          </td>
          <td class="py-2 px-4">${record.checkIn || '-'}</td>
          <td class="py-2 px-4">${record.checkOut || '-'}</td>
        </tr>
      `;
    }).join('');

    dashboard.innerHTML = `
      <div class="p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Attendance Records</h2>
        
        <table class="min-w-full bg-white border border-gray-200">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-2 px-4 border-b text-left">Employee</th>
              <th class="py-2 px-4 border-b text-left">Date</th>
              <th class="py-2 px-4 border-b text-left">Status</th>
              <th class="py-2 px-4 border-b text-left">Check In</th>
              <th class="py-2 px-4 border-b text-left">Check Out</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceList}
          </tbody>
        </table>
        
        <button id="backToDashboardBtn" class="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          Back to Dashboard
        </button>
      </div>
    `;

    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => this.renderDashboard());
  }

  showAddEmployeeForm() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    dashboard.innerHTML = `
      <div class="p-6 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Add New Employee</h2>
        
        <form id="employeeForm" class="space-y-4">
          <div>
            <label class="block text-gray-700">Name</label>
            <input type="text" id="name" required class="w-full px-3 py-2 border rounded">
          </div>
          
          <div>
            <label class="block text-gray-700">Position</label>
            <input type="text" id="position" required class="w-full px-3 py-2 border rounded">
          </div>
          
          <div>
            <label class="block text-gray-700">Department</label>
            <input type="text" id="department" required class="w-full px-3 py-2 border rounded">
          </div>
          
          <div>
            <label class="block text-gray-700">Email</label>
            <input type="email" id="email" required class="w-full px-3 py-2 border rounded">
          </div>
          
          <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Add Employee
          </button>
          <button type="button" id="cancelBtn" class="ml-2 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
            Cancel
          </button>
        </form>
      </div>
    `;

    document.getElementById('employeeForm')?.addEventListener('submit', (e) => this.handleAddEmployee(e));
    document.getElementById('cancelBtn')?.addEventListener('click', () => this.renderDashboard());
  }

  handleAddEmployee(event) {
    event.preventDefault();
    
    const employeeData = {
      name: document.getElementById('name').value,
      position: document.getElementById('position').value,
      department: document.getElementById('department').value,
      email: document.getElementById('email').value
    };

    this.addEmployee(employeeData);
    this.renderDashboard();
  }
}

// Initialize the application when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EmployeeManagementSystem();
  });
} else {
  new EmployeeManagementSystem();
}