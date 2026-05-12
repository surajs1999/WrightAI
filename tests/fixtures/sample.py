"""Sample Python module for testing."""

from typing import Optional


def add_numbers(a: int, b: int) -> int:
    """Add two numbers together.

    Args:
        a (int): First number.
        b (int): Second number.

    Returns:
        int: The sum.
    """
    return a + b


def undocumented_function(x: str, y: Optional[int] = None) -> bool:
    """
    Checks if a string length exceeds a specified threshold or is non-empty.

    Evaluates whether the length of the input string is greater than a given threshold value. If no threshold is provided, returns True for any non-empty string.

    Args:
        x (str): The string whose length will be evaluated.
        y (Optional[int]): The threshold length to compare against. If None, checks if the string is non-empty.

    Returns:
        bool: True if the string length is greater than the threshold (or non-empty when threshold is None), False otherwise.

    Example:
        ```
        result = undocumented_function("hello", 3)
        ```

    Complexity: O(n) time where n is the length of x, O(1) space
    """
    if y is None:
        return len(x) > 0
    return len(x) > y


async def async_fetch(url: str, timeout: int = 30) -> dict:
    """Fetch data from a URL asynchronously.

    Args:
        url (str): The URL to fetch.
        timeout (int): Request timeout in seconds.

    Returns:
        dict: Response data.
    """
    return {"url": url, "timeout": timeout}


def another_undocumented(items: list, key: str) -> list:
    """
    Filters a list of items to return only those containing the specified key.

    Args:
        items (list): The list of items to filter. Each item must support the 'in' operator for key lookup (e.g., dictionaries, strings, or other containers).
        key (str): The key to search for within each item.

    Returns:
        list: A new list containing only the items from the input list that contain the specified key.

    Raises:
        TypeError: When an item in the list does not support the 'in' operator with the given key type.

    Example:
        ```
        filtered = another_undocumented([{'name': 'Alice'}, {'age': 30}], 'name')
        ```

    Complexity: O(n*m) time where n is the number of items and m is the average cost of the 'in' operation, O(n) space for the result list
    """
    return [item for item in items if key in item]


class Calculator:
    """A simple calculator class."""

    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers.

        Args:
            a (float): First factor.
            b (float): Second factor.

        Returns:
            float: The product.
        """
        return a * b

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
