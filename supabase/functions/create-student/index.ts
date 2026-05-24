import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS }); return false; }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (callerRole?.role !== "admin") throw new Error("Only admin can create students");

    const body = await req.json();
    const { email, password, full_name, phone, date_of_birth, roll_number, course_id, year_level, semester, admission_year, father_name, mother_name, parent_phone, address, aadhaar_number, nationality, religion, caste, category, blood_group, gender } = body;

    if (!email || !password || !full_name) throw new Error("Email, password, and full name are required");

    // Create auth user with email confirmed
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "student" },
    });
    if (createError) throw createError;
    if (!authData.user) throw new Error("Failed to create user");

    const userId = authData.user.id;

    // Wait for handle_new_user trigger to create profile/student/role records
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update student record with all details
    const studentUpdate: Record<string, any> = {
      phone: phone || "",
      parent_phone: parent_phone || "",
      father_name: father_name || "",
      mother_name: mother_name || "",
      address: address || "",
      date_of_birth: date_of_birth || null,
      semester: parseInt(semester) || 1,
      year_level: parseInt(year_level) || 1,
      admission_year: parseInt(admission_year) || new Date().getFullYear(),
      nationality: nationality || "Indian",
      blood_group: blood_group || "",
      gender: gender || "",
    };
    if (roll_number) studentUpdate.roll_number = roll_number;
    if (course_id) studentUpdate.course_id = course_id;

    const { data: studentRow, error: studentError } = await adminClient
      .from("students")
      .update(studentUpdate)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (studentError) {
      console.error("Student update error:", studentError);
      throw new Error(`Failed to update student details: ${studentError.message}`);
    }

    // Store sensitive identifiers in protected table
    if (studentRow?.id) {
      const { error: sensError } = await adminClient
        .from("student_sensitive_data")
        .upsert({
          student_id: studentRow.id,
          aadhaar_number: aadhaar_number || null,
          religion: religion || null,
          caste: caste || null,
          category: category || null,
        }, { onConflict: "student_id" });
      if (sensError) console.error("Sensitive data upsert error:", sensError);
    }

    // Update profile with phone
    if (phone) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ phone })
        .eq("user_id", userId);
      if (profileError) console.error("Profile phone update error:", profileError);
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Create student error:", error);
    const msg = error.message || "";
    const safeMessage = msg.includes("Unauthorized") || msg.includes("No auth header")
      ? "Unauthorized"
      : msg.includes("Only admin")
      ? "Insufficient permissions"
      : msg.includes("already been registered") || msg.includes("already exists")
      ? "A user with this email already exists"
      : msg;
    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
