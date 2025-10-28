# GitHub Actions Workflows

This directory contains CI/CD pipelines for automated testing and code quality checks.

## 📋 Workflows

### 1. CI - Tests (`ci-tests.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual dispatch

**Jobs:**

#### Unit Tests
- Runs on Node.js 18.x and 20.x
- Executes TypeScript compilation
- Runs unit tests with `npm run test:unit`
- Generates coverage report (Node 20.x only)
- Uploads coverage to Codecov
- Archives test results as artifacts

#### Integration Tests
- Runs on Node.js 20.x
- Depends on unit tests passing
- Executes integration tests with `npm run test:integration`
- Archives test results as artifacts

#### Linting
- TypeScript type checking
- Build verification
- Code quality checks

#### Test Summary
- Aggregates results from all jobs
- Creates summary in GitHub Actions UI
- Fails if any test job fails

---

### 2. PR - Quick Tests (`pr-tests.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened

**Purpose:**
- Fast validation for PRs
- Runs only critical validation tests
- Comments results on PR

**Jobs:**
- Quick TypeScript compilation
- Configuration validation tests only
- PR comment with results

---

### 3. Nightly - Full Test Suite (`nightly-tests.yml`)

**Triggers:**
- Scheduled: Daily at 2 AM UTC
- Manual dispatch

**Jobs:**

#### Full Test Suite
- Runs **all** tests (including E2E if present)
- Full coverage report
- 90-day artifact retention
- Creates GitHub issue if tests fail

#### Security Audit
- Runs `npm audit`
- Checks outdated packages
- Generates audit report
- Archives security findings

---

### 4. Code Quality (`code-quality.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests
- Manual dispatch

**Jobs:**

#### Code Analysis
- Lines of code metrics
- Test coverage threshold check (70% minimum)
- TODO comment tracking
- Bundle size analysis
- Package.json validation

#### Test Matrix
- Test suite statistics
- Pass/fail counts
- Detailed results in GitHub Summary

---

## 🎯 Test Commands

### Unit Tests
```bash
npm run test:unit
```
Runs all unit tests, excluding integration and E2E tests.

**Coverage:**
- Components: `components/__tests__/`
- Config: `config/__tests__/`
- Validators: `config/validation/__tests__/`

### Integration Tests
```bash
npm run test:integration
```
Runs integration tests that test multiple components together.

**Coverage:**
- Cluster creation workflows
- Configuration validation integration
- Component interaction tests

### Coverage Report
```bash
npm run test:coverage
```
Generates HTML coverage report in `coverage/` directory.

### All Tests
```bash
npm test
```
Runs all tests (unit + integration), excluding E2E.

---

## 📊 Coverage Requirements

| Metric | Threshold |
|--------|-----------|
| Overall Coverage | ≥ 70% |
| Validation Tests | ✅ Required |
| Component Tests | ✅ Required |
| Integration Tests | ✅ Required |

---

## 🚀 Artifacts

### Test Results
- **Retention:** 30 days (regular), 90 days (nightly)
- **Contents:**
  - Coverage reports
  - JUnit XML results
  - Test output logs

### Security Audit
- **Retention:** 90 days
- **Contents:**
  - npm audit results
  - Outdated packages list
  - Audit report markdown

---

## 🔧 Configuration

### Secrets Required

| Secret | Purpose | Required For |
|--------|---------|--------------|
| `CODECOV_TOKEN` | Coverage upload | CI Tests (optional) |

### Environment Variables

All workflows use `NODE_ENV=test` for test runs.

---

## 📈 Status Badges

Add these to your README:

```markdown
![CI Tests](https://github.com/chalkan3/linode-k3s-pulumi/workflows/CI%20-%20Tests/badge.svg)
![Code Quality](https://github.com/chalkan3/linode-k3s-pulumi/workflows/Code%20Quality/badge.svg)
```

---

## 🐛 Troubleshooting

### Tests Failing in CI but Passing Locally

**Possible causes:**
1. **Environment differences** - CI uses Ubuntu, you may use macOS
2. **Node version** - CI tests on 18.x and 20.x
3. **Clean install** - CI uses `npm ci` (clean install)

**Solutions:**
```bash
# Use exact CI environment
rm -rf node_modules package-lock.json
npm ci
npm test
```

### Coverage Upload Fails

**Cause:** Missing `CODECOV_TOKEN` secret

**Solution:**
1. Sign up at https://codecov.io
2. Add repository
3. Get token
4. Add as GitHub secret: Settings → Secrets → Actions → New repository secret

### Nightly Tests Create Too Many Issues

**Cause:** Tests failing repeatedly

**Solution:**
- Fix failing tests
- Or disable issue creation temporarily in `nightly-tests.yml`

---

## 📝 Adding New Workflows

1. Create new `.yml` file in `.github/workflows/`
2. Follow existing patterns
3. Use semantic job names
4. Add to this README
5. Test with `workflow_dispatch` trigger first

---

## 🔍 Workflow Triggers Reference

| Workflow | Push | PR | Schedule | Manual |
|----------|------|-------|----------|--------|
| CI Tests | ✅ | ✅ | ❌ | ✅ |
| PR Quick Tests | ❌ | ✅ | ❌ | ❌ |
| Nightly | ❌ | ❌ | ✅ Daily 2AM | ✅ |
| Code Quality | ✅ | ✅ | ❌ | ✅ |

---

**Last Updated:** 2025-01-28
**Maintained by:** Platform Team
