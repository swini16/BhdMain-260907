#!/usr/bin/env python3
import os, re, sys

ID_RE = re.compile(r"^[A-Za-z0-9_-]{20,128}$")
URL_RE = re.compile(r"^https://chatgpt\.com/c/([A-Za-z0-9_-]{20,128})$")
GENERIC_NAMES = {
    "bhd ihp+", "unknown", "untitled", "current chat", "chatgpt",
    "none", "n/a", "na", "todo", "legacy", "default"
}
BOOTSTRAP_PR = "96"

def values(body, key):
    rx = re.compile(rf"^\s*{re.escape(key)}\s*:\s*(.*?)\s*$", re.I)
    out=[]
    for line in body.splitlines():
        m=rx.match(line)
        if m:
            out.append(m.group(1))
    return out

def validate(body, pr_number=""):
    ids=values(body,"ChatGPT-Chat-ID")
    names=values(body,"ChatGPT-Chat-Name")
    urls=values(body,"ChatGPT-Chat")

    if pr_number == BOOTSTRAP_PR and not ids and not names and not urls:
        return ["BOOTSTRAP_EXEMPT"]

    errors=[]
    if len(ids) != 1:
        errors.append("exactly one ChatGPT-Chat-ID is required")
    if len(names) != 1:
        errors.append("exactly one ChatGPT-Chat-Name is required")
    if len(urls) > 1:
        errors.append("at most one ChatGPT-Chat URL is allowed")

    chat_id=ids[0].strip() if len(ids)==1 else ""
    chat_name=names[0].strip() if len(names)==1 else ""

    if chat_id and not ID_RE.fullmatch(chat_id):
        errors.append("ChatGPT-Chat-ID must be 20-128 characters using letters, numbers, _ or -")
    if chat_name:
        if len(chat_name) < 3 or len(chat_name) > 80:
            errors.append("ChatGPT-Chat-Name must be 3-80 characters")
        if chat_name.lower() in GENERIC_NAMES:
            errors.append("ChatGPT-Chat-Name must be the actual conversation name, not a generic fallback")
        if any(ord(c) < 32 for c in chat_name):
            errors.append("ChatGPT-Chat-Name contains control characters")

    if len(urls)==1:
        m=URL_RE.fullmatch(urls[0].strip())
        if not m:
            errors.append("ChatGPT-Chat must be https://chatgpt.com/c/<same-chat-id>")
        elif chat_id and m.group(1) != chat_id:
            errors.append("ChatGPT-Chat URL and ChatGPT-Chat-ID do not match")

    return errors

def self_test():
    good="12345678-1234-1234-1234-123456789abc"
    cases=[
        ("valid", f"ChatGPT-Chat-ID: {good}\nChatGPT-Chat-Name: Robustness Review\n", True),
        ("valid+url", f"ChatGPT-Chat-ID: {good}\nChatGPT-Chat-Name: Robustness Review\nChatGPT-Chat: https://chatgpt.com/c/{good}\n", True),
        ("missing-id", "ChatGPT-Chat-Name: Robustness Review\n", False),
        ("short-id", "ChatGPT-Chat-ID: abc\nChatGPT-Chat-Name: Robustness Review\n", False),
        ("generic-name", f"ChatGPT-Chat-ID: {good}\nChatGPT-Chat-Name: BHD iHP+\n", False),
        ("duplicate-id", f"ChatGPT-Chat-ID: {good}\nChatGPT-Chat-ID: {good}\nChatGPT-Chat-Name: Robustness Review\n", False),
        ("mismatch", f"ChatGPT-Chat-ID: {good}\nChatGPT-Chat-Name: Robustness Review\nChatGPT-Chat: https://chatgpt.com/c/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n", False),
    ]
    failed=[]
    for name,body,expected in cases:
        ok = not validate(body,"999999")
        if ok != expected:
            failed.append(name)
    if failed:
        print("ChatGPT linkage self-test FAILED:", ", ".join(failed), file=sys.stderr)
        return 1
    print("ChatGPT linkage self-test PASS")
    return 0

if __name__ == "__main__":
    if "--self-test" in sys.argv:
        raise SystemExit(self_test())
    body=os.environ.get("PR_BODY","")
    pr=os.environ.get("PR_NUMBER","")
    errors=validate(body,pr)
    if errors == ["BOOTSTRAP_EXEMPT"]:
        print(f"Bootstrap PR #{pr}: one-time linkage exemption.")
        raise SystemExit(0)
    if errors:
        for e in errors:
            print(f"::error::{e}", file=sys.stderr)
        raise SystemExit(1)
    print("ChatGPT PR linkage metadata valid.")
