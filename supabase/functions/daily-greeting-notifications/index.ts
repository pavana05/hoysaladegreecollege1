import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Indian festival calendar (month-day) with greetings
const FESTIVALS: Record<string, { name: string; emoji: string; quote: string; roles: string[] }> = {
  "01-14": { name: "Makar Sankranti", emoji: "🪁☀️", quote: "May the sun of knowledge brighten your life. Happy Makar Sankranti!", roles: ["student", "teacher"] },
  "01-26": { name: "Republic Day", emoji: "🇮🇳🏛️", quote: "Saluting the spirit of our great nation. Jai Hind! Happy Republic Day!", roles: ["student", "teacher"] },
  "03-14": { name: "Holi", emoji: "🎨🌈", quote: "Let the colours of joy, love and happiness fill your life. Happy Holi!", roles: ["student", "teacher"] },
  "04-14": { name: "Ambedkar Jayanti", emoji: "📘🙏", quote: "Education is the most powerful weapon to change the world. Jai Bhim!", roles: ["student", "teacher"] },
  "08-15": { name: "Independence Day", emoji: "🇮🇳🕊️", quote: "Freedom in mind, faith in words, pride in our heart. Happy Independence Day!", roles: ["student", "teacher"] },
  "09-05": { name: "Teachers' Day", emoji: "👩‍🏫📚❤️", quote: "A teacher takes a hand, opens a mind and touches a heart. Happy Teachers' Day!", roles: ["teacher"] },
  "10-02": { name: "Gandhi Jayanti", emoji: "🕊️🇮🇳", quote: "Be the change you wish to see in the world. Happy Gandhi Jayanti!", roles: ["student", "teacher"] },
  "10-20": { name: "Diwali", emoji: "🪔✨🎆", quote: "May the festival of lights illuminate your path to success and wisdom. Happy Diwali!", roles: ["student", "teacher"] },
  "10-21": { name: "Diwali", emoji: "🪔✨🎆", quote: "May the festival of lights illuminate your path to success and wisdom. Happy Diwali!", roles: ["student", "teacher"] },
  "11-01": { name: "Kannada Rajyotsava", emoji: "🏳️‍🌈❤️", quote: "Proud to be Kannadiga! Happy Kannada Rajyotsava! ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಶುಭಾಶಯಗಳು!", roles: ["student", "teacher"] },
  "11-14": { name: "Children's Day", emoji: "🧒🎈🌟", quote: "Every child is a different kind of flower that makes the world beautiful. Happy Children's Day!", roles: ["student"] },
  "12-25": { name: "Christmas", emoji: "🎄🎅✨", quote: "Wishing you joy, peace and happiness. Merry Christmas!", roles: ["student", "teacher"] },
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const textEncoder = new TextEncoder();
  const inputData = textEncoder.encode(`${header}.${payload}`);
  const pemContent = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, inputData);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${header}.${payload}.${signatureB64}`;
  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return new Response(JSON.stringify({ error: "Firebase not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    // Current date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const monthDay = `${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
    const hour = ist.getUTCHours();

    // Determine greeting period
    let greeting = "Good morning";
    let emoji = "🌅";
    if (hour >= 12 && hour < 17) { greeting = "Good afternoon"; emoji = "☀️"; }
    else if (hour >= 17) { greeting = "Good evening"; emoji = "🌆"; }

    // Check for festivals
    const festival = FESTIVALS[monthDay];

    // --- Send daily morning greeting to students (only at morning) ---
    let sentCount = 0;
    let failedCount = 0;

    if (hour >= 6 && hour < 10) {
      // Get all student user IDs
      const { data: studentRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      const studentUserIds = (studentRoles || []).map((r: any) => r.user_id);

      if (studentUserIds.length > 0) {
        // Get profiles for names
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", studentUserIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || "Student"; });

        // Get FCM tokens
        const { data: tokens } = await adminClient
          .from("fcm_tokens")
          .select("*")
          .in("user_id", studentUserIds);

        if (tokens && tokens.length > 0) {
          const staleTokenIds: string[] = [];
          for (const tokenRec of tokens) {
            const name = nameMap[tokenRec.user_id] || "Student";
            const firstName = name.split(" ")[0];
            const title = `${emoji} ${greeting}, ${firstName}!`;
            const body = "Have a great day ahead! Keep learning and stay focused. 📚✨";

            try {
              const fcmRes = await fetch(
                `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: {
                      token: tokenRec.token,
                      notification: { title, body },
                      data: { url: "/dashboard/student", click_action: "OPEN_ACTIVITY" },
                      android: { priority: "high", notification: { channel_id: "hdc_notifications", sound: "default" } },
                    },
                  }),
                }
              );
              if (fcmRes.ok) { sentCount++; } else {
                const errData = await fcmRes.json();
                failedCount++;
                if (errData?.error?.code === 404 || errData?.error?.code === 410 ||
                    errData?.error?.details?.some?.((d: any) => d.errorCode === "UNREGISTERED")) {
                  staleTokenIds.push(tokenRec.id);
                }
              }
            } catch { failedCount++; }
          }
          if (staleTokenIds.length > 0) {
            await adminClient.from("fcm_tokens").delete().in("id", staleTokenIds);
          }

          // Also insert in-app notifications
          const notifInserts = studentUserIds.map((uid: string) => {
            const name = nameMap[uid] || "Student";
            const firstName = name.split(" ")[0];
            return {
              user_id: uid,
              title: `${emoji} ${greeting}, ${firstName}!`,
              message: "Have a great day ahead! Keep learning and stay focused. 📚✨",
              type: "greeting",
              is_read: false,
            };
          });
          await adminClient.from("notifications").insert(notifInserts);
        }
      }
    }

    // --- Festival notifications ---
    let festivalSent = 0;
    if (festival && hour >= 8 && hour < 11) {
      const targetRoles = festival.roles;
      const { data: roleUsers } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("role", targetRoles);
      const festUserIds = (roleUsers || []).map((r: any) => r.user_id);

      if (festUserIds.length > 0) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", festUserIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || ""; });

        const { data: tokens } = await adminClient
          .from("fcm_tokens")
          .select("*")
          .in("user_id", festUserIds);

        if (tokens && tokens.length > 0) {
          const staleTokenIds: string[] = [];
          for (const tokenRec of tokens) {
            const name = nameMap[tokenRec.user_id] || "";
            const firstName = name.split(" ")[0] || "Dear";
            const title = `${festival.emoji} Happy ${festival.name}, ${firstName}!`;
            const body = festival.quote;

            try {
              const fcmRes = await fetch(
                `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: {
                      token: tokenRec.token,
                      notification: { title, body },
                      data: { url: "/dashboard", click_action: "OPEN_ACTIVITY" },
                      android: { priority: "high", notification: { channel_id: "hdc_notifications", sound: "default" } },
                    },
                  }),
                }
              );
              if (fcmRes.ok) { festivalSent++; } else {
                const errData = await fcmRes.json();
                if (errData?.error?.code === 404 || errData?.error?.code === 410 ||
                    errData?.error?.details?.some?.((d: any) => d.errorCode === "UNREGISTERED")) {
                  staleTokenIds.push(tokenRec.id);
                }
              }
            } catch { /* skip */ }
          }
          if (staleTokenIds.length > 0) {
            await adminClient.from("fcm_tokens").delete().in("id", staleTokenIds);
          }

          // In-app notifications for festival
          const festNotifs = festUserIds.map((uid: string) => {
            const name = nameMap[uid] || "";
            const firstName = name.split(" ")[0] || "Dear";
            return {
              user_id: uid,
              title: `${festival.emoji} Happy ${festival.name}, ${firstName}!`,
              message: festival.quote,
              type: "festival",
              is_read: false,
            };
          });
          await adminClient.from("notifications").insert(festNotifs);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        daily_greeting_sent: sentCount,
        daily_greeting_failed: failedCount,
        festival_sent: festivalSent,
        festival_today: festival?.name || null,
        date: monthDay,
        hour_ist: hour,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Daily greeting error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
