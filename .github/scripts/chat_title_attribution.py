#!/usr/bin/env python3
import json, os, re
from pathlib import Path

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
    "investigate ise ai model":"Investigate Ise AI Model",
    "pastel response queue":"Pastel response queue",
    "pastel comment review":"Pastel Comment Review",
    "time selector graph fix":"Time Selector Graph Fix",
    "paid media control build":"Paid Media Control Build",
    "run river lp cleanup":"Run River LP Cleanup",
}
BAD_LEGACY={"sports event ad watch","best hydrate pastel/navras acceptance review","ihp dashboard communications control plane","bhd ihp+","current chat","unknown"}

# Kept explicit and dependency-free so production notification cannot fail because PyYAML is absent.
ROUTES=[
    (r"\b(bicarb|bicarbonate|sodium bicarbonate)\b|newsjack|formula.{0,20}buffer", "BHD Newsjacking Watch", 94, "bhd-newsjacking"),
    (r"\b(dianna|athletics|athlete|ambassador)\b|mega[- ]menu|personalization|personalisation|sweat testing|arrival path|supermenu.{0,30}highlight", "Review Navras Comments Phased PRs", 93, "navras-review"),
    (r"iphone.{0,30}crm|ios.{0,30}crm|\bios setup\b|control plane|communications flow|phase provenance|teams phone|entra|graph permissions", "IHP control plane flowchart", 94, "ihp-control-plane"),
    (r"nested summary hierarchy|task master hierarchy|full task master hierarchy|task hierarchy|hierarchy levels?|task rollup|rollup outline|summary hierarchy|editable hierarchy|skip unused", "Editable Task Hierarchy", 95, "editable-task-hierarchy"),
    (r"page selector|hierarchical ihp navigation|super[- ]menu|site[- ]wide navigation|task master taxonomy|column groups?|column width|sorting status", "CI1 PR 218 Sorting Status", 90, "ci1-sorting-status"),
    (r"executive decision cockpit|ceo growth|executive dashboard|executive summary|ihp home|homepage.{0,30}(duplicate|redundan)", "Metric report inconsistency", 86, "metric-report"),
    (r"3d master range|custom rolling time ranges?|custom time range|time selector.{0,30}graph", "Time Selector Graph Fix", 96, "time-selector-graph"),
    (r"metricool|\b6h\b.{0,30}(range|trend)|analytics refresh|range integrity|instrumentation rollups?|system health.{0,40}instrumentation", "iHP Analytics Refresh", 92, "ihp-analytics"),
    (r"task tags|notes chronology|project-style grouping|project style grouping|assignment toggle|assignment directory|task detail workspace|tagged notes|inline comments|collaboration notes|directed handoffs", "Write meeting reply", 92, "write-meeting-reply"),
    (r"creative intelligence|ise ai|creative feedback loop", "Investigate Ise AI Model", 90, "investigate-ise-ai"),
    (r"google ads control|sem/ppc|paid media control|cross-channel paid media|meta ads control|tiktok ads control|amazon ads control|campaigns? api", "Paid Media Control Build", 94, "paid-media-control"),
    (r"governed landing-page experiment runtime|operate landing-page experiments|ehp-lp-runtime|landing-page experiments?.{0,40}experiment intelligence", "Run River LP Cleanup", 92, "run-river-lp"),
    (r"maple leaf|worker asset|trust strip|trust-strip", "Pastel response queue", 90, "pastel-response-queue"),
    (r"trustreviews?|review overflow|reviews?.{0,20}overflow", "Pastel Comment Review", 90, "pastel-comment-review"),
]

def infer(body, pr_title):
    canonical=(vals(body,"ChatGPT-Conversation-Title") or [""])[0]
    if canonical:
        return {"title":canonical,"confidence":100,"source":"canonical","rule":"canonical"}
    text=(pr_title+"\n"+body).lower()
    for pattern,title,confidence,rule in ROUTES:
        if re.search(pattern,text,re.I|re.S):
            return {"title":title,"confidence":confidence,"source":"learned-map","rule":rule}
    legacy=[]
    for key in ("ChatGPT-Chat-Name","ChatGPT-Tab-Title","ChatGPT chat title","ChatGPT-Chat-Title"):
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
