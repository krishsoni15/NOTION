/**
 * Site Engineer Requests Page
 *
 * View and create material requests.
 */

import { requireRole } from "@/lib/auth/redirect";
import { ROLES } from "@/lib/auth/roles";
import RequestsPageClient from "./client-page";

export default async function SiteRequestsPage() {
  await requireRole(ROLES.SITE_ENGINEER);

  return <RequestsPageClient />;
}
