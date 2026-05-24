// Principal AI Insights — hybrid: SQL-based risk math + Lovable AI narrative
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type RiskStudent = {
  id: string;
  name: string;
  roll: string;
  course: string;
  semester: number | null;
  attendancePct: number;
  avgMark: number | null;
  feeDue: number;
  score: number;
  level: "High" | "Medium" | "Low";
  reasons: string[];
};

async function ensurePrincipal(authHeader: string | null): Promise<{ ok: boolean; userId?: string }> {
  if (!authHeader) return { ok: false };
  const token = authHeader.replace("Bearer ", "");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return { ok: false };
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const allowed = (roles || []).some((r: any) => r.role === "principal" || r.role === "admin");
  return { ok: allowed, userId: user.id };
}

async function computeInsights(admin: any) {
  // Pull base data
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceISO = since.toISOString().slice(0, 10);

  const [studentsRes, attendanceRes, marksRes, paymentsRes, semFeesRes, coursesRes, complaintsRes] = await Promise.all([
    admin.from("students").select("id,user_id,roll_number,course_id,semester,is_active").eq("is_active", true),
    admin.from("attendance").select("student_id,status,date").gte("date", sinceISO),
    admin.from("marks").select("student_id,obtained_marks,max_marks,subject,course_id,semester"),
    admin.from("fee_payments").select("student_id,amount,payment_date,semester"),
    admin.from("semester_fees").select("student_id,semester,fee_amount,due_date"),
    admin.from("courses").select("id,name,code"),
    admin.from("feedback_complaints").select("id,status,created_at,category").gte("created_at", since.toISOString()),
  ]);

  const students = studentsRes.data || [];
  const attendance = attendanceRes.data || [];
  const marks = marksRes.data || [];
  const payments = paymentsRes.data || [];
  const semFees = semFeesRes.data || [];
  const courses = coursesRes.data || [];
  const complaints = complaintsRes.data || [];

  // Profile names
  const userIds = students.map((s: any) => s.user_id).filter(Boolean);
  let nameMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: profs } = await admin.from("profiles").select("user_id,full_name").in("user_id", userIds);
    nameMap = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.full_name]));
  }
  const courseMap = Object.fromEntries(courses.map((c: any) => [c.id, c.code || c.name]));

  // Per-student aggregates
  const attBy: Record<string, { p: number; total: number }> = {};
  for (const a of attendance) {
    const k = a.student_id;
    if (!attBy[k]) attBy[k] = { p: 0, total: 0 };
    attBy[k].total++;
    if (a.status === "present") attBy[k].p++;
  }

  const marksBy: Record<string, { sum: number; max: number; n: number }> = {};
  for (const m of marks) {
    const k = m.student_id;
    if (!marksBy[k]) marksBy[k] = { sum: 0, max: 0, n: 0 };
    marksBy[k].sum += m.obtained_marks || 0;
    marksBy[k].max += m.max_marks || 0;
    marksBy[k].n++;
  }

  const paidBy: Record<string, number> = {};
  for (const p of payments) {
    paidBy[p.student_id] = (paidBy[p.student_id] || 0) + Number(p.amount || 0);
  }
  const dueBy: Record<string, number> = {};
  for (const f of semFees) {
    dueBy[f.student_id] = (dueBy[f.student_id] || 0) + Number(f.fee_amount || 0);
  }

  const riskStudents: RiskStudent[] = students.map((s: any) => {
    const att = attBy[s.id];
    const attPct = att && att.total ? Math.round((att.p / att.total) * 100) : 100;
    const mk = marksBy[s.id];
    const avgPct = mk && mk.max ? (mk.sum / mk.max) * 100 : null;
    const due = (dueBy[s.id] || 0) - (paidBy[s.id] || 0);
    const reasons: string[] = [];
    let score = 0;
    if (attPct < 60) { score += 45; reasons.push(`Attendance ${attPct}%`); }
    else if (attPct < 75) { score += 25; reasons.push(`Attendance ${attPct}%`); }
    if (avgPct !== null) {
      if (avgPct < 35) { score += 35; reasons.push(`Avg marks ${avgPct.toFixed(0)}%`); }
      else if (avgPct < 50) { score += 18; reasons.push(`Avg marks ${avgPct.toFixed(0)}%`); }
    }
    if (due > 0) {
      if (due > 30000) { score += 25; reasons.push(`Fee due ₹${due.toLocaleString("en-IN")}`); }
      else { score += 12; reasons.push(`Fee due ₹${due.toLocaleString("en-IN")}`); }
    }
    const level: RiskStudent["level"] = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";
    return {
      id: s.id,
      name: nameMap[s.user_id] || "Student",
      roll: s.roll_number,
      course: courseMap[s.course_id] || "—",
      semester: s.semester,
      attendancePct: attPct,
      avgMark: avgPct === null ? null : Math.round(avgPct),
      feeDue: due,
      score,
      level,
      reasons,
    };
  });

  // Dept-wise exam fail predictor (by course code, internal exam_type)
  const courseFail: Record<string, { fail: number; total: number }> = {};
  for (const m of marks) {
    const code = courseMap[m.course_id] || "OTHER";
    if (!courseFail[code]) courseFail[code] = { fail: 0, total: 0 };
    courseFail[code].total++;
    if (m.max_marks && (m.obtained_marks / m.max_marks) * 100 < 40) courseFail[code].fail++;
  }
  const examPredictor = Object.entries(courseFail).map(([code, v]) => ({
    code,
    failRate: v.total ? Math.round((v.fail / v.total) * 100) : 0,
    sample: v.total,
  })).sort((a, b) => b.failRate - a.failRate);

  // Today attendance
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.filter((a: any) => a.date === today);
  const todayPct = todayAtt.length ? Math.round((todayAtt.filter((a: any) => a.status === "present").length / todayAtt.length) * 100) : 0;

  // Last 7d vs prior 7d attendance for anomaly
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const todayD = new Date();
  const last7Start = new Date(todayD); last7Start.setDate(todayD.getDate() - 6);
  const prev7End = new Date(last7Start); prev7End.setDate(last7Start.getDate() - 1);
  const prev7Start = new Date(prev7End); prev7Start.setDate(prev7End.getDate() - 6);
  const inRange = (d: string, a: Date, b: Date) => d >= dayKey(a) && d <= dayKey(b);
  const last7 = attendance.filter((a: any) => inRange(a.date, last7Start, todayD));
  const prev7 = attendance.filter((a: any) => inRange(a.date, prev7Start, prev7End));
  const pct = (arr: any[]) => arr.length ? (arr.filter(a => a.status === "present").length / arr.length) * 100 : 0;
  const last7Pct = pct(last7), prev7Pct = pct(prev7);
  const attDelta = Math.round((last7Pct - prev7Pct) * 10) / 10;

  // Anomaly alerts
  const anomalies: { severity: "high" | "medium" | "low"; title: string; detail: string }[] = [];
  if (attDelta <= -8) anomalies.push({ severity: "high", title: "Attendance dropped sharply", detail: `${Math.abs(attDelta)}% lower than prior week` });
  else if (attDelta <= -3) anomalies.push({ severity: "medium", title: "Attendance trending down", detail: `${Math.abs(attDelta)}% lower than prior week` });

  const newComplaints = complaints.filter((c: any) => c.status === "pending" || c.status === "new").length;
  if (newComplaints >= 10) anomalies.push({ severity: "high", title: "Complaints spike", detail: `${newComplaints} open complaints in the last 30 days` });
  else if (newComplaints >= 5) anomalies.push({ severity: "medium", title: "Rising complaints", detail: `${newComplaints} open complaints recently` });

  const highRisk = riskStudents.filter(r => r.level === "High").length;
  if (highRisk >= 10) anomalies.push({ severity: "high", title: "High-risk student cluster", detail: `${highRisk} students flagged High risk` });

  // Aggregate stats for AI prompt
  const totalDue = riskStudents.reduce((s, r) => s + Math.max(0, r.feeDue), 0);
  const totalPaid = Object.values(paidBy).reduce((s: number, v: number) => s + v, 0);
  const summaryStats = {
    students: students.length,
    todayAttendancePct: todayPct,
    weeklyAttendancePct: Math.round(last7Pct),
    attendanceDeltaPct: attDelta,
    highRisk,
    mediumRisk: riskStudents.filter(r => r.level === "Medium").length,
    feeCollected: Math.round(totalPaid),
    feePending: Math.round(totalDue),
    openComplaints: newComplaints,
    topFailingCourses: examPredictor.slice(0, 3),
  };

  return { riskStudents, examPredictor, anomalies, summaryStats };
}

