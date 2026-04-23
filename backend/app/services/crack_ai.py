from __future__ import annotations

import logging
import json
from pathlib import Path
import shutil
import zipfile
from typing import Any
from urllib.request import Request, urlopen

import numpy as np
from app.core.config import settings

_MODEL1_FILE = "model1_best_phase2.keras"
_IMAGE_SIZE = (224, 224)
_CLASS_NAMES = ["no_crack", "low", "moderate", "high", "critical"]
_CRITICAL_THRESHOLD = 0.68

_model: Any | None = None
_tf: Any | None = None
_loaded_model_path: Path | None = None
_model_error: str | None = None
_model_init_attempted = False

logger = logging.getLogger(__name__)


class ModelUnavailableError(RuntimeError):
    """Raised when crack model cannot be prepared for inference."""


def _strip_key_deep(value: Any, key_to_strip: str) -> Any:
    if isinstance(value, dict):
        return {
            key: _strip_key_deep(val, key_to_strip)
            for key, val in value.items()
            if key != key_to_strip
        }
    if isinstance(value, list):
        return [_strip_key_deep(item, key_to_strip) for item in value]
    return value


def _make_compat_model_archive(model_path: Path, key_to_strip: str = "quantization_config") -> Path:
    if model_path.suffix.lower() != ".keras":
        raise RuntimeError("Compatibility patch supports only .keras archives")

    compat_path = model_path.with_suffix(".compat.keras")
    with zipfile.ZipFile(model_path, "r") as source_zip:
        if "config.json" not in source_zip.namelist():
            raise RuntimeError("config.json missing in .keras archive")

        raw_config = source_zip.read("config.json")
        parsed_config = json.loads(raw_config.decode("utf-8"))
        patched_config = _strip_key_deep(parsed_config, key_to_strip)
        patched_config_bytes = json.dumps(patched_config, separators=(",", ":")).encode("utf-8")

        with zipfile.ZipFile(compat_path, "w", compression=zipfile.ZIP_DEFLATED) as target_zip:
            for name in source_zip.namelist():
                if name == "config.json":
                    target_zip.writestr(name, patched_config_bytes)
                else:
                    target_zip.writestr(name, source_zip.read(name))

    return compat_path


def _load_model_with_compat_fallback(tf: Any, model_path: Path) -> Any:
    try:
        return tf.keras.models.load_model(model_path, compile=False)
    except Exception as exc:
        err_text = str(exc)
        if "quantization_config" not in err_text:
            raise

        logger.warning(
            "Model deserialization failed due to quantization_config. Retrying with compatibility patch."
        )
        compat_path = _make_compat_model_archive(model_path, key_to_strip="quantization_config")
        try:
            model = tf.keras.models.load_model(compat_path, compile=False)
            logger.info("Crack model loaded using compatibility patch")
            return model
        finally:
            try:
                if compat_path.exists():
                    compat_path.unlink()
            except Exception:
                pass


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


def _model_target_path() -> Path:
    configured_file = str(settings.CRACK_MODEL_PATH or "").strip()
    if configured_file:
        target = _resolve_config_path(configured_file)
    else:
        cache_dir = _resolve_config_path(str(settings.MODEL_CACHE_DIR or "runtime_models").strip())
        target = cache_dir / _MODEL1_FILE

    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def _download_model_if_configured(target: Path) -> Path | None:
    url = str(settings.CRACK_MODEL_URL or "").strip()
    if not url:
        return None

    tmp_target = target.with_suffix(target.suffix + ".download")

    try:
        timeout = int(settings.MODEL_DOWNLOAD_TIMEOUT_SEC or 300)

        logger.info("Downloading crack model...")
        print("Downloading crack model...")
        request = Request(url, headers={"User-Agent": "rockefeller-backend/1.0"})
        with urlopen(request, timeout=timeout) as response, tmp_target.open("wb") as out_file:  # nosec B310
            shutil.copyfileobj(response, out_file)

        if not tmp_target.exists() or tmp_target.stat().st_size == 0:
            raise RuntimeError("Downloaded crack model is empty")

        tmp_target.replace(target)
        logger.info("Model downloaded successfully")
        print("Model downloaded successfully")
        return target
    except Exception as exc:
        try:
            if tmp_target.exists():
                tmp_target.unlink()
        except Exception:
            pass
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

    target = _model_target_path()
    if target.exists():
        return target

    downloaded = _download_model_if_configured(target)
    if downloaded and downloaded.exists():
        return downloaded

    checked.append(str(target))
    raise FileNotFoundError(
        "Crack model file not found. Checked: "
        + ", ".join(checked)
        + ". Configure CRACK_MODEL_PATH or MODEL_ARTIFACTS_DIR, or provide CRACK_MODEL_URL."
    )


def preload_crack_model() -> None:
    global _model, _loaded_model_path, _model_error, _model_init_attempted
    if _model is not None:
        return

    if _model_init_attempted and _model_error:
        raise ModelUnavailableError(_model_error)

    _model_init_attempted = True

    try:
        tf = _ensure_tf()
        model_path = _resolve_crack_model_path()
        _model = _load_model_with_compat_fallback(tf, model_path)
        _loaded_model_path = model_path
        _model_error = None
        logger.info("Crack model loaded")
        print("Crack model loaded")
        return
    except Exception as first_exc:
        model_path = _model_target_path()
        can_retry_download = bool(str(settings.CRACK_MODEL_URL or "").strip()) and model_path.exists()
        if not can_retry_download:
            _model_error = str(first_exc)
            raise ModelUnavailableError(_model_error)

        logger.warning(
            "Crack model load failed; deleting file and retrying download once: %s",
            first_exc,
        )
        print(f"Crack model load failed; deleting file and retrying download once: {first_exc}")
        try:
            model_path.unlink()
        except Exception:
            pass

    try:
        tf = _ensure_tf()
        model_path = _model_target_path()
        downloaded_path = _download_model_if_configured(model_path)
        if not downloaded_path:
            raise RuntimeError("CRACK_MODEL_URL is required for retry download")

        _model = _load_model_with_compat_fallback(tf, downloaded_path)
        _loaded_model_path = downloaded_path
        _model_error = None
        logger.info("Crack model loaded")
        print("Crack model loaded")
    except Exception as second_exc:
        _model = None
        _loaded_model_path = None
        _model_error = str(second_exc)
        raise ModelUnavailableError(_model_error)


def crack_model_status() -> dict[str, bool | str | None]:
    return {
        "model1_loaded": _model is not None,
        "model_error": _model_error,
        "model_path": str(_loaded_model_path) if _loaded_model_path else None,
    }


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

    if _model is None:
        raise ModelUnavailableError("Crack model unavailable")

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
    ai_risk_score = confidence
    critical_crack_flag = 1 if ai_severity_class == "critical" and ai_risk_score >= _CRITICAL_THRESHOLD else 0

    return {
        "ai_severity_class": ai_severity_class,
        "ai_risk_score": round(ai_risk_score, 4),
        "confidence": round(confidence, 4),
        "critical_crack_flag": critical_crack_flag,
    }
