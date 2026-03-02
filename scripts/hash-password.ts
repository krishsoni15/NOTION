import { hashSync } from "bcrypt-ts";
const password = process.argv[2] || "manager123";
console.log(`Password: ${password}`);
console.log(`Hash: ${hashSync(password, 10)}`);