async function callAI(systemPrompt: string, userPrompt: string, schema?: any) {
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (schema) {
    body.tools = [{ type: "function", function: schema }];
    body.tool_choice = { type: "function", function: { name: schema.name } };
  }
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI ${r.status}: ${t}`);
  }
  const json = await r.json();
  if (schema) {
    const tc = json.choices?.[0]?.message?.tool_calls?.[0];
    return JSON.parse(tc?.function?.arguments || "{}");
  }
  return json.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    const guard = await ensurePrincipal(auth);
    if (!guard.ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action = "insights", query = "" } = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (action === "search") {
      // Natural-language search → structured filters → query DB
      const filters = await callAI(
        "You convert principal queries into structured filters for a college DB. Only return filters present in the request.",
        `Query: "${query}"`,
        {
          name: "extract_filters",
          description: "Extract filter criteria for student/teacher/course search",
          parameters: {
            type: "object",
            properties: {
              entity: { type: "string", enum: ["student", "teacher", "course", "complaint"] },
              course_code: { type: "string" },
              semester: { type: "number" },
              attendance_below: { type: "number" },
              fee_due_above: { type: "number" },
              joined_year: { type: "number" },
              search_text: { type: "string" },
            },
            required: ["entity"],
            additionalProperties: false,
          },
        }
      );

      const insights = await computeInsights(admin);
      let results: any[] = [];
      if (filters.entity === "student") {
        results = insights.riskStudents.filter(r => {
          if (filters.course_code && r.course?.toLowerCase() !== filters.course_code.toLowerCase()) return false;
          if (filters.semester && r.semester !== filters.semester) return false;
          if (filters.attendance_below && r.attendancePct >= filters.attendance_below) return false;
          if (filters.fee_due_above && r.feeDue < filters.fee_due_above) return false;
          if (filters.search_text) {
            const q = filters.search_text.toLowerCase();
            if (!r.name.toLowerCase().includes(q) && !r.roll.toLowerCase().includes(q)) return false;
          }
          return true;
        }).slice(0, 50);
      } else if (filters.entity === "teacher") {
        const { data: teachers } = await admin.from("teachers").select("id,user_id,employee_id,created_at,is_active");
        const ids = (teachers || []).map((t: any) => t.user_id);
        const { data: profs } = await admin.from("profiles").select("user_id,full_name,email").in("user_id", ids);
        const pm = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p]));
        results = (teachers || []).filter((t: any) => {
          if (filters.joined_year) {
            const y = new Date(t.created_at).getFullYear();
            if (y !== filters.joined_year) return false;
          }
          if (filters.search_text) {
            const q = filters.search_text.toLowerCase();
            const p = pm[t.user_id];
            if (!p?.full_name?.toLowerCase().includes(q) && !p?.email?.toLowerCase().includes(q)) return false;
          }
          return true;
        }).map((t: any) => ({ id: t.id, name: pm[t.user_id]?.full_name || "—", email: pm[t.user_id]?.email, employee_id: t.employee_id, joined: t.created_at }));
      } else if (filters.entity === "course") {
        const { data: c } = await admin.from("courses").select("id,name,code,duration");
        results = c || [];
      }

      return new Response(JSON.stringify({ filters, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default: full insights with AI narrative
    const insights = await computeInsights(admin);

    const aiOutput = await callAI(
      "You are an executive briefing AI for a college Principal. Be concise, actionable, and specific. Never invent numbers.",
      `Generate a daily briefing and 4 actionable recommendations from these stats:\n${JSON.stringify(insights.summaryStats)}`,
      {
        name: "daily_briefing",
        description: "Generate principal briefing with summary and recommendations",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "2-3 sentence executive briefing" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  detail: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["title", "detail", "priority"],
              },
            },
          },
          required: ["summary", "recommendations"],
          additionalProperties: false,
        },
      }
    );

    return new Response(
      JSON.stringify({
        summary: aiOutput.summary,
        recommendations: aiOutput.recommendations || [],
        anomalies: insights.anomalies,
        stats: insights.summaryStats,
        riskStudents: insights.riskStudents.sort((a, b) => b.score - a.score).slice(0, 100),
        examPredictor: insights.examPredictor,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-insights error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
