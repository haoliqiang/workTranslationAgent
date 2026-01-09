"""Translation request model"""

from __future__ import annotations

from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    """Translation request

    direction must be specified by the frontend (pm_to_dev or dev_to_pm)
    If model is specified, the specified model will be used; otherwise the default configured model will be used
    """

    content: str = Field(..., min_length=1, max_length=10000, description="Content to translate")
    stream: bool = Field(default=True, description="Whether to stream output")
    context: str | None = Field(default=None, max_length=2000, description="Additional context")
    direction: str | None = Field(default=None, description="Translation direction: pm_to_dev or dev_to_pm (required, must be specified by frontend)")
    model: str | None = Field(default=None, description="Model name: auto, qwen-max or openai, leave empty to use default configuration")
