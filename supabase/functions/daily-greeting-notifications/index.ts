import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Indian festival calendar (month-day) with greetings
const FESTIVALS: Record<string, { name: string; emoji: string; quote: string; roles: string[] }> = {
  "01-14": { name: "Makar Sankranti", emoji: "🪁☀️", quote: "May the sun of knowledge brighten your life. Happy Makar Sankranti!", roles: ["student", "teacher"] },
  "01-15": { name: "Pongal", emoji: "🌾🎍☀️", quote: "May this harvest festival bring abundance and prosperity to your life. Happy Pongal!", roles: ["student", "teacher"] },
  "01-26": { name: "Republic Day", emoji: "🇮🇳🏛️", quote: "Saluting the spirit of our great nation. Jai Hind! Happy Republic Day!", roles: ["student", "teacher"] },
  "03-14": { name: "Holi", emoji: "🎨🌈", quote: "Let the colours of joy, love and happiness fill your life. Happy Holi!", roles: ["student", "teacher"] },
  "03-30": { name: "Eid ul-Fitr", emoji: "🌙✨🕌", quote: "May this Eid bring peace, happiness and prosperity. Eid Mubarak!", roles: ["student", "teacher"] },
  "03-31": { name: "Ugadi", emoji: "🌸🎋🌿", quote: "May the New Year bring new hopes and new beginnings. Happy Ugadi!", roles: ["student", "teacher"] },
  "04-14": { name: "Ambedkar Jayanti", emoji: "📘🙏", quote: "Education is the most powerful weapon to change the world. Jai Bhim!", roles: ["student", "teacher"] },
  "06-07": { name: "Eid ul-Adha", emoji: "🐑🌙🕌", quote: "May your sacrifices be appreciated and your prayers answered. Eid Mubarak!", roles: ["student", "teacher"] },
  "08-15": { name: "Independence Day", emoji: "🇮🇳🕊️", quote: "Freedom in mind, faith in words, pride in our heart. Happy Independence Day!", roles: ["student", "teacher"] },
  "08-16": { name: "Raksha Bandhan", emoji: "🎀💕🪢", quote: "Celebrating the beautiful bond of love and protection. Happy Raksha Bandhan!", roles: ["student", "teacher"] },
  "08-27": { name: "Ganesh Chaturthi", emoji: "🐘🪷🙏", quote: "May Lord Ganesha remove all obstacles and bless you with wisdom. Ganpati Bappa Morya!", roles: ["student", "teacher"] },
  "09-05": { name: "Teachers' Day", emoji: "👩‍🏫📚❤️", quote: "A teacher takes a hand, opens a mind and touches a heart. Happy Teachers' Day!", roles: ["teacher"] },
  "10-02": { name: "Gandhi Jayanti", emoji: "🕊️🇮🇳", quote: "Be the change you wish to see in the world. Happy Gandhi Jayanti!", roles: ["student", "teacher"] },
  "10-02": { name: "Navratri Begins", emoji: "🪔💃🔱", quote: "May Goddess Durga bless you with strength and wisdom. Happy Navratri!", roles: ["student", "teacher"] },
  "10-12": { name: "Dussehra", emoji: "🏹🔥✨", quote: "May good always triumph over evil. Happy Vijayadashami!", roles: ["student", "teacher"] },
  "10-20": { name: "Diwali", emoji: "🪔✨🎆", quote: "May the festival of lights illuminate your path to success and wisdom. Happy Diwali!", roles: ["student", "teacher"] },
  "10-21": { name: "Diwali", emoji: "🪔✨🎆", quote: "May the festival of lights illuminate your path to success and wisdom. Happy Diwali!", roles: ["student", "teacher"] },
  "11-01": { name: "Kannada Rajyotsava", emoji: "🏳️‍🌈❤️", quote: "Proud to be Kannadiga! Happy Kannada Rajyotsava! ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಶುಭಾಶಯಗಳು!", roles: ["student", "teacher"] },
  "11-14": { name: "Children's Day", emoji: "🧒🎈🌟", quote: "Every child is a different kind of flower that makes the world beautiful. Happy Children's Day!", roles: ["student"] },
  "11-15": { name: "Guru Nanak Jayanti", emoji: "🙏📿✨", quote: "May Guru Nanak Dev Ji's teachings guide you to the path of truth. Happy Gurpurab!", roles: ["student", "teacher"] },
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
    // SECURITY: Only the scheduled cron job (or an operator with the secret)
    // may trigger mass notification sends. Reject any caller without the
    // shared CRON_SECRET bearer token.
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Optional test-mode payload: bypass hour windows and dedup, optionally
    // restrict target to a single user. Used for manual verification only.
    let testMode = false;
    let testUserId: string | null = null;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => null);
        if (body && typeof body === "object") {
          testMode = body.test === true;
          if (typeof body.test_user_id === "string") testUserId = body.test_user_id;
        }
      }
    } catch { /* noop */ }

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

    // Get all student user IDs (shared for greeting + attendance reminder)
    let studentUserIds: string[] = [];
    if (testMode && testUserId) {
      studentUserIds = [testUserId];
    } else {
      const { data: studentRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      studentUserIds = (studentRoles || []).map((r: any) => r.user_id);
    }


    // Get profiles for names
    let nameMap: Record<string, string> = {};
    if (studentUserIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentUserIds);
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || "Student"; });
    }

    // Get FCM tokens for students
    let studentTokens: any[] = [];
    if (studentUserIds.length > 0) {
      const { data: tokens } = await adminClient
        .from("fcm_tokens")
        .select("*")
        .in("user_id", studentUserIds);
      studentTokens = tokens || [];
    }

    // Helper to send FCM + in-app notifications
    async function sendBatchNotifications(
      userIds: string[],
      tokens: any[],
      buildTitle: (uid: string) => string,
      buildBody: (uid: string) => string,
      type: string,
      dataUrl: string,
    ) {
      let sent = 0, failed = 0;
      const staleTokenIds: string[] = [];
      for (const tokenRec of tokens) {
        const title = buildTitle(tokenRec.user_id);
        const body = buildBody(tokenRec.user_id);
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
                  data: { url: dataUrl, click_action: "OPEN_ACTIVITY" },
                  android: { priority: "high", notification: { channel_id: "hdc_notifications", sound: "default" } },
                },
              }),
            }
          );
          if (fcmRes.ok) { sent++; } else {
            const errData = await fcmRes.json();
            failed++;
            if (errData?.error?.code === 404 || errData?.error?.code === 410 ||
                errData?.error?.details?.some?.((d: any) => d.errorCode === "UNREGISTERED")) {
              staleTokenIds.push(tokenRec.id);
            }
          }
        } catch { failed++; }
      }
      if (staleTokenIds.length > 0) {
        await adminClient.from("fcm_tokens").delete().in("id", staleTokenIds);
      }
      // In-app notifications
      const notifs = userIds.map((uid: string) => ({
        user_id: uid,
        title: buildTitle(uid),
        message: buildBody(uid),
        type,
        is_read: false,
      }));
      if (notifs.length > 0) {
        await adminClient.from("notifications").insert(notifs);
      }
      return { sent, failed };
    }

    // Today's date string for deduplication
    const todayStr = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;

    // Morning greeting (6-10 AM IST) — send only ONCE per day
    if ((testMode || (hour >= 6 && hour < 10)) && studentUserIds.length > 0 && studentTokens.length > 0) {
      // Check if greeting was already sent today (skipped in test mode)
      let alreadySent = false;
      if (!testMode) {
        const { data: existingGreeting } = await adminClient
          .from("notifications")
          .select("id")
          .eq("type", "greeting")
          .gte("created_at", todayStr + "T00:00:00+05:30")
          .lt("created_at", todayStr + "T23:59:59+05:30")
          .limit(1);
        alreadySent = !!(existingGreeting && existingGreeting.length > 0);
      }

      if (!alreadySent) {
        const res = await sendBatchNotifications(
          studentUserIds, studentTokens,
          (uid) => `${emoji} ${greeting}, ${(nameMap[uid] || "Student").split(" ")[0]}!`,
          () => "Have a great day ahead! Keep learning and stay focused. 📚✨",
          "greeting", "/dashboard/student",
        );
        sentCount = res.sent;
        failedCount = res.failed;
      } else {
        console.log("Morning greeting already sent today — skipping");
      }
    }

    // --- Attendance reminder (8-9 AM IST) — send only ONCE per day ---
    let attendanceSent = 0;
    if ((testMode || (hour >= 8 && hour < 9)) && studentUserIds.length > 0 && studentTokens.length > 0) {
      let alreadySent = false;
      if (!testMode) {
        const { data: existingAttReminder } = await adminClient
          .from("notifications")
          .select("id")
          .eq("type", "attendance_reminder")
          .gte("created_at", todayStr + "T00:00:00+05:30")
          .lt("created_at", todayStr + "T23:59:59+05:30")
          .limit(1);
        alreadySent = !!(existingAttReminder && existingAttReminder.length > 0);
      }

      if (!alreadySent) {
        const res = await sendBatchNotifications(
          studentUserIds, studentTokens,
          (uid) => `📋 Attendance Reminder, ${(nameMap[uid] || "Student").split(" ")[0]}!`,
          () => "Classes are about to begin! Make sure you attend all your classes today. Your attendance matters! 🎓📝",
          "attendance_reminder", "/dashboard/student/attendance",
        );
        attendanceSent = res.sent;
      } else {
        console.log("Attendance reminder already sent today — skipping");
      }
    }


    // --- Birthday notifications (7-9 AM IST) ---
    let birthdaySent = 0;
    const todayMonth = ist.getUTCMonth() + 1;
    const todayDate = ist.getUTCDate();

    if (hour >= 7 && hour < 9) {
      // Get birthday settings for personalized message
      const { data: bdaySettings } = await adminClient
        .from("birthday_settings")
        .select("*")
        .limit(1)
        .single();

      const principalName = bdaySettings?.principal_name || "Sri Gopal H.R";
      const wishesMessage = bdaySettings?.wishes_message || "On behalf of the entire Hoysala Degree College family, we wish you a wonderful birthday filled with joy, success, and happiness!";
      const bdayQuote = bdaySettings?.quote || "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.";

      // Find students with birthday today
      const { data: birthdayStudents } = await adminClient
        .from("students")
        .select("user_id, date_of_birth")
        .eq("is_active", true)
        .not("date_of_birth", "is", null);

      const birthdayStudentIds = (birthdayStudents || [])
        .filter((s: any) => {
          if (!s.date_of_birth) return false;
          const dob = new Date(s.date_of_birth);
          return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate;
        })
        .map((s: any) => s.user_id);

      // Combine all birthday user IDs
      const allBirthdayIds = [...birthdayStudentIds];

      if (allBirthdayIds.length > 0) {
        // Get profiles
        const { data: bdayProfiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allBirthdayIds);
        const bdayNameMap: Record<string, string> = {};
        (bdayProfiles || []).forEach((p: any) => { bdayNameMap[p.user_id] = p.full_name || "Dear"; });

        // Get FCM tokens
        const { data: bdayTokens } = await adminClient
          .from("fcm_tokens")
          .select("*")
          .in("user_id", allBirthdayIds);

        if (bdayTokens && bdayTokens.length > 0) {
          const res = await sendBatchNotifications(
            allBirthdayIds,
            bdayTokens,
            (uid) => `🎂🎉 Happy Birthday, ${(bdayNameMap[uid] || "Dear").split(" ")[0]}! 🥳🎈`,
            (uid) => `${wishesMessage}\n\n✨ "${bdayQuote}"\n\n— ${principalName}, Principal, Hoysala Degree College 🎓`,
            "birthday",
            "/dashboard",
          );
          birthdaySent = res.sent;
        } else {
          // Still insert in-app notifications even without FCM tokens
          const bdayNotifs = allBirthdayIds.map((uid: string) => ({
            user_id: uid,
            title: `🎂🎉 Happy Birthday, ${(bdayNameMap[uid] || "Dear").split(" ")[0]}! 🥳🎈`,
            message: `${wishesMessage}\n\n✨ "${bdayQuote}"\n\n— ${principalName}, Principal, Hoysala Degree College 🎓`,
            type: "birthday",
            is_read: false,
          }));
          await adminClient.from("notifications").insert(bdayNotifs);
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
        const festNameMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { festNameMap[p.user_id] = p.full_name || ""; });

        const { data: tokens } = await adminClient
          .from("fcm_tokens")
          .select("*")
          .in("user_id", festUserIds);

        if (tokens && tokens.length > 0) {
          const res = await sendBatchNotifications(
            festUserIds, tokens,
            (uid) => `${festival.emoji} Happy ${festival.name}, ${(festNameMap[uid] || "").split(" ")[0] || "Dear"}!`,
            () => festival.quote,
            "festival", "/dashboard",
          );
          festivalSent = res.sent;
        } else {
          const festNotifs = festUserIds.map((uid: string) => ({
            user_id: uid,
            title: `${festival.emoji} Happy ${festival.name}, ${(festNameMap[uid] || "").split(" ")[0] || "Dear"}!`,
            message: festival.quote,
            type: "festival",
            is_read: false,
          }));
          await adminClient.from("notifications").insert(festNotifs);
        }
      }
    }

    // --- Exam reminder notifications (evening before exam, 6-8 PM IST) ---
    let examReminderSent = 0;
    if (hour >= 18 && hour < 20) {
      // Get tomorrow's date in IST
      const tomorrow = new Date(ist.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;

      // Find exams scheduled for tomorrow
      const { data: upcomingExams } = await adminClient
        .from("exams")
        .select("*")
        .eq("exam_date", tomorrowStr)
        .eq("is_active", true);

      if (upcomingExams && upcomingExams.length > 0) {
        for (const exam of upcomingExams) {
          // Get target students based on course_id and semester
          let studentQuery = adminClient.from("students").select("user_id").eq("is_active", true);
          if (exam.course_id) studentQuery = studentQuery.eq("course_id", exam.course_id);
          if (exam.semester) studentQuery = studentQuery.eq("semester", exam.semester);
          const { data: targetStudents } = await studentQuery;
          const targetIds = (targetStudents || []).map((s: any) => s.user_id);

          if (targetIds.length > 0) {
            // Get names
            const { data: examProfiles } = await adminClient
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", targetIds);
            const examNameMap: Record<string, string> = {};
            (examProfiles || []).forEach((p: any) => { examNameMap[p.user_id] = p.full_name || "Student"; });

            // Get tokens
            const { data: examTokens } = await adminClient
              .from("fcm_tokens")
              .select("*")
              .in("user_id", targetIds);

            const examTitle = exam.title || exam.subject;
            const examType = exam.exam_type === "internal" ? "Internal" : exam.exam_type === "external" ? "External" : exam.exam_type;

            const res = await sendBatchNotifications(
              targetIds,
              examTokens || [],
              (uid) => `📝🔔 Exam Tomorrow, ${(examNameMap[uid] || "Student").split(" ")[0]}!`,
              () => `Your ${examType} exam "${examTitle}" (${exam.subject}) is scheduled for tomorrow! Revise well and get a good night's sleep. Best of luck! 📚💪✨`,
              "exam_reminder",
              "/dashboard/student/marks",
            );
            examReminderSent += res.sent;
          }
        }
      }
    }

    // --- Fee payment reminder (10-12 AM IST, daily) ---
    let feeReminderSent = 0;
    if (hour >= 10 && hour < 12) {
      const todayISO = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;
      const in7Days = new Date(ist.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in7DaysISO = `${in7Days.getUTCFullYear()}-${String(in7Days.getUTCMonth() + 1).padStart(2, "0")}-${String(in7Days.getUTCDate()).padStart(2, "0")}`;

      // Find students with fee_due_date within next 7 days and outstanding balance
      const { data: dueSoonStudents } = await adminClient
        .from("students")
        .select("user_id, total_fee, fee_paid, fee_due_date")
        .eq("is_active", true)
        .not("fee_due_date", "is", null)
        .gte("fee_due_date", todayISO)
        .lte("fee_due_date", in7DaysISO);

      const studentsWithDues = (dueSoonStudents || []).filter((s: any) => {
        const due = (s.total_fee || 0) - (s.fee_paid || 0);
        return due > 0;
      });

      if (studentsWithDues.length > 0) {
        const feeUserIds = studentsWithDues.map((s: any) => s.user_id);
        const feeBalanceMap: Record<string, { balance: number; dueDate: string }> = {};
        studentsWithDues.forEach((s: any) => {
          feeBalanceMap[s.user_id] = {
            balance: (s.total_fee || 0) - (s.fee_paid || 0),
            dueDate: s.fee_due_date,
          };
        });

        const { data: feeProfiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", feeUserIds);
        const feeNameMap: Record<string, string> = {};
        (feeProfiles || []).forEach((p: any) => { feeNameMap[p.user_id] = p.full_name || "Student"; });

        const { data: feeTokens } = await adminClient
          .from("fcm_tokens")
          .select("*")
          .in("user_id", feeUserIds);

        const res = await sendBatchNotifications(
          feeUserIds,
          feeTokens || [],
          (uid) => `💰 Fee Payment Reminder, ${(feeNameMap[uid] || "Student").split(" ")[0]}!`,
          (uid) => {
            const info = feeBalanceMap[uid];
            const daysLeft = Math.ceil((new Date(info.dueDate).getTime() - new Date(todayISO).getTime()) / (24 * 60 * 60 * 1000));
            return `Your fee balance of ₹${info.balance.toLocaleString("en-IN")} is due ${daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`}! Please clear your dues to avoid late fees. 🏫📋`;
          },
          "fee_reminder",
          "/dashboard/student/fees",
        );
        feeReminderSent = res.sent;
      }
    }

    // --- Weekly attendance summary (Sunday 10-12 AM IST) ---
    let weeklySummarySent = 0;
    const dayOfWeek = ist.getUTCDay(); // 0 = Sunday
    if (dayOfWeek === 0 && hour >= 10 && hour < 12 && studentUserIds.length > 0) {
      // Calculate date range: past 7 days
      const weekAgo = new Date(ist.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStr = `${weekAgo.getUTCFullYear()}-${String(weekAgo.getUTCMonth() + 1).padStart(2, "0")}-${String(weekAgo.getUTCDate()).padStart(2, "0")}`;
      const todayStr = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`;

      // Get all student records to map user_id -> student id
      const { data: allStudents } = await adminClient
        .from("students")
        .select("id, user_id")
        .eq("is_active", true)
        .in("user_id", studentUserIds);

      const studentIdToUserId: Record<string, string> = {};
      const userIdToStudentId: Record<string, string> = {};
      (allStudents || []).forEach((s: any) => {
        studentIdToUserId[s.id] = s.user_id;
        userIdToStudentId[s.user_id] = s.id;
      });
      const studentIds = Object.keys(studentIdToUserId);

      if (studentIds.length > 0) {
        // Fetch attendance for the week
        const { data: weekAttendance } = await adminClient
          .from("attendance")
          .select("student_id, status")
          .in("student_id", studentIds)
          .gte("date", weekAgoStr)
          .lte("date", todayStr);

        // Calculate per-student stats
        const statsMap: Record<string, { total: number; present: number }> = {};
        (weekAttendance || []).forEach((a: any) => {
          if (!statsMap[a.student_id]) statsMap[a.student_id] = { total: 0, present: 0 };
          statsMap[a.student_id].total++;
          if (a.status === "present") statsMap[a.student_id].present++;
        });

        // Build notifications per student
        const weeklyUserIds: string[] = [];
        const weeklyBodyMap: Record<string, string> = {};

        for (const uid of studentUserIds) {
          const sid = userIdToStudentId[uid];
          if (!sid) continue;
          const stats = statsMap[sid];
          const firstName = (nameMap[uid] || "Student").split(" ")[0];

          if (!stats || stats.total === 0) {
            weeklyUserIds.push(uid);
            weeklyBodyMap[uid] = `No attendance records found this week. Make sure to attend all classes regularly! 📚`;
          } else {
            const pct = Math.round((stats.present / stats.total) * 100);
            const emoji = pct >= 75 ? "🟢" : pct >= 50 ? "🟡" : "🔴";
            const encouragement = pct >= 90
              ? "Outstanding! Keep up the excellent attendance! 🌟"
              : pct >= 75
              ? "Good job! Maintain your consistency. 💪"
              : pct >= 50
              ? "Your attendance needs improvement. Aim for 75%+ next week! ⚠️"
              : "Critical! Your attendance is very low. Please attend classes regularly. 🚨";
            weeklyUserIds.push(uid);
            weeklyBodyMap[uid] = `${emoji} Weekly Attendance: ${pct}% (${stats.present}/${stats.total} classes)\n${encouragement}`;
          }
        }

        if (weeklyUserIds.length > 0) {
          const weeklyTokens = studentTokens.filter((t: any) => weeklyUserIds.includes(t.user_id));
          const res = await sendBatchNotifications(
            weeklyUserIds,
            weeklyTokens,
            (uid) => `📊 Weekly Attendance Summary, ${(nameMap[uid] || "Student").split(" ")[0]}!`,
            (uid) => weeklyBodyMap[uid],
            "weekly_summary",
            "/dashboard/student/attendance",
          );
          weeklySummarySent = res.sent;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        daily_greeting_sent: sentCount,
        daily_greeting_failed: failedCount,
        attendance_reminder_sent: attendanceSent,
        birthday_sent: birthdaySent,
        exam_reminder_sent: examReminderSent,
        fee_reminder_sent: feeReminderSent,
        weekly_summary_sent: weeklySummarySent,
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
