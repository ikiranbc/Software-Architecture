import mongoose from "mongoose";
import { normalizeStatus, UserStatuses } from "@hotel-booking/rbac";

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return (process.argv[index + 1] || "").trim();
}

const requestedEmail = getArgValue("--email").toLowerCase();
const listBlockedOnly = process.argv.includes("--list-blocked");
const unblockAllBlocked = process.argv.includes("--all-blocked");
const normalizeLegacyEnums = process.argv.includes("--normalize-legacy");
const listAllUsers = process.argv.includes("--list-all");
if (!requestedEmail && !listBlockedOnly && !unblockAllBlocked && !listAllUsers && !normalizeLegacyEnums) {
  console.error("[unblock-user] Missing required argument: --email <user-email>");
  console.error("[unblock-user] Or use --list-blocked, --list-all, --normalize-legacy, or --all-blocked");
  process.exit(1);
}

const candidateUris = [
  process.env.MONGO_URI,
  "mongodb://localhost:27017/hotel_booking",
  "mongodb://127.0.0.1:27017/hotel_booking"
].filter(Boolean);

async function connectWithFallback() {
  let lastError;
  for (const uri of candidateUris) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3500 });
      console.log(`[unblock-user] connected: ${uri}`);
      return;
    } catch (error) {
      lastError = error;
      console.log(`[unblock-user] failed: ${uri}`);
    }
  }
  throw lastError || new Error("Unable to connect to MongoDB");
}

async function main() {
  await connectWithFallback();
  const usersCollection = mongoose.connection.db.collection("users");

  if (listBlockedOnly) {
    const blockedUsers = await usersCollection
      .find({ status: { $in: ["BLOCKED", "blocked"] } }, { projection: { email: 1, role: 1, status: 1 } })
      .toArray();
    if (blockedUsers.length === 0) {
      console.log("[unblock-user] no blocked users found");
      return;
    }
    console.log("[unblock-user] blocked users:");
    for (const item of blockedUsers) {
      console.log(`- ${item.email} (${item.role || "UNKNOWN"}) [${item.status}]`);
    }
    return;
  }

  if (listAllUsers) {
    const users = await usersCollection
      .find({}, { projection: { email: 1, role: 1, status: 1 } })
      .toArray();
    console.log(`[unblock-user] total users: ${users.length}`);
    for (const item of users) {
      console.log(`- ${item.email} (${item.role || "UNKNOWN"}) [${item.status || "UNSET"}]`);
    }
    return;
  }

  if (unblockAllBlocked) {
    const result = await usersCollection.updateMany(
      { status: { $in: ["BLOCKED", "blocked"] } },
      { $set: { status: UserStatuses.ACTIVE, updatedAt: new Date() } }
    );
    console.log(`[unblock-user] unblocked users: ${result.modifiedCount}`);
    return;
  }

  if (normalizeLegacyEnums) {
    const mappings = [
      { query: { role: "user" }, patch: { role: "USER" } },
      { query: { role: "admin" }, patch: { role: "ADMIN" } },
      { query: { role: "superadmin" }, patch: { role: "SUPERADMIN" } },
      { query: { role: "owner" }, patch: { role: "ADMIN" } },
      { query: { role: "guest" }, patch: { role: "USER" } },
      { query: { status: "active" }, patch: { status: "ACTIVE" } },
      { query: { status: "blocked" }, patch: { status: "BLOCKED" } }
    ];
    let changed = 0;
    for (const item of mappings) {
      const result = await usersCollection.updateMany(item.query, { $set: { ...item.patch, updatedAt: new Date() } });
      changed += result.modifiedCount;
    }
    console.log(`[unblock-user] normalized legacy role/status records: ${changed}`);
    return;
  }

  const user = await usersCollection.findOne({ email: requestedEmail });
  if (!user) {
    console.error(`[unblock-user] user not found: ${requestedEmail}`);
    process.exit(1);
  }

  const current = normalizeStatus(user.status);
  if (current === UserStatuses.ACTIVE) {
    console.log(`[unblock-user] user already ACTIVE: ${requestedEmail}`);
    return;
  }

  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { status: UserStatuses.ACTIVE, updatedAt: new Date() } }
  );
  console.log(`[unblock-user] user unblocked: ${requestedEmail}`);
}

main()
  .catch((error) => {
    console.error(`[unblock-user] failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
