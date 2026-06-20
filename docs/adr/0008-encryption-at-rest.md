# ADR 0008: Encryption at Rest Strategy

## Status
Accepted

## Context
CoClerk is a self-hosted platform dealing with highly sensitive Legal Professional Privilege (LPP) data. Regulatory standards (BSB, GDPR) require that this data be protected from physical theft or unauthorized access to the storage media (encryption at rest).

Self-hosted environments vary from dedicated servers in chambers to cloud-hosted VMs. We need a strategy that is robust, performant, and manageable by chambers' IT staff.

## Decision
We will adopt **Filesystem-level encryption** as the primary strategy for encryption at rest.

1. **Host-Level Encryption (LUKS)**: Chambers are advised to host the CoClerk database on a Linux partition encrypted with **LUKS** (Linux Unified Key Setup). This provides Transparent Data Encryption (TDE) for the entire PostgreSQL data directory.
2. **Docker Volume Security**: When using Docker, volumes must be mapped to these encrypted partitions.
3. **Application Secrets**: System-level secrets (API keys for WhatsApp/Signal, database credentials) must be stored in an encrypted `.env` file or a dedicated secrets manager (e.g., HashiCorp Vault), never in plain text in the repository.
4. **Key Management**: Keys for the encrypted partitions must be managed by the chambers' IT department. CoClerk will not implement an application-level key management system for the database to avoid "locking" chambers out of their own raw data.

### Why not Application-Level (pgcrypto)?
- **Performance**: Column-level encryption in Postgres (`pgcrypto`) introduces significant overhead for indexing and searching.
- **Complexity**: It requires the application to manage encryption keys for every query, increasing the risk of data loss if a key is misplaced.
- **Sovereignty**: LUKS allows the chambers to maintain full control over the physical media without needing application-specific tools to recover data in an emergency.

## Consequences
- **Deployment Requirement**: Chambers must ensure their host OS supports and is configured for disk encryption.
- **Data Safety**: In the event of physical server theft, case data remains inaccessible without the LUKS passphrases.
- **Transparency**: This approach aligns with the "Data Sovereignty" principle by keeping the encryption layer on the chambers' infrastructure.
