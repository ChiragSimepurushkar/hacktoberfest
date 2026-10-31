"""Unit tests for image preprocessing service."""
import io
import pytest
from PIL import Image

from services.preprocess import preprocess_image, _MAX_DIMENSION


def test_preprocess_jpeg():
    """Test preprocessing on standard JPEG bytes."""
    img = Image.new("RGB", (200, 150), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    raw_bytes = buf.getvalue()

    result = preprocess_image(raw_bytes)
    assert isinstance(result, bytes)
    assert len(result) > 0
    # Must be valid JPEG format
    assert result[:3] == b"\xff\xd8\xff"


def test_preprocess_rgba_png_conversion():
    """Test RGBA PNG is converted to RGB JPEG properly."""
    img = Image.new("RGBA", (100, 100), color=(255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw_bytes = buf.getvalue()

    result = preprocess_image(raw_bytes)
    assert result[:3] == b"\xff\xd8\xff"
    out_img = Image.open(io.BytesIO(result))
    assert out_img.mode == "RGB"


def test_preprocess_resizes_oversized_image():
    """Test that oversized images are shrunk within _MAX_DIMENSION bounds."""
    oversized = Image.new("RGB", (_MAX_DIMENSION + 500, 800), color="blue")
    buf = io.BytesIO()
    oversized.save(buf, format="JPEG")

    result = preprocess_image(buf.getvalue())
    out_img = Image.open(io.BytesIO(result))
    assert out_img.width <= _MAX_DIMENSION
    assert out_img.height <= _MAX_DIMENSION


def test_preprocess_invalid_bytes():
    """Test that non-image bytes raise ValueError."""
    with pytest.raises(ValueError, match="Cannot decode image"):
        preprocess_image(b"not-an-image-payload")
