from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.request import urlopen

import numpy as np
from app.core.config import settings

_MODEL1_FILE = "model1_best_phase2.keras"
_IMAGE_SIZE = (224, 224)
_CLASS_NAMES = ["no_crack", "low", "moderate", "high", "critical"]
_SEVERITY_SCORE_MAP = {
    "no_crack": 0.0,
    "low": 0.15,
    "moderate": 0.40,
    "high": 0.60,
    "critical": 0.85,
}
_CRITICAL_THRESHOLD = 0.68

_model: Any | None = None
_tf: Any | None = None
_loaded_model_path: Path | None = None


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_config_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path

    backend_root = _backend_root()
    backend_candidate = backend_root / path
    workspace_candidate = backend_root.parent / path

    if backend_candidate.exists():
        return backend_candidate
    if workspace_candidate.exists():
        return workspace_candidate
    return backend_candidate


def _ensure_tf() -> Any:
    global _tf
    if _tf is not None:
        return _tf

    try:
        import tensorflow as tf  # type: ignore
    except Exception as exc:
        raise RuntimeError(f"TensorFlow import failed: {exc}")

    _tf = tf
    return _tf


def _dataset_base() -> Path:
    configured = str(settings.MODEL_ARTIFACTS_DIR or "").strip()
    if configured:
        configured_path = _resolve_config_path(configured)
        if configured_path.exists():
            return configured_path
        return configured_path

    backend_root = _backend_root()
    workspace_root = backend_root.parent

    candidates = [
        backend_root / "dataset",
        workspace_root / "dataset",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate

    return backend_root / "dataset"


def _cache_dir() -> Path:
    configured = str(settings.MODEL_CACHE_DIR or "runtime_models").strip()
    path = _resolve_config_path(configured)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _download_model_if_configured() -> Path | None:
    url = str(settings.CRACK_MODEL_URL or "").strip()
    if not url:
        return None

    target = _cache_dir() / _MODEL1_FILE
    if target.exists():
        return target

    try:
        timeout = int(settings.MODEL_DOWNLOAD_TIMEOUT_SEC or 30)
        with urlopen(url, timeout=timeout) as response:  # nosec B310
            data = response.read()
        if not data:
            raise RuntimeError("Downloaded crack model is empty")
        target.write_bytes(data)
        return target
    except Exception as exc:
        raise RuntimeError(f"Unable to download crack model from CRACK_MODEL_URL: {exc}")


def _resolve_crack_model_path() -> Path:
    candidates: list[Path] = []

    configured_file = str(settings.CRACK_MODEL_PATH or "").strip()
    if configured_file:
        candidates.append(_resolve_config_path(configured_file))

    candidates.append(_dataset_base() / _MODEL1_FILE)

    checked: list[str] = []
    for candidate in candidates:
        checked.append(str(candidate))
        if candidate.exists():
            return candidate

    downloaded = _download_model_if_configured()
    if downloaded and downloaded.exists():
        return downloaded

    raise FileNotFoundError(
        "Crack model file not found. Checked: "
        + ", ".join(checked)
        + ". Configure CRACK_MODEL_PATH or MODEL_ARTIFACTS_DIR, or provide CRACK_MODEL_URL."
    )


def preload_crack_model() -> None:
    global _model, _loaded_model_path
    if _model is not None:
        return

    tf = _ensure_tf()
    model_path = _resolve_crack_model_path()
    _model = tf.keras.models.load_model(model_path, compile=False)
    _loaded_model_path = model_path


def crack_model_status() -> dict[str, bool]:
    return {"model1_loaded": _model is not None}


def _preprocess(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise ValueError("Empty image bytes")

    tf = _ensure_tf()
    image = tf.io.decode_image(image_bytes, channels=3, expand_animations=False)
    image = tf.image.convert_image_dtype(image, tf.float32)
    image = tf.image.resize(image, _IMAGE_SIZE, method="bilinear")
    image = tf.expand_dims(image, axis=0)
    return image.numpy()


def score_crack_image(image_bytes: bytes) -> dict[str, float | int | str]:
    if _model is None:
        preload_crack_model()

    model_input = _preprocess(image_bytes)
    raw_pred = _model.predict(model_input, verbose=0)
    probs = np.asarray(raw_pred).squeeze()

    if probs.ndim == 0:
        raise ValueError("Model 1 returned invalid prediction shape")

    if probs.ndim > 1:
        probs = probs.reshape(-1)

    if probs.shape[0] != len(_CLASS_NAMES):
        raise ValueError(f"Model 1 expected {len(_CLASS_NAMES)} classes, got {probs.shape[0]}")

    total = float(np.sum(probs))
    if total <= 0 or abs(total - 1.0) > 1e-3:
        exp_scores = np.exp(probs - np.max(probs))
        probs = exp_scores / np.sum(exp_scores)

    idx = int(np.argmax(probs))
    ai_severity_class = _CLASS_NAMES[idx]
    confidence = float(probs[idx])
    ai_risk_score = float(_SEVERITY_SCORE_MAP[ai_severity_class])
    critical_crack_flag = 1 if ai_risk_score >= _CRITICAL_THRESHOLD else 0

    return {
        "ai_severity_class": ai_severity_class,
        "ai_risk_score": round(ai_risk_score, 4),
        "confidence": round(confidence, 4),
        "critical_crack_flag": critical_crack_flag,
    }
