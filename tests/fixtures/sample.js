/**
 * Greet a user by name.
 * @param {string} name - The user's name.
 * @returns {string} A greeting message.
 */
function greet(name) {
  return `Hello, ${name}!`;
}

/**
 * Adds two numbers together and returns their sum.
 *
 * @param {number} a - The first number to add.
 * @param {number} b - The second number to add.
 * @returns {number} The sum of the two input numbers.
 * @example
 * const result = undocumentedAdd(5, 3); // returns 8
 */
function undocumentedAdd(a, b) {
  return a + b;
}

/**
 * Multiplies two numbers and returns their product.
 *
 * @param {number} a - The first number to multiply.
 * @param {number} b - The second number to multiply.
 * @returns {number} The product of a and b.
 * @example
 * const result = multiply(5, 3); // returns 15
 */
/**
 * Multiplies two numbers and returns their product.
 *
 * @param {number} a - The first number to multiply.
 * @param {number} b - The second number to multiply.
 * @returns {number} The product of a and b.
 * @example
 * const result = multiply(5, 3); // returns 15
 */
const multiply = (a, b) => a * b;

/**
 * Fetches data from a URL and parses the response as JSON.
 *
 * Makes an asynchronous HTTP request to the specified URL using the Fetch API and automatically parses the response body as JSON.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {Object} options - Optional configuration object for the fetch request (headers, method, body, etc.). Defaults to an empty object.
 * @returns {Promise<any>} A promise that resolves to the parsed JSON data from the response.
 * @throws {TypeError} When the network request fails or the URL is invalid.
 * @throws {SyntaxError} When the response body cannot be parsed as valid JSON.
 * @example
 * const data = await fetchData('https://api.example.com/users', { method: 'GET' })
 */
async function fetchData(url, options = {}) {
  const response = await fetch(url, options);
  return response.json();
}

class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, ...args) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(...args));
  }
}

module.exports = { greet, undocumentedAdd, multiply, fetchData, EventEmitter };
