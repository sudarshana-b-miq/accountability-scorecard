# Databricks notebook source
import json

import requests


def widget(name: str, default: str = "") -> str:
    dbutils.widgets.text(name, default)
    return dbutils.widgets.get(name).strip()


channel = widget("channel")
messages_json = widget("messages", "[]")
secret_scope = widget("slack_secret_scope", "flexible_job")
secret_key = widget("slack_secret_key", "slack_bot_token")

if not channel:
    raise ValueError("channel is required")

messages = json.loads(messages_json)
if not isinstance(messages, list) or not messages:
    raise ValueError("messages must be a non-empty JSON array")

token = dbutils.secrets.get(scope=secret_scope, key=secret_key)
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

sent = []
for message in messages:
    payload = {
        "channel": channel,
        "text": str(message.get("text") or "Accountability scorecard alert"),
    }
    blocks = message.get("blocks")
    if blocks:
        payload["blocks"] = blocks

    response = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers=headers,
        json=payload,
        timeout=15,
    )
    response.raise_for_status()
    body = response.json()
    if not body.get("ok"):
        raise RuntimeError(f"Slack chat.postMessage failed: {body.get('error', 'unknown_error')}")
    sent.append({"channel": body.get("channel"), "ts": body.get("ts")})

dbutils.notebook.exit(json.dumps({"sent": len(sent), "messages": sent}))
