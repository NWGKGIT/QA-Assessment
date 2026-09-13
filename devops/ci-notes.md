# CI/CD Notes

## Current pipeline

The workflow in `.github/workflows/ci.yml` runs on every push and pull request. It:

1. Checks out the repository.
2. Sets up Node.js 20 with npm caching.
3. Installs the locked dependency tree with `npm ci`.
4. Runs the ESLint command with `npm run lint`.
5. Runs the TypeScript compiler without emitting files with `npm run typecheck`.
6. Builds the NestJS application with `npm run build`.
7. Runs the Jest unit tests in-band with `npm test -- --runInBand`.

Each command is a separate workflow step. GitHub Actions stops the job when a command exits non-zero, so a lint, typecheck, build, or test failure blocks a passing CI run.

## Local equivalent

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test -- --runInBand
```

## Extension toward continuous deployment

After CI passes on the default branch, a separate deployment job could build the Docker image, tag it with the commit SHA, and push it to a private registry such as Amazon ECR. A protected deployment environment would then update the runtime service, wait for the application and database health checks, and stop the rollout if the new revision does not become healthy. Production credentials should come from GitHub Actions secrets or an OIDC trust relationship, not from repository files.

A later improvement would be to keep deployment approval separate from the build job so pull requests can validate the image without receiving production credentials.
