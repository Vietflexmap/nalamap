"""GLM provider adapter for the Zhipu AI / Z.AI OpenAI-compatible API."""

import os
from typing import Optional

from models.model_info import ModelInfo


def _api_key() -> Optional[str]:
    """Return the preferred GLM key, supporting both common env names."""

    return os.getenv("GLM_API_KEY") or os.getenv("ZHIPUAI_API_KEY")


def is_available() -> bool:
    """Check whether a GLM API key is configured."""

    return bool(_api_key())


def get_available_models() -> list[ModelInfo]:
    """Return configured GLM models for the settings API.

    ``GLM_MODELS`` keeps the selector aligned with the account's enabled
    models without requiring an application code change.
    """

    configured = os.getenv("GLM_MODELS", "glm-4.5,glm-4.5-air,glm-4.5-flash")
    model_names = [name.strip() for name in configured.split(",") if name.strip()]
    return [
        ModelInfo(
            name=name,
            max_tokens=8192,
            description=f"{name} · GLM OpenAI-compatible agent model",
            supports_tools=True,
            supports_vision=False,
            context_window=128000,
            supports_parallel_tool_calls=True,
            tool_calling_quality="good",
            reasoning_capability="advanced",
        )
        for name in model_names
    ]


def get_llm(max_tokens: int = 8192, model_name: Optional[str] = None):
    """Create a LangChain ChatOpenAI client pointed at the GLM endpoint."""

    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=model_name or os.getenv("GLM_MODEL", "glm-4.5"),
        base_url=os.getenv(
            "GLM_API_BASE_URL", "https://open.bigmodel.cn/api/paas/v4"
        ).rstrip("/"),
        api_key=_api_key(),
        temperature=0,
        max_tokens=max_tokens,
        timeout=None,
        max_retries=3,
    )
