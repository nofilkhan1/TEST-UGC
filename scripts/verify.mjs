// End-to-end verification of the SideShift core loop against the live DB.
// Service-role key is used ONLY to provision + delete test auth users.
// All data operations run as the users' own sessions (real RLS exercise).
// Run: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !svcKey) {
  console.error("Missing env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonA = createClient(url, anonKey); // brand session
const anonB = createClient(url, anonKey); // creator session

const results = [];
const ok = (name, cond, extra = "") => {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
};

const stamp = Date.now();
const brandEmail = `verify-brand-${stamp}@test.com`;
const creatorEmail = `verify-creator-${stamp}@test.com`;
const password = "VerifyPass123!";

try {
  // 1. Provision users (service role, confirmed)
  const { data: bU, error: bE } = await admin.auth.admin.createUser({
    email: brandEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Verify Brand", role: "brand" },
  });
  ok("create brand user", !bE, bE?.message);
  const { data: cU, error: cE } = await admin.auth.admin.createUser({
    email: creatorEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Verify Creator", role: "creator" },
  });
  ok("create creator user", !cE, cE?.message);
  const brandId = bU.user.id;
  const creatorId = cU.user.id;

  // 2. Profiles (app does this on signup; replicate via admin for the test)
  await admin.from("profiles").insert([
    { id: brandId, role: "brand", full_name: "Verify Brand" },
    { id: creatorId, role: "creator", full_name: "Verify Creator" },
  ]);
  await admin.from("brand_profiles").insert({ profile_id: brandId, company_name: "Verify Co" });
  await admin.from("creator_profiles").insert({ profile_id: creatorId, instagram_handle: "@verify", bio: "test" });

  // 3. Sign in as each (real user sessions)
  const { error: bS } = await anonA.auth.signInWithPassword({ email: brandEmail, password });
  const { error: cS } = await anonB.auth.signInWithPassword({ email: creatorEmail, password });
  ok("brand login", !bS, bS?.message);
  ok("creator login", !cS, cS?.message);

  // 4. Brand posts a campaign (RLS: brand only)
  const { data: camp, error: campE } = await anonA
    .from("campaigns")
    .insert({ brand_id: brandId, platform: "instagram", title: "Verify Campaign", description: "test", status: "live" })
    .select()
    .single();
  ok("brand creates campaign", !campE, campE?.message);
  const campaignId = camp?.id;

  // 5. RLS negative: creator cannot post a campaign
  const { error: campNeg } = await anonB.from("campaigns").insert({
    brand_id: creatorId, platform: "tiktok", title: "x", description: "x", status: "live",
  });
  ok("creator BLOCKED from posting campaign (RLS)", !!campNeg, campNeg?.message?.slice(0, 60));

  // 6. Creator applies (RLS: creator only)
  const { data: app, error: appE } = await anonB
    .from("applications")
    .insert({ campaign_id: campaignId, creator_id: creatorId, status: "pending", pitch: "pick me" })
    .select()
    .single();
  ok("creator applies", !appE, appE?.message);
  const appId = app?.id;

  // 7. RLS negative: brand cannot apply
  const { error: appNeg } = await anonA.from("applications").insert({
    campaign_id: campaignId, creator_id: brandId,
  });
  ok("brand BLOCKED from applying (RLS)", !!appNeg, appNeg?.message?.slice(0, 60));

  // 8. Trigger: brand got application_received notification
  const { data: n1 } = await anonA.from("notifications").select().eq("user_id", brandId).eq("type", "application_received");
  ok("trigger: brand notified of application", (n1?.length ?? 0) >= 1, `count=${n1?.length}`);

  // 9. Brand approves (RLS: brand owns campaign)
  const { error: updE } = await anonA.from("applications").update({ status: "approved" }).eq("id", appId);
  ok("brand approves application", !updE, updE?.message);

  // 10. Trigger: creator got application_approved notification (human-readable, w/ title)
  const { data: n2 } = await anonB.from("notifications").select().eq("user_id", creatorId).eq("type", "application_approved");
  const approveMsg = n2?.[0]?.message ?? "";
  ok("trigger: creator notified of approval", (n2?.length ?? 0) >= 1, `count=${n2?.length}`);
  ok(
    "approval message is human-readable with campaign title",
    approveMsg.includes(camp?.title ?? "") && approveMsg.includes("approved"),
    approveMsg,
  );

  // 11b. Draft -> Publish -> Close lifecycle (brand)
  const { data: dCamp, error: dE } = await anonA
    .from("campaigns")
    .insert({ brand_id: brandId, platform: "tiktok", title: "Draft Lifecycle", description: "x", status: "draft" })
    .select()
    .single();
  ok("brand creates draft campaign", !dE, dE?.message);
  const { error: pubE } = await anonA.from("campaigns").update({ status: "live" }).eq("id", dCamp.id);
  const { data: pubCheck } = await anonA.from("campaigns").select("status").eq("id", dCamp.id).single();
  ok("publish flips draft -> live", !pubE && pubCheck?.status === "live", pubCheck?.status);
  await anonA.from("campaigns").update({ status: "closed" }).eq("id", dCamp.id);
  const { data: closedCheck } = await anonA.from("campaigns").select("status").eq("id", dCamp.id).single();
  ok("close flips live -> closed", closedCheck?.status === "closed", closedCheck?.status);

  // 11. Unique constraint: creator cannot double-apply
  const { error: dupE } = await anonB.from("applications").insert({ campaign_id: campaignId, creator_id: creatorId });
  ok("unique constraint blocks double application", !!dupE, dupE?.message?.slice(0, 50));
} catch (e) {
  console.error("FATAL", e);
} finally {
  // Cleanup test users (cascades profiles/campaigns/applications/notifications)
  try {
    const stamp2 = Date.now();
    const { data: users } = await admin.auth.admin.listUsers();
    const toDelete = (users?.users ?? [])
      .filter((u) => u.email?.startsWith("verify-"))
      .map((u) => u.id);
    for (const id of toDelete) await admin.auth.admin.deleteUser(id);
    if (toDelete.length) console.log(`🧹 cleaned up ${toDelete.length} test user(s)`);
  } catch (e) {
    console.log("cleanup note:", e?.message);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${failed === 0 ? "🎉 ALL CHECKS PASSED" : `⚠️ ${failed} CHECK(S) FAILED`}`);
  process.exit(failed === 0 ? 0 : 1);
}
