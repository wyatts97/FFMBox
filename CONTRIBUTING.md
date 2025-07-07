# Contributing to FFMBox

Thank you for your interest in contributing to FFMBox! We appreciate your time and effort in making this project better. Please take a moment to review this document to ensure a smooth contribution process.

## 📋 Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [License](#license)

## How Can I Contribute?

### Reporting Bugs

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/). When creating a bug report:

1. **Use a clear and descriptive title** for the issue.
2. **Describe the exact steps** to reproduce the issue.
3. **Provide specific examples** to demonstrate the steps.
4. **Describe the behavior you expected** and why.
5. **Include screenshots or screen recordings** if they help demonstrate the issue.
6. **List your environment** (OS, Node.js version, FFmpeg version, etc.).

### Suggesting Enhancements

We welcome enhancement suggestions that improve FFMBox. When suggesting an enhancement:

1. **Use a clear and descriptive title** for the enhancement request.
2. **Provide a step-by-step description** of the suggested enhancement.
3. **Explain why this enhancement would be useful** to most FFMBox users.
4. **List any alternatives or workarounds** you've considered.
5. **Include screenshots or mockups** if they help illustrate the enhancement.

### Your First Code Contribution

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/FFMBox.git
   cd FFMBox
   ```
3. **Create a new branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-number-description
   ```
4. **Make your changes** following the coding standards.
5. **Test your changes** thoroughly.
6. **Commit your changes** with a descriptive message.
7. **Push your changes** to your fork:
   ```bash
   git push origin your-branch-name
   ```
8. **Open a Pull Request** with a clear title and description.

### Pull Requests

When submitting a pull request:

1. **Keep it focused** - Each PR should address a single issue or add a single feature.
2. **Update the documentation** if your changes affect the user interface or behavior.
3. **Include tests** for new functionality or bug fixes.
4. **Ensure all tests pass** before submitting.
5. **Reference related issues** in your PR description.

## Development Setup

1. **Fork and clone** the repository.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up environment variables** by copying `.env.example` to `.env` and updating the values:
   ```bash
   cp .env.example .env
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
5. **Run tests** (if available):
   ```bash
   npm test
   ```

## Coding Standards

- **JavaScript**: Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript).
- **ES6+**: Use modern JavaScript features where appropriate.
- **Code Formatting**: Use Prettier for consistent code formatting.
- **Linting**: Ensure your code passes all ESLint rules.
- **Comments**: Document complex logic with clear comments.
- **Commit Messages**: Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Here are some examples:

- `feat: add new conversion preset for WebM`
- `fix: resolve issue with file upload validation`
- `docs: update README with new installation steps`
- `refactor: improve error handling in file processing`
- `test: add unit tests for utility functions`

## License

By contributing to FFMBox, you agree that your contributions will be licensed under the [MIT License](LICENSE).
