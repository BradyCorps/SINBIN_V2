# Workshop Inventory

| Field           | Value                                                   |
| --------------- | ------------------------------------------------------- |
| Workshop remote | `https://github.com/BradyCorps/Sin-Bin.git`             |
| Audited branch  | `experiment/live-shift-lab-4`                           |
| Audited commit  | `9b089282b763ebac968cdae30cf49356c7c1c0a9`              |
| Tree SHA        | `c330ed0f653448e6fbffdcd2d700a2c8a17e8e97`              |
| Audit date      | 2026-08-27 UTC                                          |
| Worktree state  | Clean local checkout; remote branch unchanged           |
| Runtime         | Node `>=22.13.0`                                        |
| Package manager | npm with committed lockfile                             |
| Framework       | Next 16.2.6 through Vinext 0.0.50                       |
| Tracked tree    | 208 entries; 142 blobs                                  |
| Test baseline   | `npm test`: 26 passed, 0 failed                         |
| Lint baseline   | `npm run lint`: passed                                  |
| Build baseline  | Vinext production build and artifact validation: passed |

## Audited areas

- `app/game-engine.mjs` and deterministic tests
- 844×390 live-match components and `StageScaler`
- Storybook configuration and canonical fixtures
- Global design tokens and fixed-stage CSS
- UI Skin Pack v0.1, checksums, provenance, and runtime manifest
- Character references and placeholder runtime exports
- Database, ChatGPT auth, Sites/Vinext, and deployment bindings
- Generated screenshots, visual baselines, and experiment documentation

No Workshop file, branch, deployment setting, or history was changed.
