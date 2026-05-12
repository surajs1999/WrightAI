"""Generate the Wright AI logo system — Circle W design."""

from __future__ import annotations

import sys
from pathlib import Path

import cairosvg
from PIL import Image
import io

OUTPUT_DIR = Path("./wright-logo")

# ── Pre-flight: confirm overwrite if directory already has files ──────────────
if OUTPUT_DIR.exists() and any(OUTPUT_DIR.iterdir()):
    answer = (
        input(
            "Directory already exists — proceeding will overwrite existing files. Continue? [y/N] "
        )
        .strip()
        .lower()
    )
    if answer != "y":
        print("Aborted.")
        sys.exit(0)

OUTPUT_DIR.mkdir(exist_ok=True)

# ── Master SVG ────────────────────────────────────────────────────────────────
MASTER_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
    '<circle cx="256" cy="256" r="256" fill="#534AB7"/>'
    '<path d="M 86 154 L 163 358 L 256 194 L 349 358 L 426 154"'
    ' stroke="#FFFFFF" stroke-width="46" stroke-linecap="round"'
    ' stroke-linejoin="round" fill="none"/>'
    "</svg>"
)

DARK_SVG = MASTER_SVG.replace("#534AB7", "#26215C")


# ── Helpers ───────────────────────────────────────────────────────────────────
def write_file(path: Path, data: bytes | str) -> None:
    """
    Writes data to a file, handling both text and binary data appropriately.

    Args:
        path (Path): The file system path where the data will be written.
        data (bytes | str): The content to write to the file, either as a string or bytes.
    """
    if isinstance(data, str):
        path.write_text(data, encoding="utf-8")
    else:
        path.write_bytes(data)


def assert_png(path: Path, expected_size: tuple[int, int]) -> None:
    """
    Validates that a PNG image file exists, has content, matches expected dimensions, and has valid image integrity.

    Performs multiple assertions to verify a PNG file: checks file existence and non-zero size, validates image dimensions match expected size, and verifies the image file integrity by opening and validating it.

    Args:
        path (Path): Path object pointing to the PNG file to validate.
        expected_size (tuple[int, int]): Expected image dimensions as (width, height) in pixels.

    Returns:
        None: This function returns nothing; it raises AssertionError if validation fails.

    Raises:
        AssertionError: When the file does not exist, is empty, has incorrect dimensions, or fails integrity verification.
        PIL.UnidentifiedImageError: When the file cannot be opened as a valid image.

    Example:
        ```
        assert_png(Path('logo.png'), (512, 512))
        ```
    """
    assert path.exists() and path.stat().st_size > 0, f"FAIL: {path} missing or empty"
    img = Image.open(path)
    assert img.size == expected_size, f"FAIL: {path} expected {expected_size}, got {img.size}"
    # verify integrity on a fresh open
    with Image.open(path) as v:
        v.verify()


def assert_svg(path: Path, bg_color: str = "#534AB7") -> None:
    """
    Validates that an SVG file contains exactly one circle element, exactly one path element, and includes a specified background color.

    Reads the content of an SVG file and performs three assertions: verifies the presence of exactly one <circle> tag, exactly one <path> tag, and confirms that the specified background color string appears in the content. This function is typically used in testing to ensure SVG files are generated with the correct structure and styling.

    Args:
        path (Path): The filesystem path to the SVG file to validate.
        bg_color (str): The expected background color hex code that should appear in the SVG content. Defaults to '#534AB7'.

    Returns:
        None: This function does not return a value; it either completes successfully or raises an AssertionError.

    Raises:
        AssertionError: When the SVG file does not contain exactly one <circle> element.
        AssertionError: When the SVG file does not contain exactly one <path> element.
        AssertionError: When the specified background color is not found in the SVG content.

    Example:
        ```
        assert_svg(Path('logo.svg'), bg_color='#534AB7')
        ```

    Complexity: O(n) time where n is the size of the SVG file content, O(n) space for storing the file content
    """
    content = path.read_text()
    assert content.count("<circle") == 1, f"FAIL: {path} should have exactly 1 <circle>"
    assert content.count("<path") == 1, f"FAIL: {path} should have exactly 1 <path>"
    assert bg_color in content, f"FAIL: {path} missing background color {bg_color}"


