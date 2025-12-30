import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Buffer } from "node:buffer";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const resend = new Resend(resendApiKey);
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estimation_id }: AuthorizationEmailRequest = await req.json();

    if (!estimation_id) {
      throw new Error("Missing estimation_id");
    }

    console.log(`Processing authorization email for estimation: ${estimation_id}`);

    // 1. Fetch Estimation Details
    const { data: estimation, error: estError } = await supabase
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
    // Join with profiles to get the real name as requested
    const { data: history, error: historyError } = await supabase
      .from("approval_history")
      .select(`
        role,
        user_id,
        profiles (
            full_name
        )
      `)
      .eq("estimation_id", estimation_id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (historyError) {
      console.warn("Could not fetch approval history, using 'Sistema'");
    }

    // Get name from joined profile or fallback
    const approverName = history?.profiles?.full_name || "Sistema";
    const approverRole = history?.role ? roleLabels[history.role] : "Sistema";

    // 3. Download PDF
    let attachments: any[] = [];
    if (estimation.pdf_url) {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from("estimations")
          .download(estimation.pdf_url);

        if (fileError) throw fileError;

        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);

          attachments.push({
            filename: estimation.pdf_url.split('/').pop() || "estimacion.pdf",
            content: Buffer.from(buffer),
          });
        }
      } catch (err) {
        console.error("Error downloading PDF:", err);
      }
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
        targetRole = "contratista"; // Ideally email the creator
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
            // Get creator email
             const { data: creator } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', estimation.created_by)
                .single();
             if (creator?.email) recipients.push(creator.email);
        } else {
             // Get project members with this role
             const { data: members } = await supabase
                .from('project_members')
                .select('user_id, profiles(email)')
                .eq('project_id', estimation.project_id)
                .eq('role', targetRole);

             members?.forEach((m: any) => {
                 if (m.profiles?.email) recipients.push(m.profiles.email);
             });
        }
    }

    // Deduplicate emails
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
