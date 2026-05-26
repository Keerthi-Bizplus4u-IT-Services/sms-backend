# How to Run Tests (PowerShell Core Not Available)

Since PowerShell Core (pwsh.exe) is not installed on this system, use one of these alternative methods to run the tests:

## Method 1: Command Prompt (Recommended)
```cmd
cd d:\Bizplus4u_Projects\sms\backend
npm test
```

## Method 2: Git Bash
```bash
cd /d/Bizplus4u_Projects/sms/backend
npm test
```

## Method 3: VS Code Integrated Terminal
1. Open VS Code
2. Open folder: `d:\Bizplus4u_Projects\sms\backend`
3. Open terminal (Ctrl + `)
4. Run: `npm test`

## Method 4: Node.js Script
```cmd
cd d:\Bizplus4u_Projects\sms\backend
node run-tests.js
```

## Method 5: Batch File
```cmd
cd d:\Bizplus4u_Projects\sms\backend
run-tests.bat
```

## Method 6: Install PowerShell Core (Optional)
If you want to use PowerShell Core:
1. Download from: https://aka.ms/powershell
2. Install PowerShell 7+
3. Then you can use `pwsh` commands

## Test Commands Available

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test -- auth.service.test.js
```

### Run tests matching pattern
```bash
npm test -- auth
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

### Watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Run smoke tests only
```bash
npm test -- smoke.test.js
```

## Expected Output
When tests run successfully, you should see:
- Test suites and test cases executing
- Pass/fail status for each test
- Coverage report showing:
  - % Statements covered
  - % Branches covered
  - % Functions covered
  - % Lines covered
- Summary of test results

## What Was Fixed
All test blocking issues have been resolved:
✅ Sequelize models properly mocked
✅ Sequelize operators (Op.and, Op.like, etc.) available
✅ Response utilities mocked
✅ Transaction support added
✅ Mail service mocked
✅ Logger mocked
✅ File upload (multer) mocked

See TEST_FIXES_APPLIED.md for detailed information about the fixes.
