# ADR 0009: CMS Integration Strategy (LEX, MLC, BarBooks)

## Status
Accepted

## Context
The "Authoritative Source of Truth" for chambers' matters and diaries is their Chambers Management System (CMS). The three leading providers in England and Wales are **Opus 2 LEX**, **Advanced Chambers (MLC)**, and **BarBooks**.

Our research (C1 Spike) confirms that none of these providers currently offer a public, open REST API for third-party developers. Access is typically restricted to private partner agreements or internal IT teams. To ensure CoClerk is usable from day one, we need a flexible integration strategy that accounts for this "closed" ecosystem.

## Decision
We will implement a **Multi-Tiered Adapter Strategy** for CMS integration.

### Tier 1: Direct SQL Adapter (Primary for Self-Hosted)
- Many chambers still host their CMS database (SQL Server or PostgreSQL) on-premise.
- CoClerk will provide a "Read-Only SQL Adapter" that can be configured with CMS database credentials to pull matters and diary events directly.

### Tier 2: File-Based Ingestion (CSV/Excel)
- All major CMS platforms support exporting reports (e.g., "Daily Diary," "Active Matters List").
- CoClerk will implement a robust parser for these standard report formats, allowing clerks to drag-and-drop a report to sync data.

### Tier 3: Messaging/Email Catch-all
- The system will allow manual entry or email forward ingestion for items that haven't yet reached or won't reach the CMS (e.g., informal preliminary queries).

### Tier 4: RPA / Browser Extension (Long-term)
- For cloud-only CMS installs where SQL access is blocked, a browser extension will be explored to scrape/inject data into the CMS web portal.

## Consequences
- **Security**: Direct SQL access (Tier 1) requires careful credential management and read-only user enforcement (handled via ADR 0008).
- **Maintenance**: Adapters must be maintained for each CMS's specific schema or report format.
- **Normalization**: CoClerk will use a internal `CmsAdapter` interface to ensure the rest of the application remains agnostic of the underlying provider.
