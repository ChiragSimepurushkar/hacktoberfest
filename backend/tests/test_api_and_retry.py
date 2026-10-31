"""API endpoint and self-repair retry loop integration tests."""
import io
import json
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image

from main import app

client = TestClient(app)
FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


def _make_dummy_image_bytes() -> bytes:
    img = Image.new("RGB", (50, 50), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestHealthEndpoint:
    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestExtractEndpoint:
    @patch("main.classify_image")
    def test_unsupported_diagram(self, mock_classify):
        mock_classify.return_value = "unsupported"
        dummy_img = _make_dummy_image_bytes()
        response = client.post(
            "/extract",
            files={"image": ("test.jpg", dummy_img, "image/jpeg")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unsupported"
        assert "No recognizable" in data["message"]

    def test_empty_image_upload(self):
        response = client.post(
            "/extract",
            files={"image": ("empty.jpg", b"", "image/jpeg")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "error"
        assert "empty" in data["message"]

    @patch("main.extract_diagram")
    @patch("main.classify_image")
    def test_extract_all_3_types_success(self, mock_classify, mock_extract):
        """Test that all 3 diagram types succeed end-to-end via /extract."""
        for diagram_type in ["free_body", "circuit", "state_machine"]:
            mock_classify.return_value = diagram_type
            fixture_data = json.loads((FIXTURES_DIR / f"{diagram_type}.json").read_text())
            mock_extract.return_value = fixture_data

            dummy_img = _make_dummy_image_bytes()
            response = client.post(
                "/extract",
                files={"image": (f"{diagram_type}.jpg", dummy_img, "image/jpeg")}
            )
            assert response.status_code == 200
            res = response.json()
            assert res["status"] == "ok"
            assert res["diagram_type"] == diagram_type
            assert "data" in res

            # Specifically verify state_machine preserves 'from' and 'to' alias keys
            if diagram_type == "state_machine":
                first_tr = res["data"]["transitions"][0]
                assert "from" in first_tr
                assert "to" in first_tr
                assert "from_state" not in first_tr

    @patch("main.extract_diagram")
    @patch("main.classify_image")
    def test_retry_loop_self_repair_success(self, mock_classify, mock_extract):
        """
        Confirm self-repair retry loop:
        Attempt 0 returns invalid JSON (violates schema).
        Attempt 1 receives error_feedback and returns valid JSON.
        """
        mock_classify.return_value = "free_body"
        valid_fixture = json.loads((FIXTURES_DIR / "free_body.json").read_text())
        invalid_fixture = dict(valid_fixture)
        invalid_fixture["mass"] = -10.0  # violates mass_must_be_positive validator

        mock_extract.side_effect = [invalid_fixture, valid_fixture]

        dummy_img = _make_dummy_image_bytes()
        response = client.post(
            "/extract",
            files={"image": ("retry.jpg", dummy_img, "image/jpeg")}
        )
        assert response.status_code == 200
        res = response.json()
        assert res["status"] == "ok"
        assert res["diagram_type"] == "free_body"
        assert mock_extract.call_count == 2

        # Check that error_feedback was passed on the second call
        second_call_kwargs = mock_extract.call_args_list[1].kwargs
        assert "mass must be positive" in second_call_kwargs.get("error_feedback", "")

    @patch("main.extract_diagram")
    @patch("main.classify_image")
    def test_retry_loop_max_retries_termination(self, mock_classify, mock_extract):
        """
        Confirm retry loop terminates after MAX_RETRIES (2 retries = 3 attempts total)
        and returns an error status without looping indefinitely.
        """
        mock_classify.return_value = "circuit"
        valid_fixture = json.loads((FIXTURES_DIR / "circuit.json").read_text())
        invalid_fixture = dict(valid_fixture)
        invalid_fixture["components"] = []  # violates components_must_be_non_empty

        # Always return invalid
        mock_extract.return_value = invalid_fixture

        dummy_img = _make_dummy_image_bytes()
        response = client.post(
            "/extract",
            files={"image": ("fail.jpg", dummy_img, "image/jpeg")}
        )
        assert response.status_code == 200
        res = response.json()
        assert res["status"] == "error"
        assert "Could not extract valid structure after 2 retries" in res["message"]
        assert "at least one component is required" in res["last_error"]
        assert mock_extract.call_count == 3  # Initial + 2 retries = 3

    @patch("main.extract_diagram")
    @patch("main.classify_image")
    def test_needs_clarification_handling(self, mock_classify, mock_extract):
        """Confirm needs_clarification is returned cleanly when handwriting is ambiguous."""
        mock_classify.return_value = "circuit"
        mock_extract.return_value = {
            "needs_clarification": "The resistor value near node B is smudged and unreadable."
        }

        dummy_img = _make_dummy_image_bytes()
        response = client.post(
            "/extract",
            files={"image": ("smudged.jpg", dummy_img, "image/jpeg")}
        )
        assert response.status_code == 200
        res = response.json()
        assert res["status"] == "needs_clarification"
        assert "smudged and unreadable" in res["message"]
