import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role - only staff can send receipts
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (!roleData || !["admin", "principal", "teacher"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HTML escape helper to prevent injection in email templates
    function escapeHtml(str: string): string {
      if (!str) return "";
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    const body = await req.json();
    const studentEmail = body.studentEmail;
    const studentName = escapeHtml(body.studentName || "");
    const receiptNumber = escapeHtml(body.receiptNumber || "");
    const amount = body.amount;
    const paymentMethod = escapeHtml(body.paymentMethod || "Cash");
    const courseName = escapeHtml(body.courseName || "");
    const rollNumber = escapeHtml(body.rollNumber || "");
    const remarks = escapeHtml(body.remarks || "");
    const date = escapeHtml(body.date || new Date().toLocaleDateString());
    const semester = body.semester;

    if (!studentEmail || !amount || !receiptNumber) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not found");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;">
        <div style="max-width:520px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg, #0a1628 0%, #1a3a6e 60%, #0a1628 100%);padding:36px 32px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">🎓</div>
            <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">Hoysala Degree College</h1>
            <p style="color:rgba(255,255,255,0.5);margin:6px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Official Payment Receipt</p>
          </div>
          
          <div style="padding:24px 32px 0;">
            <div style="background:linear-gradient(135deg, #dcfce7, #f0fdf4);border:2px solid #86efac;border-radius:16px;padding:20px;text-align:center;">
              <div style="font-size:32px;margin-bottom:4px;">✅</div>
              <p style="font-size:11px;color:#16a34a;margin:0 0 4px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Payment Successful</p>
              <p style="font-size:36px;font-weight:900;color:#16a34a;margin:0;letter-spacing:-1px;">₹${Number(amount).toLocaleString()}</p>
            </div>
          </div>

          <div style="padding:24px 32px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Receipt No</td>
                <td style="padding:12px 0;text-align:right;font-weight:700;color:#0f172a;font-size:14px;letter-spacing:0.5px;">${receiptNumber}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Student</td>
                <td style="padding:12px 0;text-align:right;font-weight:700;color:#0f172a;">${studentName || "—"}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Roll Number</td>
                <td style="padding:12px 0;text-align:right;font-weight:700;color:#0f172a;">${rollNumber || "—"}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Course</td>
                <td style="padding:12px 0;text-align:right;font-weight:700;color:#0f172a;">${courseName || "—"}</td>
              </tr>
              ${semester ? `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Semester</td>
                <td style="padding:12px 0;text-align:right;font-weight:700;color:#0f172a;">Semester ${semester}</td>
              </tr>` : ""}
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Payment Method</td>
                <td style="padding:12px 0;text-align:right;font-weight:700;color:#0f172a;">${paymentMethod || "Cash"}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Date</td>
                <td style="padding:12px 0;text-align:right;font-weight:700;color:#0f172a;">${date || new Date().toLocaleDateString()}</td>
              </tr>
              ${remarks ? `<tr>
                <td style="padding:12px 0;color:#64748b;font-size:13px;">Remarks</td>
                <td style="padding:12px 0;text-align:right;font-weight:600;color:#0f172a;">${remarks}</td>
              </tr>` : ""}
            </table>
          </div>

          <div style="text-align:center;padding:20px 32px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="font-size:11px;color:#94a3b8;margin:0;">This is an auto-generated receipt from Hoysala Degree College.</p>
            <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;">Please keep this for your records.</p>
            <p style="font-size:10px;color:#cbd5e1;margin:12px 0 0;">📞 7676272167 | 📧 principal.hoysaladegreecollege@gmail.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailSubject = `Payment Receipt - ${receiptNumber} | ₹${Number(amount).toLocaleString()}`;

    // Try sending to student first
    let res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hoysala Degree College <onboarding@resend.dev>",
        to: [studentEmail],
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    let resData = await res.json();

    // If Resend free-tier blocks sending to non-owner emails, fall back to owner email
    if (!res.ok && resData?.statusCode === 403) {
      console.log("Resend free-tier restriction: falling back to owner email");
      const fallbackNote = `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin:0 32px 16px;font-size:12px;color:#92400e;">
        <strong>Note:</strong> This receipt is for student <strong>${studentName}</strong> (${studentEmail}). Domain not verified on Resend — receipt sent to admin email instead.
      </div>`;
      const fallbackHtml = htmlContent.replace('</div>\n          \n          <div style="padding:24px 32px 0;">', '</div>' + fallbackNote + '<div style="padding:24px 32px 0;">');

      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Hoysala Degree College <onboarding@resend.dev>",
          to: ["hoysaladegreecollege@gmail.com"],
          subject: `[For ${studentName}] ${emailSubject}`,
          html: fallbackHtml,
        }),
      });
      resData = await res.json();
    }

    if (!res.ok) {
      console.error("Resend error:", resData);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
