# Security Policy

## Supported Versions

The `main` branch is the only supported development line until the first stable release.

## Reporting a Vulnerability

Open a private security advisory on GitHub when available.

If private advisories are unavailable, contact the maintainer before publishing details:

```text
https://t.me/IShtokov
```

## Security Boundaries

Harness Agent Kit enforces runtime patterns, not full process isolation.

Current guarantees:

- typed tool validation;
- risk-class permission decisions;
- approval records;
- args-bound approval matching;
- timeout observations;
- trace events;
- file-backed state option.

Current non-guarantees:

- no hard process sandbox;
- no network sandbox;
- no built-in auth provider;
- no secret manager;
- no production trace exporter.

Do not expose broad tools such as `run_command`, `write_database`, or `send_message` without a narrow wrapper and runtime policy.
