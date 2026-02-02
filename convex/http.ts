import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
    path: "/clerk-users-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        // 1. Get the webhook secret
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
        if (!WEBHOOK_SECRET) {
            console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
            return new Response("Missing webhook secret", { status: 500 });
        }

        // 2. Get the headers
        const svrId = request.headers.get("svix-id");
        const svrTimestamp = request.headers.get("svix-timestamp");
        const svrSignature = request.headers.get("svix-signature");

        if (!svrId || !svrTimestamp || !svrSignature) {
            console.error("Missing svix headers");
            return new Response("Error: Missing svix headers", { status: 400 });
        }

        // 3. Get the body
        const payload = await request.text();
        const body = JSON.stringify(payload);

        // 4. Verify the payload
        const wh = new Webhook(WEBHOOK_SECRET);
        let evt: any;

        try {
            evt = wh.verify(payload, {
                "svix-id": svrId,
                "svix-timestamp": svrTimestamp,
                "svix-signature": svrSignature,
            });
        } catch (err) {
            console.error("Error verifying webhook:", err);
            return new Response("Error occurred", { status: 400 });
        }

        // 5. Handle the event
        const eventType = evt.type;
        console.log(`Received webhook with type: ${eventType}`);

        if (eventType === "user.created" || eventType === "user.updated") {
            const { id, username, first_name, last_name, image_url, phone_numbers, public_metadata, email_addresses } = evt.data;

            const fullName = `${first_name || ""} ${last_name || ""}`.trim() || username || id;
            const primaryEmail = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : "";

            // Determine role from metadata
            // Clerk stores metadata in public_metadata under 'role' usually
            const role = public_metadata?.role;

            await ctx.runMutation(internal.users.internalUpsertUser, {
                clerkUserId: id,
                username: username || id, // Fallback if username not set
                fullName: fullName,
                phoneNumber: phone_numbers && phone_numbers.length > 0 ? phone_numbers[0].phone_number : undefined,
                email: primaryEmail,
                profileImage: image_url,
                role: role,
            });
        } else if (eventType === "user.deleted") {
            const { id } = evt.data;
            if (id) {
                await ctx.runMutation(internal.users.internalDeleteUserByClerkId, {
                    clerkUserId: id,
                });
            }
        } else if (eventType === "session.created") {
            // Optional: Handle session creation if needed
            // For now, we rely on user.created/updated
        }

        return new Response("Webhook received", { status: 200 });
    }),
});

export default http;
