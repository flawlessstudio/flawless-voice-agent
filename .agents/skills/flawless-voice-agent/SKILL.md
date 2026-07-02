```markdown
# flawless-voice-agent Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `flawless-voice-agent` TypeScript codebase. You'll learn how to write code that matches the project's style, structure your files, manage imports/exports, and write effective tests with Jest. This guide also provides suggested commands for common workflows.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `voiceAgent.ts`, `audioProcessor.test.ts`

### Import Style
- Use **relative imports** for referencing other modules within the codebase.
  - Example:
    ```typescript
    import { processAudio } from './audioProcessor';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In audioProcessor.ts
    export function processAudio(input: Buffer): AudioData { ... }
    ```

### Commit Messages
- Follow **Conventional Commits** style.
- Use prefixes like `fix` to indicate the type of change.
  - Example:
    ```
    fix: handle edge case in audio stream parsing
    ```

## Workflows

### Writing a New Module
**Trigger:** When you need to add new functionality.
**Command:** `/new-module`

1. Create a new file using camelCase naming (e.g., `speechRecognizer.ts`).
2. Implement functionality using named exports.
   ```typescript
   export function recognizeSpeech(audio: Buffer): string { ... }
   ```
3. Use relative imports to include dependencies.
   ```typescript
   import { processAudio } from './audioProcessor';
   ```
4. Write corresponding tests in a `.test.ts` file.

### Running Tests
**Trigger:** When you want to verify your code.
**Command:** `/run-tests`

1. Ensure your test files are named with the `.test.ts` suffix (e.g., `speechRecognizer.test.ts`).
2. Run Jest to execute all tests:
   ```
   npx jest
   ```

### Fixing a Bug
**Trigger:** When you identify and resolve a bug.
**Command:** `/fix-bug`

1. Make code changes to resolve the issue.
2. Write or update tests to cover the bug scenario.
3. Commit using the `fix:` prefix and a clear message.
   ```
   fix: correct audio buffer overflow handling
   ```

## Testing Patterns

- All tests use the **Jest** framework.
- Test files are named with the `.test.ts` suffix and placed alongside implementation files.
- Example test file:
  ```typescript
  // audioProcessor.test.ts
  import { processAudio } from './audioProcessor';

  test('processAudio returns correct format', () => {
    const input = Buffer.from([/* ... */]);
    const result = processAudio(input);
    expect(result).toHaveProperty('sampleRate');
  });
  ```

## Commands
| Command       | Purpose                                  |
|---------------|------------------------------------------|
| /new-module   | Scaffold and implement a new module      |
| /run-tests    | Run all Jest tests                       |
| /fix-bug      | Fix a bug and commit with proper message |
```
