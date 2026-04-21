/**
 * Performance Optimization Tests Runner
 * 
 * Runs all performance optimization and caching tests
 */

import { runPerformanceOptimizationTests } from "./performance-optimization.test";

console.log("=".repeat(60));
console.log("Performance Optimization and Caching Tests");
console.log("=".repeat(60));
console.log("");

const results = runPerformanceOptimizationTests();

console.log("");
console.log("=".repeat(60));
console.log("Test Summary");
console.log("=".repeat(60));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`Total: ${results.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log("");
  console.log("Failed Tests:");
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  - ${r.name}`);
      console.log(`    Error: ${r.error}`);
    });
}

process.exit(failed > 0 ? 1 : 0);
