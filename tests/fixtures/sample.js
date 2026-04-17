/**
 * Greet a user by name.
 * @param {string} name - The user's name.
 * @returns {string} A greeting message.
 */
function greet(name) {
  return `Hello, ${name}!`;
}

function undocumentedAdd(a, b) {
  return a + b;
}

const multiply = (a, b) => a * b;

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
