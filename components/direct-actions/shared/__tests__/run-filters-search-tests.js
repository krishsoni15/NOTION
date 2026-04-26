#!/usr/bin/env node

/**
 * Test Runner for Filters and Search Tests
 * 
 * Runs the filters and search integration tests
 */

// Import the test functions
const { runFiltersAndSearchTests } = require('./filters-and-search.test.ts');

// Run the tests
const results = runFiltersAndSearchTests();

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
