
import { getUserRole } from "@/lib/auth/get-user-role";
import { ROLES } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { ProjectManagement } from "@/components/ProjectModule";
import { Card, CardContent } from "@/components/ui/card";

async function requireRole(allowedRoles: string[]) {
    const role = await getUserRole();
    if (!role || !allowedRoles.includes(role)) {
        redirect("/dashboard");
    }
    return role;
}

export default async function ProjectPage() {
    // Check if user is Manager or Purchase Officer
    await requireRole([ROLES.MANAGER, ROLES.PURCHASE_OFFICER]);

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <ProjectManagement />
                </CardContent>
            </Card>
        </div>
    );
}
