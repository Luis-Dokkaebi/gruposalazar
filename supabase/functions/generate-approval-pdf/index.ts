import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Buffer } from "node:buffer";

// Setup mocks for pdfmake (browser build)
// These must be set before the library is imported/executed.
// Using dynamic imports ensures this order is respected.
// @ts-ignore: Mocking global window
globalThis.window = globalThis;
// @ts-ignore: Mocking global document
globalThis.document = {
  createElementNS: () => ({}),
};
// @ts-ignore: Mocking navigator
globalThis.navigator = {};

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

// Helper to verify auth
const verifyAuth = async (req: Request) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { user: null, error: 'Missing auth header' };

  const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  return { user, error };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify User
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { estimation_id } = await req.json();

    if (!estimation_id) {
      throw new Error("Missing estimation_id");
    }

    // 2. Dynamic Import of pdfmake to ensure mocks are active
    const pdfMakeModule = await import("https://esm.sh/pdfmake/build/pdfmake");
    const pdfFontsModule = await import("https://esm.sh/pdfmake/build/vfs_fonts");

    const pdfMake = pdfMakeModule.default;
    const pdfFonts = pdfFontsModule.default;

    // Initialize pdfmake fonts
    // @ts-ignore: pdfmake vfs type definition mismatch
    pdfMake.vfs = pdfFonts.pdfMake.vfs;

    // 3. Fetch Data
    const { data: estimation, error: estError } = await supabaseAdmin
      .from("estimations")
      .select(`
        *,
        cost_centers (code, name),
        projects (name),
        profiles:created_by (first_name, last_name, email)
      `)
      .eq("id", estimation_id)
      .single();

    if (estError || !estimation) throw new Error(`Estimation not found: ${estError?.message}`);

    // Optional: Check if user has permission (e.g. is 'residente' or member)
    // For now, relying on the fact they are authenticated and the sensitive operation (sending email) is reasonably safe for testing.

    // 4. Define PDF Content
    const docDefinition = {
      content: [
        {
          columns: [
            {
              text: 'GRUPO SALAZAR',
              style: 'header',
              alignment: 'left'
            },
            {
              text: [
                { text: 'ORDEN DE PAGO / ESTIMACIÓN\n', style: 'subheader' },
                { text: `FOLIO: ${estimation.folio}\n`, style: 'small' },
                { text: `FECHA: ${new Date().toLocaleDateString('es-MX')}`, style: 'small' }
              ],
              alignment: 'right'
            }
          ]
        },
        { text: '\n\n' },
        {
          style: 'tableExample',
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'PROYECTO', bold: true, fillColor: '#eeeeee' }, estimation.projects?.name || 'N/A'],
              [{ text: 'CENTRO DE COSTOS', bold: true, fillColor: '#eeeeee' }, `${estimation.cost_centers?.code || ''} - ${estimation.cost_centers?.name || ''}`],
              [{ text: 'CONTRATISTA', bold: true, fillColor: '#eeeeee' }, `${estimation.profiles?.first_name || ''} ${estimation.profiles?.last_name || ''}`],
              [{ text: 'DESCRIPCIÓN', bold: true, fillColor: '#eeeeee' }, estimation.estimation_text || 'Sin descripción'],
            ]
          }
        },
        { text: '\n' },
        {
            style: 'tableExample',
            table: {
                widths: ['*', 'auto'],
                body: [
                    [{ text: 'TOTAL A PAGAR', bold: true, fontSize: 14, alignment: 'right' }, { text: `$${estimation.amount?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, bold: true, fontSize: 14 }]
                ]
            },
            layout: 'noBorders'
        },
        { text: '\n\n\n\n' },
        {
          columns: [
            {
              stack: [
                { text: '_____________________________', alignment: 'center' },
                { text: 'RESIDENTE', alignment: 'center', fontSize: 10, bold: true }
              ]
            },
            {
              stack: [
                { text: '_____________________________', alignment: 'center' },
                { text: 'SUPERINTENDENTE', alignment: 'center', fontSize: 10, bold: true }
              ]
            },
            {
                stack: [
                  { text: '_____________________________', alignment: 'center' },
                  { text: 'LÍDER DE PROYECTO', alignment: 'center', fontSize: 10, bold: true }
                ]
              }
          ]
        }
      ],
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          color: '#1e3a8a' // Deep blue
        },
        subheader: {
          fontSize: 16,
          bold: true
        },
        small: {
          fontSize: 10
        },
        tableExample: {
          margin: [0, 5, 0, 15]
        }
      },
      defaultStyle: {
        columnGap: 20
      }
    };

    // 5. Generate PDF Buffer
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    const pdfBase64 = await new Promise<string>((resolve) => {
        pdfDocGenerator.getBase64((data: string) => {
            resolve(data);
        });
    });

    // Use Buffer from node:buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');


    // 6. Send Email
    const targetEmail = "armandoag_1996@hotmail.com";

    const emailResponse = await resend.emails.send({
      from: "Estimaciones <onboarding@resend.dev>",
      to: [targetEmail],
      subject: `Estimación Autorizada #${estimation.folio} - Grupo Salazar`,
      html: `
        <p>Se ha autorizado la estimación <strong>${estimation.folio}</strong>.</p>
        <p>Adjunto encontrará el documento oficial en PDF.</p>
        <p>Atentamente,<br>Sistema de Estimaciones Grupo Salazar</p>
      `,
      attachments: [
        {
          filename: `Estimacion_${estimation.folio}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    return new Response(JSON.stringify({ success: true, email: emailResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error generating/sending PDF:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
