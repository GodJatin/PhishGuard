# PhishGuard Intelligence Pipeline

This document describes each stage of the PhishGuard multi-layer threat intelligence pipeline. Every URL submitted for analysis passes through this deterministic sequence. Stages are not skipped — even if a URL is classified early, all layers log their findings for audit completeness.

---

## Pipeline Flowchart

```
Input URL
    │
    ▼
┌─────────────────────────────────────┐
│           WHITELIST CHECK           │
│  Is the domain a known-safe entity? │
│  (Google, Microsoft, GitHub, etc.)  │
└─────────────────────────────────────┘
    │ Safe → RETURN SAFE (bypass all further checks)
    │ Unknown ↓
    ▼
┌─────────────────────────────────────┐
│           BLACKLIST CHECK           │
│  Is the domain on a known-malicious │
│       blocklist registry?           │
└─────────────────────────────────────┘
    │ Match → ESCALATE to CRITICAL
    │ No match ↓
    ▼
┌─────────────────────────────────────┐
│      THREAT INTELLIGENCE FEEDS      │
│  Cross-reference against:           │
│  • OpenPhish  (phishing URLs)       │
│  • PhishTank  (community blocklist) │
│  • URLHaus    (malware URLs)        │
│  Feed data cached in Supabase.      │
└─────────────────────────────────────┘
    │ Match → score += HIGH penalty + flag matched sources
    │ No match ↓
    ▼
┌─────────────────────────────────────┐
│        BRAND SPOOF DETECTION        │
│  Levenshtein-distance similarity    │
│  analysis against protected         │
│  trademark registry (PayPal, Chase, │
│  Apple, Amazon, etc.)               │
│  Detects: typosquatting, homoglyph  │
│  attacks, subdomain impersonation.  │
└─────────────────────────────────────┘
    │ Detected → flag brand_spoof + suspected_brand
    │ Clear ↓
    ▼
┌─────────────────────────────────────┐
│      DOMAIN INTELLIGENCE (RDAP)     │
│  Retrieve domain registration data  │
│  via RDAP API (WHOIS fallback).     │
│  Evaluate:                          │
│  • Registrar                        │
│  • Registration date                │
│  • Domain age (days)                │
│  • Risk signal (new <30d = HIGH)    │
└─────────────────────────────────────┘
    │ Age < 30 days → score escalation
    │ Lookup failed → flag uncertainty
    ↓
┌─────────────────────────────────────┐
│           RULE ENGINE               │
│  Evaluate 15+ heuristic features:   │
│  • URL length                       │
│  • Suspicious TLD (.xyz, .tk, etc.) │
│  • IP address in hostname           │
│  • Entropy score                    │
│  • Redirect pattern detection       │
│  • Suspicious keyword presence      │
│  • Subdomain depth                  │
│  • Query parameter count            │
│  Each rule contributes a weighted   │
│  score to the composite threat score│
└─────────────────────────────────────┘
    │ Scores aggregated → Rule Score (0–100)
    ↓
┌─────────────────────────────────────┐
│             ML ENGINE               │
│  RandomForest classifier trained on │
│  10,000+ labeled phishing/legit URL │
│  samples. Feature vector extracted  │
│  from URL lexical + DNS properties. │
│  Outputs: phishing probability 0–1  │
└─────────────────────────────────────┘
    │ Probability → ML Score (0–100)
    ↓
┌─────────────────────────────────────┐
│         CONSENSUS ANALYSIS          │
│  Reconcile Rule Score vs ML Score.  │
│  Cases:                             │
│  • Both High → "Unanimous" HIGH     │
│  • Both Low  → "Unanimous" SAFE     │
│  • Divergent → "Divided" consensus  │
│    → Decision Engine arbitrates     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│          DECISION ENGINE            │
│  Applies escalation rules:          │
│  • Brand spoof detected?            │
│    → Minimum verdict: HIGH RISK     │
│  • Threat feed match?               │
│    → Minimum verdict: DANGEROUS     │
│  • Divided consensus?               │
│    → Uses Rule Engine as tie-breaker│
│  Generates:                         │
│  • Final Verdict                    │
│  • Confidence level                 │
│  • Escalation trigger label         │
│  • Root cause annotation            │
│  • Immutable decision_snapshot      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           FINAL VERDICT             │
│  SAFE / SUSPICIOUS / HIGH RISK /    │
│  DANGEROUS / CRITICAL               │
│  Persisted to scan_metadata.        │
│  Analyst report generated.          │
└─────────────────────────────────────┘
```

---

## Stage Reference

| Stage | Engine | Output |
|---|---|---|
| Whitelist | `whitelist.py` | Bypass or continue |
| Blacklist | `blacklist.py` | CRITICAL flag or continue |
| Threat Feeds | `threat_feeds.py` | `matched_sources[]`, feed confidence |
| Brand Spoof | `brand_spoof.py` | `brand_spoof_detected`, `suspected_brand` |
| Domain Intelligence | `domain_age.py` | `registrar`, `domain_age_days`, `risk_signal` |
| Rule Engine | `classifier.py` | `rule_score`, `scoring_breakdown[]` |
| ML Engine | `classifier.py` | `ml_score`, `ml_confidence`, `feature_importances[]` |
| Consensus | `classifier.py` | `consensus_level` |
| Decision Engine | `decision_engine.py` | `final_verdict`, `decision_snapshot` |

---

## Immutability Guarantee

Once a scan completes, the `decision_snapshot` and `evidence_snapshot` are written to `scan_metadata` in the database. Historical report exports **always** read from this immutable snapshot — ensuring forensic integrity regardless of future changes to detection logic, model weights, or escalation rules.
