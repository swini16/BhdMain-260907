#!/usr/bin/env python3
import importlib.util, pathlib
p=pathlib.Path(__file__).with_name("chat_title_attribution.py")
spec=importlib.util.spec_from_file_location("cta",p); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

cases=[
 ("canonical wins", dict(body="ChatGPT-Conversation-Title: Telegram Title Watch\nmega-menu SEO", pr_title="x"), "Telegram Title Watch","canonical"),
 ("commit wins", dict(body="mega-menu SEO", pr_title="x", commit_title="Telegram Title Watch"), "Telegram Title Watch","commit-provenance"),
 ("branch exact wins", dict(body="", pr_title="x", head_ref="chat/telegram-title-watch/foo"), "Telegram Title Watch","branch-known-title"),
 ("known legacy beats route", dict(body="ChatGPT-Chat-Title: Pastel Comment Review\nmega-menu", pr_title="x"), "Pastel Comment Review","known-legacy"),
 ("seo beats mega menu collision", dict(body="Moves SEO into dedicated iHP SEO Control workspace with Google Search Console, backlink authority, mega-menu entry", pr_title="feat: make SEO a first-class iHP workspace"), "SEO Tracking Alert Analysis","seo-tracking"),
 ("klaviyo", dict(body="Fix Klaviyo single-opt-in signup success", pr_title="x"), "Investigate Klaviyo Submission","klaviyo-submission"),
 ("crm watchers", dict(body="Integrate Core + Live watchers with CRM and Attio opportunity mapping", pr_title="x"), "CRM Integration Next Steps","crm-watchers"),
 ("bad task legacy rejected", dict(body="ChatGPT-Chat-Title: Random Task Watch", pr_title="unrelated"), "","none"),
 ("unknown remains unknown", dict(body="", pr_title="opaque maintenance"), "","none"),
]
for name,kw,title,rule in cases:
    got=m.infer(**kw)
    assert got["title"]==title, (name,got,title)
    assert got["rule"]==rule, (name,got,rule)
print(f"ok {len(cases)} attribution cases")
