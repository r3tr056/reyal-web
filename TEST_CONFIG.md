# Test Configuration & CI/CD

This file contains additional test configurations and scripts for comprehensive testing.

## GitHub Actions Workflow

```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Additional Test Scripts

Add these to package.json scripts:

```json
{
  "scripts": {
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration", 
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:coverage:watch": "jest --coverage --watchAll",
    "test:performance": "lighthouse-ci",
    "test:accessibility": "pa11y-ci",
    "test:visual": "playwright test --project=visual-tests"
  }
}
```

## Test Environment Variables

```bash
# .env.test
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
NODE_ENV=test
DISABLE_REAL_API=true
```

## Coverage Reporting

The project is configured with comprehensive coverage reporting:

- **HTML Reports**: Generated in `coverage/` directory
- **LCOV Format**: For CI/CD integration
- **Console Output**: Real-time coverage feedback
- **Threshold Enforcement**: Tests fail if coverage drops below 80%

## Performance Testing

Additional performance testing can be added:

```bash
npm install --save-dev lighthouse-ci
```

With configuration in `lighthouserc.js`:

```js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run dev',
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
      },
    },
  },
};
```