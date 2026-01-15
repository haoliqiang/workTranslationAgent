"""ReAct 格式解析器"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass
class ReActStep:
    """ReAct 格式的单个步骤"""

    thought: str = ""
    action: str | None = None
    action_input: str | None = None
    observation: str | None = None
    final_answer: str | None = None


class ReActParser:
    """解析 ReAct 格式的响应"""

    # 匹配 ReAct 格式的正则表达式
    THOUGHT_PATTERN = re.compile(r"Thought:\s*(.+?)(?=Action:|Final\s+Answer:|$)", re.DOTALL | re.IGNORECASE)
    ACTION_PATTERN = re.compile(r"Action:\s*(.+?)(?=Action\s+Input:|$)", re.DOTALL | re.IGNORECASE)
    ACTION_INPUT_PATTERN = re.compile(r"Action\s+Input:\s*(.+?)(?=Observation:|$)", re.DOTALL | re.IGNORECASE)
    OBSERVATION_PATTERN = re.compile(r"Observation:\s*(.+?)(?=Thought:|Action:|Final\s+Answer:|$)", re.DOTALL | re.IGNORECASE)
    FINAL_ANSWER_PATTERN = re.compile(r"Final\s+Answer:\s*(.+?)$", re.DOTALL | re.IGNORECASE)

    @classmethod
    def parse(cls, text: str) -> list[ReActStep]:
        """解析完整的 ReAct 格式文本，返回步骤列表"""
        steps: list[ReActStep] = []
        current_step = ReActStep()

        # 提取所有匹配的部分
        text_clean = text.strip()

        # 先查找 Final Answer
        final_answer_match = cls.FINAL_ANSWER_PATTERN.search(text_clean)
        if final_answer_match:
            final_answer = final_answer_match.group(1).strip()
            current_step.final_answer = final_answer

        # 查找所有 Thought
        thought_matches = list(cls.THOUGHT_PATTERN.finditer(text_clean))
        action_matches = list(cls.ACTION_PATTERN.finditer(text_clean))
        action_input_matches = list(cls.ACTION_INPUT_PATTERN.finditer(text_clean))
        observation_matches = list(cls.OBSERVATION_PATTERN.finditer(text_clean))

        # 按位置排序所有匹配项
        all_positions: list[tuple[int, str, str]] = []
        for m in thought_matches:
            all_positions.append((m.start(), "thought", m.group(1).strip()))
        for m in action_matches:
            all_positions.append((m.start(), "action", m.group(1).strip()))
        for m in action_input_matches:
            all_positions.append((m.start(), "action_input", m.group(1).strip()))
        for m in observation_matches:
            all_positions.append((m.start(), "observation", m.group(1).strip()))

        all_positions.sort(key=lambda x: x[0])

        # 构建步骤
        for pos, kind, content in all_positions:
            if kind == "thought":
                # 新的思考，可能开始新步骤
                if current_step.thought or current_step.action:
                    steps.append(current_step)
                    current_step = ReActStep()
                current_step.thought = content
            elif kind == "action":
                current_step.action = content
            elif kind == "action_input":
                current_step.action_input = content
            elif kind == "observation":
                current_step.observation = content
                # 观察后通常开始新步骤
                if current_step.thought or current_step.action:
                    steps.append(current_step)
                    current_step = ReActStep()

        # 添加最后一步
        if current_step.thought or current_step.action or current_step.final_answer:
            steps.append(current_step)

        # 如果没有解析到任何步骤，尝试将整个文本作为最终答案
        if not steps and not current_step.final_answer:
            current_step.final_answer = text_clean
            steps.append(current_step)

        return steps

    @classmethod
    def parse_streaming(cls, accumulated_text: str) -> tuple[ReActStep | None, str]:
        """解析流式文本，返回当前完成的步骤和剩余文本
        
        Returns:
            (completed_step, remaining_text)
        """
        steps = cls.parse(accumulated_text)
        
        if not steps:
            return None, accumulated_text
        
        # 找到最后一个完整的步骤
        last_complete_step = None
        for step in steps:
            # 完整的步骤应该有 thought + action + observation，或者有 final_answer
            if step.final_answer:
                last_complete_step = step
                # 找到 final answer 的位置
                final_match = cls.FINAL_ANSWER_PATTERN.search(accumulated_text)
                if final_match:
                    end_pos = final_match.end()
                    remaining = accumulated_text[end_pos:].strip()
                    return step, remaining
            elif step.thought and step.action and step.observation:
                last_complete_step = step
                # 找到这个步骤结束的位置
                step_text = f"Thought: {step.thought}"
                if step.action:
                    step_text += f"\nAction: {step.action}"
                if step.action_input:
                    step_text += f"\nAction Input: {step.action_input}"
                if step.observation:
                    step_text += f"\nObservation: {step.observation}"
                # 简单处理：查找最后一个 observation 的位置
                obs_match = cls.OBSERVATION_PATTERN.finditer(accumulated_text)
                obs_matches = list(obs_match)
                if obs_matches:
                    last_obs = obs_matches[-1]
                    end_pos = last_obs.end()
                    remaining = accumulated_text[end_pos:].strip()
                    return step, remaining
        
        return None, accumulated_text

    @classmethod
    def extract_final_answer(cls, text: str) -> str | None:
        """从文本中提取最终答案"""
        match = cls.FINAL_ANSWER_PATTERN.search(text)
        if match:
            return match.group(1).strip()
        
        # 如果没有明确的 Final Answer，返回最后一步的 observation 或 thought
        steps = cls.parse(text)
        if steps and steps[-1].final_answer:
            return steps[-1].final_answer
        if steps and steps[-1].observation:
            return steps[-1].observation
        if steps and steps[-1].thought:
            return steps[-1].thought
        
        return None
