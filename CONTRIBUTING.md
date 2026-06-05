# Contributing to PhishGuard

First off, thank you for considering contributing to PhishGuard. It's people like you that make open-source a great community!

## Development Process

1.  **Fork** the repo on GitHub.
2.  **Clone** the project to your own machine.
3.  **Create a branch** for your feature or bug fix.
4.  **Commit** changes to your own branch.
5.  **Push** your work back up to your fork.
6.  Submit a **Pull Request** so that we can review your changes.

## Local Setup Instructions

Please refer to the `Installation & Setup` section in our [README.md](README.md) for detailed steps to get the frontend and backend running locally.

## Engineering Guidelines

- **Code Style**: Ensure your code passes all linting (`npm run lint` or `eslint`) and type checking (`npx tsc --noEmit`).
- **Dependencies**: Do not add dependencies without a clear use case. Avoid bloating the `package.json` or `requirements.txt`.
- **Commit Messages**: Write clear, concise commit messages outlining the "what" and "why" of the change.

## Branch Naming Conventions

Please use the following conventions when naming branches:
- `feature/<feature-name>` for new features
- `bugfix/<bug-name>` for bug fixes
- `docs/<doc-update>` for documentation updates

## Pull Request Guidelines

- Ensure your PR has a descriptive title and a comprehensive description.
- Reference any related issues in the PR description (e.g., "Fixes #123").
- PRs must pass all CI checks (linting, build) before being merged.
- At least one approval from a maintainer is required.

Thank you for your interest in improving PhishGuard!
