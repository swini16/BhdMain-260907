#!/usr/bin/env python3
import json, os, re

def vals(body, key):
    rx=re.compile(rf"^\s*{re.escape(key)}\s*:\s*(.*?)\s*$", re.I)
    return [m.group(1).strip() for line in (body or "").splitlines() if (m:=rx.match(line))]

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
    "experiment adapters expanded":"Experiment adapters expanded",
    "telegram title watch":"Telegram Title Watch",
    "crm integration next steps":"CRM Integration Next Steps",
    "investigate klaviyo submission":"Investigate Klaviyo Submission",
    "seo tracking alert analysis":"SEO Tracking Alert Analysis",
    "pastel review fixed":"Pastel Review Fixed",
    "repository monitoring hardened":"Repository Monitoring Hardened",
}
BAD_LEGACY={"sports event ad watch","best hydrate pastel/navras acceptance review","ihp dashboard communications control plane","bhd ihp+","current chat","unknown"}

ROUTES=[
    (r"seo control|first[- ]class ihp workspace|google search console|\bgsc\b|backlink authority|seo opportunity|search opportunit|seo.{0,30}(authority|comparison|sglt1)|purposeful sodium|701 mg|serving and usage|dri context|backlink outreach", "SEO Tracking Alert Analysis", 98, "seo-tracking"),
    (r"core.{0,20}live.{0,30}watch|live.{0,20}core.{0,30}watch|crm opportunity|attio.{0,40}(relationship|task|opportunity)|watcher.{0,30}crm", "CRM Integration Next Steps", 97, "crm-watchers"),
    (r"klaviyo|single[- ]opt[- ]in|viewed product|signup success|metrics query", "Investigate Klaviyo Submission", 96, "klaviyo-submission"),
    (r"restore.{0,30}eco[- ]humanitarian|rich eco[- ]humanitarian|botswana.{0,40}(carousel|field|content)", "Pastel Review Fixed", 97, "pastel-review-fixed"),
    (r"\bwash\b|minimize.{0,20}wash|eco[- ]humanitarian framing|water, sanitation and hygiene", "Pastel response queue", 95, "pastel-response-queue-wash"),
    (r"visual qa|visual review|browse[- /]comment|visual comment log|review workspace", "Pastel Comment Review", 94, "visual-qa-review"),
    (r"experiment registry v2|registry v2|grin.{0,40}(adapter|measurement|creator)|earned[- ]media.{0,50}(registry|adapter|attribution)|earned-media-readonly|grin-readonly", "Experiment adapters expanded", 96, "experiment-adapters"),
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

def branch_title(head_ref):
    head=(head_ref or "").strip()
    if not head.lower().startswith("chat/"):
        return ""
    parts=head.split("/")
    if len(parts)<2:
        return ""
    slug=re.sub(r"[-_]+"," ",parts[1])
    return KNOWN.get(norm(slug),"")

def infer(body, pr_title, commit_title="", head_ref=""):
    canonical=(vals(body,"ChatGPT-Conversation-Title") or [""])[0]
    if canonical:
        return {"title":canonical,"confidence":100,"source":"canonical","rule":"canonical"}

    if (commit_title or "").strip():
        return {"title":commit_title.strip(),"confidence":100,"source":"commit-provenance","rule":"commit-provenance"}

    bt=branch_title(head_ref)
    if bt:
        return {"title":bt,"confidence":99,"source":"branch-provenance","rule":"branch-known-title"}

    legacy=[]
    for key in ("ChatGPT-Chat-Name","ChatGPT-Tab-Title","ChatGPT chat title","ChatGPT-Chat-Title"):
        legacy.extend(vals(body,key))

    for item in legacy:
        n=norm(item)
        if n in KNOWN:
            return {"title":KNOWN[n],"confidence":95,"source":"exact-known-title","rule":"known-legacy"}

    text=((pr_title or "")+"\n"+(body or "")).lower()
    for pattern,title,confidence,rule in ROUTES:
        if re.search(pattern,text,re.I|re.S):
            return {"title":title,"confidence":confidence,"source":"learned-map","rule":rule}

    for item in legacy:
        n=norm(item)
        looks_operational=bool(re.search(r"\b(task|watch|watcher|monitor)\b",n))
        if item and n not in BAD_LEGACY and not looks_operational:
            return {"title":item,"confidence":75,"source":"legacy-best-effort","rule":"legacy-best-effort"}

    return {"title":"","confidence":0,"source":"none","rule":"none"}

if __name__=="__main__":
    print(json.dumps(infer(
        os.environ.get("PR_BODY",""),
        os.environ.get("PR_TITLE",""),
        os.environ.get("PR_COMMIT_TITLE",""),
        os.environ.get("PR_HEAD_REF",""),
    ), ensure_ascii=False))
