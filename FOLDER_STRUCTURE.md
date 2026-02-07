```
carrier-integration-service/
├── src/
│   ├── domain/
│   │   ├── types.ts
│   │   ├── errors.ts
│   │   └── validation.ts
│
│   ├── carriers/
│   │   ├── carrier.interface.ts
│   │   └── ups/
│   │       ├── ups.service.ts
│   │       ├── ups.auth.ts
│   │       ├── ups.client.ts
│   │       ├── ups.mapper.ts
│   │       └── ups.types.ts
│
│   ├── config/
│   │   └── env.ts
│
│   ├── http/
│   │   └── http.client.ts
│
│   └── index.ts
│
├── tests/
│   ├── integration/
│   │   ├── ups.rate.test.ts
│   │   ├── ups.auth.test.ts
│   │   └── ups.errors.test.ts
│   └── fixtures/
│       └── ups/
│           ├── rate-success.json
│           ├── rate-error.json
│           └── auth-token.json
│
├── .env.example
├── README.md
├── package.json
└── tsconfig.json
```
