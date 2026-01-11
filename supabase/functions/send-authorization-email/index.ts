import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Buffer } from "node:buffer";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

const resend = new Resend(resendApiKey);
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthorizationEmailRequest {
  estimation_id: string;
}

const roleLabels: Record<string, string> = {
  contratista: "Contratista",
  residente: "Residente",
  superintendente: "Superintendente",
  lider_proyecto: "Líder de Proyecto",
  compras: "Compras",
  finanzas: "Finanzas",
  pagos: "Pagos",
  soporte_tecnico: "Soporte Técnico",
};

// Verify authentication and return user ID
const verifyAuth = async (req: Request): Promise<{ userId: string | null; error?: string }> => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { userId: null, error: 'Missing authorization header' };
  }

  const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { userId, error: authError } = await verifyAuth(req);
  if (!userId) {
    console.log("Authentication failed:", authError);
    return new Response(
      JSON.stringify({ error: authError || 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { estimation_id }: AuthorizationEmailRequest = await req.json();

    if (!estimation_id) {
      throw new Error("Missing estimation_id");
    }

    console.log(`Processing authorization email for estimation: ${estimation_id} by user: ${userId}`);

    // Verify user has access to this estimation (is project member)
    const { data: memberCheck, error: memberError } = await supabaseAdmin
      .from("project_members")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", (
        await supabaseAdmin
          .from("estimations")
          .select("project_id")
          .eq("id", estimation_id)
          .single()
      ).data?.project_id)
      .limit(1);

    if (memberError || !memberCheck || memberCheck.length === 0) {
      return new Response(
        JSON.stringify({ error: "Access denied - not a project member" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch Estimation Details
    const { data: estimation, error: estError } = await supabaseAdmin
      .from("estimations")
      .select(`
        *,
        cost_centers (code, name),
        projects (name)
      `)
      .eq("id", estimation_id)
      .single();

    if (estError || !estimation) {
      throw new Error(`Error fetching estimation: ${estError?.message}`);
    }

    // 2. Fetch Latest Approval (Who authorized)
    const { data: history, error: historyError } = await supabaseAdmin
      .from("approval_history")
      .select(`
        role,
        user_id,
        user_name
      `)
      .eq("estimation_id", estimation_id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (historyError) {
      console.warn("Could not fetch approval history, using 'Sistema'");
    }

    // Get name from user_name column or fallback
    const approverName = history?.user_name || "Sistema";
    const approverRole = history?.role ? roleLabels[history.role] : "Sistema";

    // 3. Download PDF using file path (not URL)
    let attachments: any[] = [];

    // Helper function to attach file
    const attachFile = async (urlOrPath: string, defaultName: string) => {
      try {
        // Extract file path from URL or use directly if it's already a path
        // If it's a public URL, we might need to be careful, but the storage download expects a path.
        // Assuming urlOrPath is stored as "path/to/file" or "file.pdf" (if root) or public URL ending in file name.
        // If it is a full public URL, getting the path inside the bucket is tricky without parsing.
        // However, the current codebase seems to store:
        // - pdf_url: "filename.pdf" (root) in createEstimation
        // - invoice_url: "publicUrl" in uploadInvoice. This is a problem for download().

        let storagePath = urlOrPath;

        // If it looks like a URL, try to extract the path after the bucket name ("estimations")
        if (urlOrPath.startsWith('http')) {
             const urlParts = urlOrPath.split('/estimations/');
             if (urlParts.length > 1) {
                 storagePath = urlParts[1]; // "project/id/file.pdf"
             }
        }

        const { data: fileData, error: fileError } = await supabaseAdmin.storage
          .from("estimations")
          .download(storagePath);

        if (fileError) {
             console.error(`Error downloading ${defaultName}:`, fileError);
             return;
        }

        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);

          // Determine filename from path
          const filename = storagePath.split('/').pop() || defaultName;

          attachments.push({
            filename: filename,
            content: Buffer.from(buffer),
          });
        }
      } catch (err) {
        console.error(`Error processing attachment ${defaultName}:`, err);
      }
    };

    // Attach Evidence PDF
    if (estimation.pdf_url) {
        await attachFile(estimation.pdf_url, "estimacion.pdf");
    }

    // Attach Invoice PDF if available and relevant
    // Statuses where invoice should be present: factura_subida, validated_finanzas, paid
    const invoiceStatuses = ['factura_subida', 'validated_finanzas', 'paid'];
    if (invoiceStatuses.includes(estimation.status) && estimation.invoice_url) {
        await attachFile(estimation.invoice_url, "factura.pdf");
    }

    // Attach Invoice XML if available
    if (invoiceStatuses.includes(estimation.status) && estimation.invoice_xml_url) {
        await attachFile(estimation.invoice_xml_url, "factura.xml");
    }

    // 4. Determine Recipients
    let targetRole: string | null = null;
    let subjectPrefix = "AUTORIZACIÓN REQUERIDA";

    switch (estimation.status) {
      case "registered":
        targetRole = "residente";
        break;
      case "auth_resident":
        targetRole = "superintendente";
        subjectPrefix = "PRE-ESTIMACIÓN AUTORIZADA POR RESIDENTE";
        break;
      case "auth_super":
        targetRole = "lider_proyecto";
        subjectPrefix = "PRE-ESTIMACIÓN AUTORIZADA POR SUPERINTENDENTE";
        break;
      case "auth_leader":
        targetRole = "compras";
        subjectPrefix = "ESTIMACIÓN AUTORIZADA POR LÍDER";
        break;
      case "validated_compras":
        targetRole = "contratista";
        subjectPrefix = "ESTIMACIÓN VALIDADA POR COMPRAS";
        break;
      case "factura_subida":
        targetRole = "finanzas";
        subjectPrefix = "FACTURA SUBIDA - REQUIERE VALIDACIÓN";
        break;
      case "validated_finanzas":
        targetRole = "pagos";
        subjectPrefix = "ESTIMACIÓN VALIDADA POR FINANZAS";
        break;
      case "paid":
        targetRole = "contratista";
        subjectPrefix = "ESTIMACIÓN PAGADA";
        break;
    }

    const recipients: string[] = [];

    if (targetRole) {
      if (targetRole === 'contratista') {
        const { data: creator } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', estimation.created_by)
          .single();
        if (creator?.email) recipients.push(creator.email);
      } else {
        const { data: members } = await supabaseAdmin
          .from('project_members')
          .select('user_id, profiles(email)')
          .eq('project_id', estimation.project_id)
          .eq('role', targetRole);

        members?.forEach((m: any) => {
          if (m.profiles?.email) recipients.push(m.profiles.email);
        });
      }
    }

    // Always include 'soporte_tecnico' users for global oversight
    try {
        const { data: supportMembers } = await supabaseAdmin
          .from('project_members')
          .select('profiles(email)')
          .eq('project_id', estimation.project_id)
          .eq('role', 'soporte_tecnico');

        supportMembers?.forEach((m: any) => {
          if (m.profiles?.email) recipients.push(m.profiles.email);
        });
    } catch (e) {
        console.error("Error fetching support members:", e);
    }

    const uniqueRecipients = [...new Set(recipients)];

    if (uniqueRecipients.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No recipients found" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f3f4f6; padding: 20px;">
          <h2 style="color: #1e3a8a; margin-top: 0;">${subjectPrefix}</h2>

          <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p><strong>Proyecto:</strong> ${estimation.projects?.name || estimation.project_number}</p>
            <p><strong>Número de pedido (Centro de Costos):</strong> ${estimation.cost_centers?.code || estimation.cost_center_id} - ${estimation.cost_centers?.name || ''}</p>
            <p><strong>Número de folio:</strong> ${estimation.folio}</p>
            <p><strong>Texto descriptivo:</strong> ${estimation.estimation_text || 'Sin descripción'}</p>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

            <p style="font-size: 0.9em; color: #666;">
              Autorizado por: <strong>${approverName}</strong> (${approverRole})
            </p>

            <div style="margin-top: 20px;">
              <a href="${req.headers.get("origin") || "https://app.estimaciones.com"}/estimaciones" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Ver estimación
              </a>
            </div>
          </div>

          <p style="font-size: 0.8em; color: #888; text-align: center; margin-top: 20px;">
            Este es un correo automático. Por favor no respondas a este mensaje.
          </p>
        </div>
      </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: "Estimaciones <onboarding@resend.dev>",
      to: uniqueRecipients,
      subject: `${subjectPrefix} - Folio: ${estimation.folio}`,
      html: emailHtml,
      attachments: attachments,
    });

    console.log("Email sent successfully to:", uniqueRecipients);

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-authorization-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
