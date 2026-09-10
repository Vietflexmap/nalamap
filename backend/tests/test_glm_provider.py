"""Unit tests for the optional GLM provider adapter."""

from services.ai import glm


def test_glm_provider_accepts_glm_api_key(monkeypatch):
    monkeypatch.setenv("GLM_API_KEY", "test-key")
    monkeypatch.delenv("ZHIPUAI_API_KEY", raising=False)

    assert glm.is_available() is True


def test_glm_provider_supports_legacy_zhipu_key(monkeypatch):
    monkeypatch.delenv("GLM_API_KEY", raising=False)
    monkeypatch.setenv("ZHIPUAI_API_KEY", "test-key")

    assert glm.is_available() is True


def test_glm_models_can_be_configured(monkeypatch):
    monkeypatch.setenv("GLM_MODELS", "glm-custom, glm-fast")

    assert [model.name for model in glm.get_available_models()] == [
        "glm-custom",
        "glm-fast",
    ]
