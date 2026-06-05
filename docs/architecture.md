# PhishGuard Architecture

This document provides a comprehensive technical overview of the PhishGuard platform architecture.

---

## Frontend Architecture

**Technology:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, TanStack Query, Recharts, Shadcn UI

**Structure:**
```
frontend/
├── app/                    # Next.js App Router pages & layouts
│   ├── (auth)/             # Authentication pages (login, register)
│   ├── dashboard/          # Main scan dashboard
│   ├── history/            # Scan history browser
│   ├── analytics/          # Operational analytics dashboard
│   └── report/[id]/        # Dynamic report viewer
├── components/
│   ├── shared/             # Cross-feature reusable components
│   │   ├── loaders/        # Splash screen, skeleton loaders
│   │   └── logo/           # Brand logo component
│   └── ui/                 # Primitive UI components (banners, modals)
├── stores/                 # Zustand global state (auth, scan state)
├── lib/
│   ├── api/                # Axios instance with retry interceptor
│   └── supabase/           # Supabase client initialization
└── types/                  # TypeScript interfaces (ScanResult, DBScan, etc.)
```

**Key Patterns:**
- **State Management:** Zustand stores for global auth/session state; TanStack Query for server state and cache management.
- **Progressive Web App (PWA):** Service worker registration, offline detection banner, and `beforeinstallprompt` capture for native installation.
- **Authentication:** Supabase Auth with Row-Level Security. Guest mode via `localStorage` with seamless upgrade to authenticated session.
- **Scan History:** Dual-mode history — authenticated users read from Supabase, guest users read from `localStorage`.

---

## Backend Architecture

**Technology:** FastAPI, Python 3.11, Uvicorn, scikit-learn, ReportLab, Pydantic, Supabase Python SDK

**Structure:**
```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── routes/     # FastAPI route handlers (scan.py, history.py, export.py)
│   ├── services/
│   │   ├── intelligence_engine/  # All detection & analysis engines
│   │   │   ├── whitelist.py      # Known-safe domain registry
│   │   │   ├── blacklist.py      # Known-malicious domain registry
│   │   │   ├── classifier.py     # Rule Engine + ML Engine orchestration
│   │   │   ├── brand_spoof.py    # Trademark similarity analysis
│   │   │   ├── domain_age.py     # RDAP/WHOIS domain intelligence
│   │   │   ├── threat_feeds.py   # OpenPhish/PhishTank/URLHaus integration
│   │   │   └── decision_engine.py # Final verdict escalation logic
│   │   └── report_engine/
│   │       ├── pdf_exporter.py   # ReportLab PDF generation
│   │       ├── txt_exporter.py   # Plain-text report generation
│   │       └── json_exporter.py  # Machine-readable JSON export
│   └── main.py                   # FastAPI application entrypoint
├── ml_models/                    # Trained RandomForest model artifacts
├── datasets/
│   └── training/                 # ML model training script
├── requirements.txt
└── run.py                        # Dev server launcher
```

---

## Database Architecture

**Technology:** Supabase (PostgreSQL), Row-Level Security (RLS)

**Primary Table — `scans`:**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → Supabase Auth users |
| `url` | TEXT | Scanned URL |
| `scan_type` | TEXT | `'rule-based'`, `'ml'`, `'comparison'` |
| `status` | TEXT | `SAFE`, `SUSPICIOUS`, `HIGH RISK`, `DANGEROUS` |
| `score` | INTEGER | Composite threat score (0–100) |
| `reasons` | JSONB | Array of triggered detection reasons |
| `technical_details` | JSONB | Full intelligence engine output |
| `recommendation` | TEXT | Analyst-grade user recommendation |
| `scan_source` | TEXT | `'manual'` or `'qr'` |
| `scan_metadata` | JSONB | Decision snapshot, evidence snapshot, threat feeds |
| `created_at` | TIMESTAMPTZ | Scan timestamp |

**Security Model:**
- RLS policies ensure users can only read their own scan records.
- Service role key (server-side only) is used for admin write operations.
- Supabase Auth handles JWT issuance and session management.

---

## Threat Intelligence Architecture

PhishGuard employs a layered, independent intelligence architecture. Each layer operates independently and feeds findings into the consensus engine.

### Intelligence Layers

1. **Whitelist Intelligence** — Bypass engine. Known-safe domains (Google, Microsoft, GitHub) are immediately classified as SAFE without further processing.
2. **Blacklist Intelligence** — Instant block engine. Known-malicious domains are classified as CRITICAL immediately.
3. **Brand Spoof Detection** — Levenshtein-distance similarity analysis against a registry of protected trademarks. Detects typosquatting, homoglyph attacks, and subdomain spoofing.
4. **Domain Age Intelligence** — RDAP-first, WHOIS-fallback lookup to determine domain registration age. Newly registered domains (&lt;30 days) receive automatic risk escalation.
5. **Threat Intelligence Feeds** — Cross-references against OpenPhish, PhishTank, and URLHaus feeds cached in Supabase for fast local lookups.
6. **Rule Engine** — Heuristic scoring engine evaluating 15+ URL and domain features including suspicious TLDs, IP presence, entropy score, keyword detection, redirect patterns.
7. **ML Engine** — RandomForest classifier trained on 10,000+ labeled phishing/legitimate URL samples from the UCI ML Repository dataset.
8. **Decision Engine** — Final arbitration engine. Applies escalation rules, resolves ML/Rule Engine consensus conflicts, generates confidence scores, root cause annotations, and immutable decision snapshots.

---

## Detection Pipeline

See [intelligence-pipeline.md](./intelligence-pipeline.md) for the full annotated pipeline flowchart.

---

## Reporting Pipeline

```
Scan Complete
     ↓
scan_metadata persisted (decision_snapshot + evidence_snapshot)
     ↓
Report Request Received
     ↓
    ┌──────────────────┐
    │                  │
   PDF              TXT/JSON
    │                  │
pdf_exporter.py   txt_exporter.py
    │                  │
    └──────────────────┘
     ↓
11-Section Analyst Dossier:
  1. Executive Summary
  2. Severity Banner
  3. Decision Snapshot
  4. Supporting Evidence
  5. Threat Intelligence Analysis
  6. Domain Intelligence Analysis
  7. Brand Spoof Analysis
  8. Investigation Timeline
  9. Technical Notes
 10. Recommendations
 11. Executive Conclusion
 12. Evidence Snapshot
```

Every report section reads exclusively from `scan_metadata` — the immutable stored snapshot — ensuring historical reports are forensically stable and immune to future model or rule changes.
