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

async function fetchUser(userId: number): Promise<User | null> {
  const resp = await fetch(`/api/users/${userId}`);
  if (!resp.ok) return null;
  return resp.json() as Promise<User>;
}

function undocumentedTransform(input: string, upper: boolean = false): string {
  return upper ? input.toUpperCase() : input.toLowerCase();
}

export { User, findUserById, fetchUser, undocumentedTransform };
