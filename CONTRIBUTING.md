# Contributing to VoiceTrace

We love your input! We want to make contributing to VoiceTrace as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with GitHub

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use GitHub Flow

All code changes happen through pull requests:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes (`pytest` for backend, `npm run build` for frontend)
4. Make sure your code lints (Python: `black`, TypeScript: `eslint`)
5. Issue that pull request!

## Any Contributions You Make Will Be Under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same MIT License that covers the project. Feel free to contact the maintainers if that's a concern.

## Report Bugs Using GitHub's Issue Tracker

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/Crugo1202/HTE_AnonTokyo/issues).

### Great Bug Reports Include:

- A quick summary and/or background
- Steps to reproduce (be specific!)
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening)

## Feature Requests

Feature requests are welcome! [Open an issue](https://github.com/Crugo1202/HTE_AnonTokyo/issues) with tag `[FEATURE]` and include:

- Clear description of what you want to happen
- Why this is useful
- Possible implementation approach (optional but helpful)

## Development Guidelines

### Code Style

**Python (Backend)**
- Use `black` for code formatting
- Follow PEP 8
- Type hints where possible
- Docstrings for all functions

**TypeScript/React (Frontend)**
- Use ESLint config provided
- Follow React best practices
- Functional components with hooks
- Proper TypeScript typing

### Testing

**Backend**
```bash
pytest tests/
```

**Frontend**
```bash
npm test
```

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Branch Naming

- `feature/short-description` for new features
- `fix/short-description` for bug fixes
- `docs/short-description` for documentation updates
- `refactor/short-description` for code refactoring

## Setting Up Development Environment

1. Clone the repository
2. Set up backend:
   ```bash
   python3.12 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Add your API keys to .env
   ```

3. Set up frontend:
   ```bash
   cd frontend
   npm install
   ```

4. Run both services:
   ```bash
   # Terminal 1
   venv/bin/uvicorn app.main:app --reload
   
   # Terminal 2
   cd frontend && npm run dev
   ```

## Pull Request Process

1. Update the README or relevant documentation if you change functionality
2. Ensure all tests pass
3. Add unit tests for any new functionality
4. Provide a clear description of what your PR changes and why
5. Link any related issues

## Any Questions?

Feel free to open an issue or contact the maintainers!

---

**By contributing, you agree that your contributions will be licensed under its MIT License.**
