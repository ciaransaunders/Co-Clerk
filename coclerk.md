## Monorepo Layout

The CoClerk codebase follows a modern monorepo layout, separating executable applications from shared library packages. Tests are co-located alongside their source files.

```
coclerk/
├── README.md
├── LICENSE                          # MIT
├── CONTRIBUTING.md
├── FEATURE_SPEC.md                  # Feature specification
├── ARCHITECTURE.md                  # Main architecture document
│
├── apps/                            # Executable applications
│   ├── api/                         # Node/Express API Gateway & services
│   ├── web-clerk/                   # Clerk Desktop React application
│   ├── web-barrister/               # Barrister Mobile-first React application
│   └── worker/                      # Background job processing
│
├── packages/                        # Shared libraries and internal dependencies
│   ├── domain/                      # Core entities, roles, auth, and risk tiers
│   ├── database/                    # PostgreSQL schema, repositories, and migrations
│   ├── ui/                          # Shared design tokens and React components
│   ├── shared/                      # Common types and utilities
│   ├── config/                      # Environment and feature-flag definitions
│   └── workflow-engine/             # Orchestration hooks and states
│
├── docs/                            # Documentation 
│   ├── adr/                         # Architecture Decision Records
│   └── architecture-phase1.md       # Implementation guide for phases
│
├── .claude/                         # Agent developer tooling
│
└── docker-compose.yml               # Local development stack
```
