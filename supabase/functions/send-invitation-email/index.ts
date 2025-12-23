import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  inviteUrl: string;
  projectName: string;
  role: string;
  inviterName?: string;
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviteUrl, projectName, role, inviterName }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation email to ${email} for project ${projectName}`);

    const roleLabel = roleLabels[role] || role;

    const emailResponse = await resend.emails.send({
      from: "Estimaciones App <onboarding@resend.dev>",
      to: [email],
      subject: `Invitación al proyecto: ${projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">¡Has sido invitado!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${inviterName ? `<strong>${inviterName}</strong> te ha invitado` : 'Has sido invitado'} a colaborar en el proyecto <strong>${projectName}</strong> como <strong>${roleLabel}</strong>.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Detalles de la invitación:</p>
              <p style="margin: 0;"><strong>Proyecto:</strong> ${projectName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Rol asignado:</strong> ${roleLabel}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Aceptar Invitación
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:
            </p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
              ${inviteUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              Este enlace expirará en 7 días. Si no solicitaste esta invitación, puedes ignorar este correo.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
