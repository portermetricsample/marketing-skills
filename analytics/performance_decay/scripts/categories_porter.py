"""
OPTIONAL site-specific category rules for portermetrics.com.

This is an EXAMPLE of how to group pages for one site. The engine works without
it (generic path-based grouping). To use it, in analyze.py set:
    from categories_porter import RULES as CATEGORY_RULES

Format: list of (label, [substrings]) — first match wins, else "Other".
"""
RULES = [
    ("Help center",              ["help.portermetrics.com"]),
    ("App",                      ["app.portermetrics.com", "cloud.portermetrics.com"]),
    ("Report templates",         ["report-templates/"]),
    ("Dashboard templates",      ["dashboard-templates/"]),
    ("Templates (LS/Sheets)",    ["/templates/", "/plantillas/", "/modelos/"]),
    ("Solutions",                ["/solutions/", "/reporting-tool/", "/dashboard-software/"]),
    ("Tutorials",                ["/tutorial/"]),
    ("Articles / KPIs",          ["/articles/"]),
    ("Compare / Alternatives",   ["/compare/"]),
    ("Connectors",               ["/connectors/", "/conectores/"]),
    ("Free tools / Calculators", ["/calculators/", "/free-tools/"]),
    ("Examples",                 ["/examples/", "/ejemplos/", "/exemplos/"]),
    ("Blog",                     ["/blog/", "/blogue/"]),
    ("Pricing / Partners",       ["/pricing/", "-pricing/", "/partners/", "/affiliate/"]),
    ("Home",                     ["/home", "home-"]),
]


# --- Hierarchy extensions for segment.py (Level 1 = language, Level 3 = topic) ---
# Level 1 — language (first match wins, else default "EN").
LANG_RULES = [
    ("EN", ["/en/", "/us/"]),
    ("PT", ["/pt/", "/blogue/", "/modelos/", "/exemplos/", "/ferramentas", "/conectores/"]),
    ("ES", ["/es/", "/plantillas/", "/ejemplos/", "/recursos/", "/curso/", "/compare-es"]),
]
LANG_DEFAULT = "EN"

# Level 3 — topic / platform (first match wins, else "General"). Order: specific first.
TOPIC_RULES = [
    ("Google Ads",      ["google-ads", "pmax"]),
    ("Meta / FB Ads",   ["meta-ads", "facebook-ads", "facebook-insights"]),
    ("Instagram",       ["instagram"]),
    ("TikTok",          ["tiktok"]),
    ("LinkedIn",        ["linkedin"]),
    ("YouTube",         ["youtube"]),
    ("Shopify",         ["shopify"]),
    ("Google Analytics",["google-analytics", "ga4", "analytics-4"]),
    ("Search Console",  ["search-console", "gsc"]),
    ("Looker Studio",   ["looker-studio", "data-studio"]),
    ("Google Sheets",   ["google-sheets"]),
    ("Social media",    ["social-media", "redes-sociales", "redes-sociais"]),
    ("SEO / Local",     ["/seo", "local-seo", "-seo"]),
    ("Amazon",          ["amazon"]),
    ("Email / CRM",     ["hubspot", "mailchimp", "activecampaign"]),
]
TOPIC_DEFAULT = "General"
