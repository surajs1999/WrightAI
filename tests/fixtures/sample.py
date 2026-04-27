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
