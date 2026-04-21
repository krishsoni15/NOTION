/**
 * Test Runner for Direct Actions Core Functionality
 * 
 * Runs all checkpoint tests to verify:
 * - ID generation system
 * - Action button mapping
 * - PO viewing
 * - Title editing
 */

import { runIdGenerationTests } from "./id-generation.test";
import { runActionButtonMappingTests } from "./action-button-mapping.test";
import { runTitleEditingTests } from "./title-editing.test";
import { runPOViewingTests } from "./po-viewing.test";
import { runTwoStepDCWorkflowTests } from "./two-step-dc-workflow.test";
import { runActionButtonIntegrationTests } from "./action-button-integration.test";
import { runIdGenerationIntegrationTests } from "./id-generation-integration.test";
import { runComponentReuseIntegrationTests } from "./component-reuse-integration.test";
import { runFiltersAndSearchTests } from "./filters-and-search.test";

export function runAllTests() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   Direct Actions System - Checkpoint Test Suite            ║");
  console.log("║   Verifying Core Functionality (Tasks 1-12)                ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const results = {
    idGeneration: runIdGenerationTests(),
    actionButtonMapping: runActionButtonMappingTests(),
    titleEditing: runTitleEditingTests(),
    poViewing: runPOViewingTests(),
    twoStepDCWorkflow: runTwoStepDCWorkflowTests(),
    actionButtonIntegration: runActionButtonIntegrationTests(),
    idGenerationIntegration: runIdGenerationIntegrationTests(),
    componentReuseIntegration: runComponentReuseIntegrationTests(),
    filtersAndSearch: runFiltersAndSearchTests(),
  };

  // Summary
  const totalPassed = 
    results.idGeneration.passed +
    results.actionButtonMapping.passed +
    results.titleEditing.passed +
    results.poViewing.passed +
    results.twoStepDCWorkflow.passed +
    results.actionButtonIntegration.passed +
    results.idGenerationIntegration.passed +
    results.componentReuseIntegration.passed +
    results.filtersAndSearch.passed;

  const totalFailed =
    results.idGeneration.failed +
    results.actionButtonMapping.failed +
    results.titleEditing.failed +
    results.poViewing.failed +
    results.twoStepDCWorkflow.failed +
    results.actionButtonIntegration.failed +
    results.idGenerationIntegration.failed +
    results.componentReuseIntegration.failed +
    results.filtersAndSearch.failed;

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   OVERALL TEST RESULTS                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nTotal Tests: ${totalPassed + totalFailed}`);
  console.log(`✓ Passed: ${totalPassed}`);
  console.log(`✗ Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log("\n🎉 All tests passed! Core functionality is working correctly.\n");
  } else {
    console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the errors above.\n`);
  }

  return {
    totalPassed,
    totalFailed,
    allPassed: totalFailed === 0,
    details: results,
  };
}

// Export for use in other modules
export { runIdGenerationTests, runActionButtonMappingTests, runTitleEditingTests, runPOViewingTests, runTwoStepDCWorkflowTests, runActionButtonIntegrationTests, runIdGenerationIntegrationTests, runComponentReuseIntegrationTests, runFiltersAndSearchTests };
