#!/usr/bin/env python3
import json, os, re

def vals(body, key):
    rx=re.compile(rf"^\s*{re.escape(key)}\s*:\s*(.*?)\s*$", re.I)
    return [m.group(1).strip() for line in body.splitlines() if (m:=rx.match(line))]

def norm(s):
    return re.sub(r"\s+"," ",(s or "")).strip().lower().replace("#","")

KNOWN={
    "editable task hierarchy":"Editable Task Hierarchy",
    "ci1 pr 218 sorting status":"CI1 PR 218 Sorting Status",
    "ihp control plane flowchart":"IHP control plane flowchart",
    "metric report inconsistency":"Metric report inconsistency",
    "ihp analytics refresh":"iHP Analytics Refresh",
    "write meeting reply":"Write meeting reply",
    "review navras comments phased prs":"Review Navras Comments Phased PRs",
    "bhd newsjacking watch":"BHD Newsjacking Watch",
    "attio ios app availability":"Attio iOS App Availability",
    "time selector graph fix":"Time Selector Graph Fix",
    "best hydrate global qa":"Best Hydrate Global QA",
}

BAD_LEGACY={
    "sports event ad watch",
    "best hydrate pastel/navras acceptance review",
    "ihp dashboard communications control plane",
    "bhd ihp+",
    "current chat",
    "unknown",
}

ROUTES=[
    (r"\b(bicarb|bicarbonate|sodium bicarbonate)\b|reddit.{0,30}bicarb", "BHD Newsjacking Watch", 92, "bicarb"),
    (r"\b(dianna|athletics|athlete|ambassador)\b|mega menu|personalization|personalisation|sweat testing", "Review Navras Comments Phased PRs", 92, "storefront-navras-review"),
    (r"iphone.{0,30}crm|\bios setup\b|control plane|communications flow|phase provenance|teams phone mobile|entra|graph permissions", "IHP control plane flowchart", 93, "ios-crm-control-plane"),
    (r"nested summary hierarchy|editable task master hierarchy|task rollup|rollup outline|summary hierarchy|editable hierarchy", "Editable Task Hierarchy", 94, "task-hierarchy"),
    (r"page selector|hierarchical ihp navigation|super menu|site[- ]wide navigation", "CI1 PR 218 Sorting Status", 88, "ihp-navigation"),
    (r"task master taxonomy|column groups?|column width|sorting status|primary.*strategy.*governance", "CI1 PR 218 Sorting Status", 88, "task-master-columns"),
    (r"executive decision cockpit|ceo growth|executive dashboard|executive summary|ihp home|homepage.{0,30}(duplicate|redundan)", "Metric report inconsistency", 82, "executive-home"),
    (r"metricool|\b6h\b.{0,30}(range|trend)|analytics refresh|time selector|range integrity", "iHP Analytics Refresh", 86, "analytics"),
    (r"task tags|notes chronology|project-style grouping|project style grouping|assignment toggle|assignment directory", "Write meeting reply", 82, "task-collaboration"),
]

def infer(body, pr_title):
    canonical=(vals(body,"ChatGPT-Conversation-Title") or [""])[0]
    conf_raw=(vals(body,"ChatGPT-Conversation-Title-Confidence") or [""])[0]
    source=(vals(body,"ChatGPT-Conversation-Title-Source") or [""])[0].lower()
    verified=(vals(body,"ChatGPT-Conversation-Title-Verified") or [""])[0].lower()

    if canonical:
        try:
            confidence=int(conf_raw) if conf_raw else (100 if verified=="exact" else 85)
        except ValueError:
            confidence=85
        confidence=max(0,min(100,confidence))
        if confidence>=75:
            return {"title":canonical,"confidence":confidence,"source":source or "canonical","rule":"canonical"}

    text=(pr_title+"\n"+body).lower()
    for pattern,title,confidence,rule in ROUTES:
        if re.search(pattern,text,re.I|re.S):
            return {"title":title,"confidence":confidence,"source":"context-inferred","rule":rule}

    legacy=[]
    for key in ("ChatGPT-Chat-Name","ChatGPT-Tab-Title","ChatGPT chat title"):
        legacy.extend(vals(body,key))
    for item in legacy:
        n=norm(item)
        if n in KNOWN:
            return {"title":KNOWN[n],"confidence":90,"source":"legacy-mapped","rule":"known-legacy"}
    for item in legacy:
        n=norm(item)
        if item and n not in BAD_LEGACY:
            return {"title":item,"confidence":75,"source":"legacy-mapped","rule":"legacy-best-effort"}

    return {"title":"","confidence":0,"source":"none","rule":"none"}

if __name__=="__main__":
    print(json.dumps(infer(os.environ.get("PR_BODY",""), os.environ.get("PR_TITLE","")), ensure_ascii=False))
