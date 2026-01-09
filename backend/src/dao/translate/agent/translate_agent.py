"""翻译 Agent 主逻辑"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, TypedDict, cast

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessageChunk, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from core.logging import get_logger
from dao.translate.agent.tools import (
    analyze_gaps_with_llm,
    get_system_prompt,
)
from dao.translate.graph.checkpoint import TenantAwarePostgresSaver
from dao.translate.prompts.dev_to_pm import DEV_TO_PM_SYSTEM_PROMPT


logger = get_logger(__name__)


def _extract_text_content(message: BaseMessage) -> str:
    """从 LLM 消息中提取纯文本内容"""
    raw_content = message.content
    if isinstance(raw_content, str):
        return raw_content
    # LangChain 返回 list[str | dict] 格式的多部分内容
    text_parts: list[str] = []
    for part in cast(list[object], raw_content):
        if isinstance(part, str):
            text_parts.append(part)
        elif isinstance(part, dict) and "text" in part:
            text_parts.append(str(part["text"]))
    return "".join(text_parts)


def _extract_chunk_content(chunk: AIMessageChunk) -> str:
    """从流式消息块中提取文本内容"""
    raw_content = chunk.content
    if isinstance(raw_content, str):
        return raw_content
    if not raw_content:
        return ""
    # LangChain 返回 list[str | dict] 格式的多部分内容
    text_parts: list[str] = []
    for part in cast(list[object], raw_content):
        if isinstance(part, str):
            text_parts.append(part)
        elif isinstance(part, dict) and "text" in part:
            text_parts.append(str(part["text"]))
    return "".join(text_parts)


def _empty_gaps() -> list[dict[str, Any]]:
    return []


def _empty_suggestions() -> list[str]:
    return []


class TranslateState(TypedDict, total=False):
    content: str
    context: str | None
    forced_direction: str | None
    gaps: list[dict[str, Any]]
    suggestions: list[str]
    direction: str
    system_prompt: str
    translated_content: str
    error_message: str | None


@dataclass
class TranslateResult:
    """翻译结果"""

    original_content: str
    translated_content: str
    direction: str
    gaps: list[dict[str, Any]] = field(default_factory=_empty_gaps)
    suggestions: list[str] = field(default_factory=_empty_suggestions)


class TranslateAgent:
    """智能翻译 Agent"""

    def __init__(self, llm: BaseChatModel) -> None:
        self.llm = llm
        self.checkpointer = TenantAwarePostgresSaver()
        self.graph = self._build_graph(include_translation=True)
        self.preprocess_graph = self._build_graph(include_translation=False)

    def _build_graph(
        self, *, include_translation: bool
    ) -> CompiledStateGraph[TranslateState, None, TranslateState, TranslateState]:
        graph: StateGraph[TranslateState] = StateGraph(TranslateState)
        graph.add_node("analyze_gaps", self._node_analyze_gaps)
        if include_translation:
            graph.add_node("translate", self._node_translate)
        graph.set_entry_point("analyze_gaps")
        if include_translation:
            graph.add_edge("analyze_gaps", "translate")
            graph.add_edge("translate", END)
        else:
            graph.add_edge("analyze_gaps", END)
        return graph.compile(checkpointer=self.checkpointer)

    async def _node_analyze_gaps(self, state: TranslateState) -> TranslateState:
        if state.get("error_message"):
            return {}

        try:
            content = state.get("content", "")
            # 确定翻译方向：必须使用前端传入的 direction
            forced_direction = state.get("forced_direction")
            if not forced_direction:
                error_msg = "翻译方向未指定，请在前端选择翻译方向"
                logger.error(error_msg)
                return {
                    "direction": "dev_to_pm",
                    "system_prompt": get_system_prompt("dev_to_pm"),
                    "gaps": [],
                    "suggestions": [],
                    "error_message": error_msg,
                }
            direction = forced_direction
            logger.info("使用前端指定的翻译方向: %s", direction)
            
            # 使用 AI 分析缺失信息（根据 direction 自动选择对应的 prompt）
            result = await analyze_gaps_with_llm(content, direction, self.llm)
            gaps = result.get("gaps", [])
            suggestions = result.get("suggestions", [])
            logger.info("AI 缺失分析完成: 发现 %d 项缺失信息", len(gaps))
            system_prompt = get_system_prompt(direction)
            return {
                "gaps": gaps,
                "suggestions": suggestions,
                "direction": direction,
                "system_prompt": system_prompt,
            }
        except Exception as e:
            logger.exception("缺失分析节点失败")
            forced_direction = state.get("forced_direction")
            direction = forced_direction if forced_direction else "dev_to_pm"
            system_prompt = get_system_prompt(direction)
            return {
                "gaps": [],
                "suggestions": [],
                "direction": direction,
                "system_prompt": system_prompt,
                "error_message": f"缺失分析失败: {e!s}",
            }

    async def _node_translate(self, state: TranslateState) -> TranslateState:
        if state.get("error_message"):
            return {"translated_content": ""}

        try:
            system_prompt = state.get("system_prompt", "")
            content = state.get("content", "")
            gaps = state.get("gaps", [])
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=self._build_translate_prompt(content, state.get("context"), gaps)),
            ]
            response = await self.llm.ainvoke(messages)
            translated_content = _extract_text_content(response)
            return {"translated_content": translated_content}
        except Exception as e:
            logger.exception("翻译节点失败")
            return {
                "translated_content": "",
                "error_message": f"翻译失败: {e!s}",
            }

    async def translate(
        self,
        content: str,
        context: str | None = None,
        direction: str | None = None,
        model: str | None = None,
    ) -> TranslateResult:
        """执行翻译（同步模式）"""
        if model and model not in ("auto", "qwen-max"):
            logger.warning("暂不支持模型 %s，使用默认模型", model)

        if not direction:
            raise ValueError("翻译方向必须指定，请在前端选择翻译方向")

        thread_id = uuid.uuid4().hex
        state = await self.graph.ainvoke(
            {"content": content, "context": context, "forced_direction": direction},
            config={"configurable": {"thread_id": thread_id}},
        )
        gaps = state.get("gaps", [])
        suggestions = state.get("suggestions", [])
        final_direction = state.get("direction", direction)
        translated_content = state.get("translated_content", "")
        logger.info("翻译完成，方向: %s", final_direction)

        return TranslateResult(
            original_content=content,
            translated_content=translated_content,
            direction=final_direction,
            gaps=gaps,
            suggestions=suggestions,
        )

    async def translate_stream(
        self,
        content: str,
        context: str | None = None,
        direction: str | None = None,
        model: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """执行翻译（流式模式）"""
        if model and model not in ("auto", "qwen-max"):
            logger.warning("暂不支持模型 %s，使用默认模型", model)

        if not direction:
            yield {
                "event": "error",
                "data": {"message": "翻译方向必须指定，请在前端选择翻译方向", "stage": "preprocess"},
            }
            return

        thread_id = uuid.uuid4().hex

        # 阶段 1: 预处理（缺失分析）
        try:
            state = await self.preprocess_graph.ainvoke(
                {"content": content, "context": context, "forced_direction": direction},
                config={"configurable": {"thread_id": thread_id}},
            )
        except Exception as e:
            logger.exception("预处理阶段失败")
            yield {
                "event": "error",
                "data": {"message": f"预处理失败: {e!s}", "stage": "preprocess"},
            }
            return

        # 检查预处理是否有错误
        if error := state.get("error_message"):
            logger.warning("预处理阶段返回错误: %s", error)
            yield {
                "event": "error",
                "data": {"message": error, "stage": "preprocess"},
            }
            return

        gaps = state.get("gaps", [])
        suggestions = state.get("suggestions", [])
        if gaps:
            yield {
                "event": "gaps_identified",
                "data": {
                    "gaps": gaps,
                    "suggestions": suggestions,
                },
            }

        # 使用前端指定的 direction
        final_direction = direction
        system_prompt = get_system_prompt(final_direction)

        yield {
            "event": "translation_start",
            "data": {"direction": final_direction},
        }

        # 阶段 2: 流式翻译
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=self._build_translate_prompt(content, context, gaps)),
        ]

        try:
            content_parts: list[str] = []
            async for chunk in self.llm.astream(messages):
                delta = _extract_chunk_content(chunk)
                if delta:
                    content_parts.append(delta)
                    yield {
                        "event": "content_delta",
                        "data": {"delta": delta},
                    }
            full_content = "".join(content_parts)

            logger.info("[流式] 翻译完成，方向: %s", final_direction)
            yield {
                "event": "message_done",
                "data": {
                    "translated_content": full_content,
                    "direction": final_direction,
                    "gaps": gaps,
                    "suggestions": suggestions,
                },
            }
        except Exception as e:
            logger.exception("翻译阶段失败")
            yield {
                "event": "error",
                "data": {"message": f"翻译失败: {e!s}", "stage": "translate"},
            }

    def _build_translate_prompt(
        self,
        content: str,
        context: str | None,
        gaps: list[dict[str, Any]],
    ) -> str:
        """构建翻译提示"""
        prompt_parts = [f"请翻译以下内容：\n\n{content}"]

        if context:
            prompt_parts.append(f"\n\n补充上下文：\n{context}")

        if gaps:
            gap_descriptions = [f"- {g['description']}" for g in gaps]
            prompt_parts.append(
                "\n\n注意：输入中可能缺失以下信息，请在翻译时适当补充或标注：\n" + "\n".join(gap_descriptions)
            )

        return "".join(prompt_parts)
