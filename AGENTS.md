# Agent Guidelines for Neon Reliquary

## Feature Completion & Git Workflow
1. **Validation**: Always verify changes by running tests (`npm test`) and building (`npm run build`) before finalizing.
2. **Commit**: Commit all modified and new files on the feature branch with a descriptive conventional commit message (e.g. `feat: ...`, `fix: ...`).
3. **Auto-Merge into `main`**:
   - The repository has an automated git `post-commit` hook and a dedicated command `npm run merge:main` (`node scripts/auto-merge-feature.mjs`).
   - Every time a commit is finalized on a feature branch, it will automatically validate and merge the branch into `main` cleanly using `--no-ff`.
   - If needed manually, run `npm run merge:main`.
