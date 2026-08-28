#!/usr/bin/env python3
"""Compare two HAR captures (site A vs site B) for TikTok tracking identifiers.

Usage:
    python3 har_compare.py siteA.har siteB.har

Prints, per site: pixel events, anonymous_ids, csids, hashed PII fields,
TikTok cookies sent (any host), and Set-Cookie values. Then cross-compares
the two sites for shared cookie values / shared PII hashes — the signals
that would let TikTok deterministically link the two visits.
"""
import json
import re
import sys
from urllib.parse import urlparse

HASH_RE = re.compile(r"^[a-f0-9]{64}$")
TT_COOKIE_RE = re.compile(
    r"(_ttp|ttcsid|ttclid|ttoclid|_tt_enable_cookie|tt_sessionId|tt_pixel_session_index|ttwid|tt_adInfo|tt_appInfo)"
)


def load_entries(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return json.load(f)["log"]["entries"]


def is_tiktok(url):
    host = urlparse(url).netloc
    return "tiktok" in host


def summarize(entries):
    info = {
        "events": [],          # "EventName @ hh:mm:ss"
        "anonymous_ids": set(),
        "csids": set(),
        "user_fields": {},     # field -> set of hash values
        "cookies_sent": {},    # host -> name -> set of values
        "set_cookies": {},     # host -> set of "name=value"
    }
    for e in entries:
        url = e["request"]["url"]
        host = urlparse(url).netloc

        # TikTok cookies sent on ANY host (covers first-party _ttp on the site itself)
        for c in e["request"].get("cookies", []):
            if TT_COOKIE_RE.search(c["name"]):
                info["cookies_sent"].setdefault(host, {}).setdefault(c["name"], set()).add(c["value"])
        for h in e["response"].get("headers", []):
            if h["name"].lower() == "set-cookie" and TT_COOKIE_RE.search(h["value"]):
                info["set_cookies"].setdefault(host, set()).add(h["value"].split(";")[0])

        if not is_tiktok(url):
            continue
        pd = e["request"].get("postData", {})
        if not pd.get("text"):
            continue
        try:
            body = json.loads(pd["text"])
        except ValueError:
            continue
        ctx = body.get("context", {})
        user = ctx.get("user", {})
        if user.get("anonymous_id"):
            info["anonymous_ids"].add(user["anonymous_id"])
        for field, value in user.items():
            if isinstance(value, str) and HASH_RE.match(value):
                info["user_fields"].setdefault(field, set()).add(value)
        # csid may live at top level or inside context.sessions[]
        if body.get("csid"):
            info["csids"].add(body["csid"])
        for s in ctx.get("sessions", []):
            if s.get("csid"):
                info["csids"].add(s["csid"])
        name = body.get("event") or urlparse(url).path.split("/")[-1]
        info["events"].append(f"{name} @ {e['startedDateTime'][11:19]}")
    return info


def print_site(label, s):
    print(f"\n########## {label} ##########")
    print(f"  events ({len(s['events'])}): {', '.join(s['events'])}")
    for aid in s["anonymous_ids"]:
        print(f"  anonymous_id: {aid}")
    for csid in sorted(s["csids"]):
        print(f"  csid: {csid[:48]}...")
    if s["user_fields"]:
        print("  hashed PII sent:")
        for field, values in sorted(s["user_fields"].items()):
            for v in sorted(values):
                print(f"    {field} = {v}")
    else:
        print("  hashed PII sent: (none)")
    if s["cookies_sent"]:
        print("  TikTok cookies sent:")
        for host, names in sorted(s["cookies_sent"].items()):
            for name, values in sorted(names.items()):
                for v in sorted(values):
                    print(f"    {host}: {name} = {v[:60]}")
    else:
        print("  TikTok cookies sent: (none)")
    if s["set_cookies"]:
        print("  Set-Cookie seen:")
        for host, vals in sorted(s["set_cookies"].items()):
            for v in sorted(vals):
                print(f"    {host}: {v[:80]}")
    else:
        print("  Set-Cookie seen: (none)")


def cross_compare(a, b):
    print("\n########## CROSS-SITE COMPARISON ##########")

    shared_anon = a["anonymous_ids"] & b["anonymous_ids"]
    print(f"  shared anonymous_id: {'YES -> ' + str(shared_anon) if shared_anon else 'no (different per site)'}")

    shared_cookies = {}
    for host_a, names_a in a["cookies_sent"].items():
        for host_b, names_b in b["cookies_sent"].items():
            for name, values_a in names_a.items():
                inter = values_a & names_b.get(name, set())
                if inter:
                    shared_cookies.setdefault(name, set()).update(inter)
    if shared_cookies:
        for name, values in shared_cookies.items():
            for v in values:
                print(f"  SHARED COOKIE: {name} = {v[:60]}  <- deterministic browser link")
    else:
        print("  shared TikTok cookies: none")

    # Compare hash VALUES regardless of field name (site A may send "email"
    # while site B sends "auto_email"/"eb_email" — TikTok matches on value).
    fields_a = set(a["user_fields"])
    fields_b = set(b["user_fields"])
    values_a = {v for vals in a["user_fields"].values() for v in vals}
    values_b = {v for vals in b["user_fields"].values() for v in vals}
    overlap = False
    for v in sorted(values_a & values_b):
        overlap = True
        fa = sorted(f for f, vals in a["user_fields"].items() if v in vals)
        fb = sorted(f for f, vals in b["user_fields"].items() if v in vals)
        print(f"  SHARED PII HASH: {v[:20]}... (A: {fa}, B: {fb})  <- deterministic person link")
    if not overlap:
        print(f"  shared PII hashes: none (A sent {sorted(fields_a)}, B sent {sorted(fields_b)})")

    if not shared_anon and not shared_cookies and not overlap:
        print("  => NO deterministic identifier shared between the two sites in these captures.")


def main():
    if len(sys.argv) != 3:
        sys.exit(f"usage: python3 {sys.argv[0]} siteA.har siteB.har")
    a = summarize(load_entries(sys.argv[1]))
    b = summarize(load_entries(sys.argv[2]))
    print_site(sys.argv[1], a)
    print_site(sys.argv[2], b)
    cross_compare(a, b)


if __name__ == "__main__":
    main()
