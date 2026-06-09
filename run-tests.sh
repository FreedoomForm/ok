#!/bin/bash

# AutoFood Test Suite Runner
# This script runs comprehensive tests on the entire website interface

set -e

echo "🚀 AutoFood - Comprehensive Test Suite"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx not found. Please install Node.js${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules/@playwright/test" ]; then
    echo -e "${YELLOW}⚠️  Playwright not found. Installing dependencies...${NC}"
    npm install --save-dev @playwright/test @axe-core/playwright
    npx playwright install chromium
fi

echo -e "${GREEN}✅ Dependencies verified${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
fi

echo "📝 Running test suite..."
echo ""

# Run tests
npm test -- --reporter=html,list

TEST_EXIT_CODE=$?

echo ""
echo "======================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "📊 Test report generated: test-results/html-report/index.html"
    echo "   Run 'npm run test:report' to view the report"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "📊 Test report available at: test-results/html-report/index.html"
    echo "   Run 'npm run test:report' to view detailed results"
    echo ""
    echo "🔍 To debug failures, run:"
    echo "   npm run test:debug"
fi

echo ""
echo "======================================"

exit $TEST_EXIT_CODE
