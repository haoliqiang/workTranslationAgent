#!/bin/bash
# 启动脚本：设置 PYTHONPATH 并运行 uvicorn

cd "$(dirname "$0")"
export PYTHONPATH="${PWD}/src:${PYTHONPATH}"
exec python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 --app-dir ./
