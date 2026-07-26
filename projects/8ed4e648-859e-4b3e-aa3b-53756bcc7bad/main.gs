// Google Apps Script main file
// Handles HTTP GET requests, JSON parsing, and console logging

/**
 * Handles HTTP GET requests
 * @param {Object} e The event object containing request data
 */
function doGet(e) {
  // Log the incoming request
  console.log('Received GET request with parameters:', e);
  
  // Parse query parameters if available
  var params = e.parameter;
  
  // Log parsed parameters
  console.log('Parsed parameters:', params);
  
  // Create a response object
  var response = {
    status: 'success',
    message: 'GET request processed successfully',
    parameters: params,
    timestamp: new Date().toISOString()
  };
  
  // Log the response object
  console.log('Response object:', response);
  
  // Return JSON response
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles POST requests (if needed in future)
 * @param {Object} e The event object containing request data
 */
function doPost(e) {
  // Log the incoming POST request
  console.log('Received POST request with payload:', e);
  
  // Parse the JSON payload
  var payload = JSON.parse(e.postData.contents);
  
  // Log parsed payload
  console.log('Parsed payload:', payload);
  
  // Create a response object
  var response = {
    status: 'success',
    message: 'POST request processed successfully',
    receivedPayload: payload,
    timestamp: new Date().toISOString()
  };
  
  // Log the response object
  console.log('Response object:', response);
  
  // Return JSON response
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utility function to log messages with timestamp
 * @param {string} message The message to log
 */
function logMessage(message) {
  console.log(new Date().toISOString() + ' - ' + message);
}

/**
 * Makes a GET request to https://typicode.com using UrlFetchApp
 */
function makeGetRequest() {
  try {
    // Use UrlFetchApp to send GET request
    var response = UrlFetchApp.fetch('https://typicode.com', {
      method: 'GET'
    });
    
    // Parse the JSON response
    var jsonResponse = JSON.parse(response.getContentText());
    
    // Log the parsed result
    Logger.log('Parsed response from typicode.com:', jsonResponse);
  } catch (error) {
    // Log any errors that occur
    Logger.log('Error making GET request: ' + error.toString());
  }
}