def render_png(svg: str, size: int) -> bytes:
    """
    Renders an SVG string to a PNG image with the specified dimensions.

    Converts an SVG string into PNG format using CairoSVG library, encoding the SVG as bytes and rendering it to the specified square dimensions.

    Args:
        svg (str): The SVG content as a string to be rendered.
        size (int): The width and height in pixels for the output PNG image (creates a square image).

    Returns:
        bytes: The rendered PNG image as a bytes object.

    Raises:
        cairosvg.surface.cairo.CairoError: When the SVG content is malformed or cannot be parsed.
        ValueError: When the size parameter is invalid or negative.

    Example:
        ```
        png_data = render_png('<svg><circle cx="50" cy="50" r="40"/></svg>', 256)
        ```
    """
    return cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)


# ── 1. wright-logo.svg ────────────────────────────────────────────────────────
svg_path = OUTPUT_DIR / "wright-logo.svg"
write_file(svg_path, MASTER_SVG)
assert_svg(svg_path)
print(f"✓ {svg_path.name}")

# ── 2–7. PNG sizes ────────────────────────────────────────────────────────────
png_sizes = [512, 256, 128, 64, 32, 16]
png_data: dict[int, bytes] = {}

for size in png_sizes:
    data = render_png(MASTER_SVG, size)
    png_data[size] = data
    path = OUTPUT_DIR / f"wright-icon-{size}.png"
    write_file(path, data)
    assert_png(path, (size, size))
    print(f"✓ {path.name}")

# ── 8. wright-favicon.ico ─────────────────────────────────────────────────────
ico_path = OUTPUT_DIR / "wright-favicon.ico"
ico_sizes = [16, 32, 48]
ico_images: list[Image.Image] = []

for size in ico_sizes:
    data = render_png(MASTER_SVG, size) if size not in png_data else png_data[size]
    if size == 48:
        data = render_png(MASTER_SVG, 48)
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    ico_images.append(img)

ico_images[0].save(
    ico_path,
    format="ICO",
    sizes=[(s, s) for s in ico_sizes],
    append_images=ico_images[1:],
)
assert ico_path.exists() and ico_path.stat().st_size > 0, f"FAIL: {ico_path} missing"
print(f"✓ {ico_path.name}")

# ── 9. wright-logo-dark-bg.svg ────────────────────────────────────────────────
dark_path = OUTPUT_DIR / "wright-logo-dark-bg.svg"
write_file(dark_path, DARK_SVG)
assert_svg(dark_path, bg_color="#26215C")
print(f"✓ {dark_path.name}")

# ── 10. wright-icon-rounded.png (1024×1024, transparent bg) ──────────────────
rounded_data = render_png(MASTER_SVG, 1024)
rounded_path = OUTPUT_DIR / "wright-icon-rounded.png"
write_file(rounded_path, rounded_data)
assert_png(rounded_path, (1024, 1024))
print(f"✓ {rounded_path.name}")

# ── Print raw SVG ─────────────────────────────────────────────────────────────
print("\n── wright-logo.svg ──────────────────────────────────────────────")
print(svg_path.read_text())
print("─────────────────────────────────────────────────────────────────\n")

# ── File listing ──────────────────────────────────────────────────────────────
print(f"{'File':<35} {'Size':>8}")
print("─" * 45)
for f in sorted(OUTPUT_DIR.iterdir()):
    kb = f.stat().st_size / 1024
    print(f"{f.name:<35} {kb:>7.1f} KB")

print("\nWright logo system generated — 10 files")
