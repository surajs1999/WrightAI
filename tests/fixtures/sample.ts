interface User {
  id: number;
  name: string;
  email: string;
}

/**
 * Finds a user by their ID.
 * @param {User[]} users - Array of users.
 * @param {number} id - The user ID to find.
 * @returns {User | undefined} The found user or undefined.
 */
function findUserById(users: User[], id: number): User | undefined {
  return users.find((u) => u.id === id);
}

/**
 * Fetches a user by their ID from the API endpoint and returns the user data or null if not found.
 *
 * Makes an asynchronous HTTP GET request to retrieve user information from the / /**
  * Transforms the input string to uppercase or lowercase based on the specified flag.
  *
  * @param {string} input - The string to be transformed.
  * @param {boolean} upper - If true, converts the input to uppercase; if false or omitted, converts to lowercase. Defaults to false.
  * @returns {string} The transformed string in either uppercase or lowercase.
  * @example
  * const result = undocumentedTransform("Hello World", true); // Returns "HELLO WORLD"
  */
api/users endpoint. Returns null if the response is not successful (non-2xx status code), otherwise parses and returns the response as a User object.
 *
 * @param {number} userId - The unique identifier of the user to fetch.
 * @returns {Promise<User | null>} A promise that resolves to the User object if found and the request is successful, or null if the user is not found or the request fails.
 * @example
 * const user = await fetchUser(123);
 */
/**
 * Fetches a user by ID from the API endpoint and returns the user object or null if not found.
 *
 * Makes an asynchronous HTTP GET request to /api/users/{userId} and returns the parsed JSON response as a User object. Returns null if the response is not successful (non-2xx status code).
 *
 * @param {number} userId - The unique identifier of the user to fetch.
 * @returns {Promise<User | null>} A promise that resolves to a User object if found and the request is successful, or null if the user is not found or the request fails.
 * @example
 * const user = await fetchUser(123);
 */
async function fetchUser(userId: number): Promise<User | null> {
  const resp = await fetch(`/api/users/${userId}`);
  if (!resp.ok) return null;
  return resp.json() as Promise<User>;
}

/**
 * Transforms the input string to either uppercase or lowercase based on the upper flag.
 *
 * @param {string} input - The string to be transformed.
 * @param {boolean} upper - If true, converts the string to uppercase; if false, converts to lowercase. Defaults to false.
 * @returns {string} The transformed string in either uppercase or lowercase.
 * @example
 * const result = undocumentedTransform("Hello World", true); // Returns "HELLO WORLD"
 */
function undocumentedTransform(input: string, upper: boolean = false): string {
  return upper ? input.toUpperCase() : input.toLowerCase();
}

export { User, findUserById, fetchUser, undocumentedTransform };
