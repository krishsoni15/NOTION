
import { getUserRole } from "@/lib/auth/get-user-role";
import { ROLES } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { LocationManagement } from "@/components/locations/location-management";
import { Card, CardContent } from "@/components/ui/card";

async function requireRole(allowedRoles: string[]) {
    const role = await getUserRole();
    if (!role || !allowedRoles.includes(role)) {
        redirect("/dashboard");
    }
    return role;
}

export default async function LocationPage() {
    // Check if user is Manager
    await requireRole([ROLES.MANAGER]);

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <LocationManagement />
                </CardContent>
            </Card>
        </div>
    );
}
