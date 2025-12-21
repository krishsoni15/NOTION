import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import { ManagerCostComparisonsContent } from "@/components/manager/manager-cost-comparisons-content";

export default async function ManagerCostComparisonsPage() {
  await requireRole(ROLES.MANAGER);

  return <ManagerCostComparisonsContent />;
}

