import { getUserRole } from "@/lib/auth/get-user-role";
import { ROLES } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { ProjectManagement } from "@/components/ProjectModule";

async function requireRole(allowedRoles: string[]) {
    const role = await getUserRole();
    if (!role || !allowedRoles.includes(role)) {
        redirect("/dashboard");
    }
    return role;
}

export default async function ProjectPage() {
    await requireRole([ROLES.MANAGER, ROLES.PURCHASE_OFFICER]);
    return <ProjectManagement />;
}
