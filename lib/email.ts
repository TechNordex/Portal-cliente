import { Resend } from 'resend'
import { db } from './db'

let resendInstance: Resend | null = null
function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey && process.env.NODE_ENV === 'production') {
      console.warn('RESEND_API_KEY is missing in production!')
    }
    resendInstance = new Resend(apiKey || 'missing_key')
  }
  return resendInstance
}

export const DEFAULT_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Nova Atualização - Nordex Tech</title>
  <style>
    body { margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 600px; margin: 40px auto; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
    .header { background: #0a0a0a; padding: 40px; text-align: center; border-bottom: 1px solid #1a1a1a; }
    .header .logo-container { margin-bottom: 20px; }
    .header .logo-container img { height: 42px; width: auto; }
    .badge { display: inline-block; background: rgba(245,168,0,0.08); color: #f5a800; font-size: 10px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; padding: 6px 12px; border-radius: 100px; border: 1px solid rgba(245,168,0,0.15); margin-top: 4px; }
    .content { padding: 48px 40px; }
    .greeting { font-size: 16px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
    .greeting strong { color: #ffffff; font-weight: 700; }
    .update-card { background: #111111; border: 1px solid #1e1e1e; border-radius: 20px; padding: 32px; margin-bottom: 32px; }
    .stage-indicator { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .stage-dot { width: 8px; height: 8px; background: #f5a800; border-radius: 50%; box-shadow: 0 0 10px rgba(245,168,0,0.5); }
    .stage-label { font-size: 11px; font-weight: 800; color: #f5a800; text-transform: uppercase; letter-spacing: 0.15em; }
    .update-title { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 16px; letter-spacing: -0.01em; }
    .update-message { font-size: 15px; color: #d4d4d8; line-height: 1.8; margin: 0; white-space: pre-wrap; }
    .author-section { display: flex; align-items: center; margin-top: 28px; padding-top: 28px; border-top: 1px solid #1e1e1e; }
    .author-avatar { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, rgba(245,168,0,0.2), #1a1a1a); border: 1px solid rgba(245,168,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #f5a800; margin-right: 16px; }
    .author-info { flex: 1; }
    .author-name { font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 2px; }
    .author-role { font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .cta-container { text-align: center; margin: 40px 0; }
    .cta-button { display: inline-block; background: #f5a800; color: #000000; font-size: 15px; font-weight: 900; padding: 18px 44px; border-radius: 14px; text-decoration: none; letter-spacing: 0.02em; transition: all 0.3s ease; box-shadow: 0 10px 30px rgba(245,168,0,0.2); }
    .footer { padding: 40px; background: #080808; border-top: 1px solid #151515; text-align: center; }
    .footer p { font-size: 13px; color: #52525b; margin: 6px 0; line-height: 1.5; }
    .footer strong { color: #d4d4d8; }
    .footer a { color: #52525b; text-decoration: none; font-weight: 600; transition: color 0.2s; }
    .footer a:hover { color: #f5a800; }
    .divider-line { height: 4px; background: linear-gradient(90deg, #f5a800, #ffcc33); }
    @media (max-width: 600px) {
      .wrapper { margin: 0; border-radius: 0; border: none; }
      .content { padding: 32px 24px; }
      .header { padding: 32px 24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="divider-line"></div>
    <div class="header">
      <div class="logo-container">
        <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png" alt="Nordex Tech">
      </div>
      <div class="badge">Atualização de Projeto</div>
    </div>
    <div class="content">
      <p class="greeting">Olá, <strong>{{clientName}}</strong>!</p>
      <p class="greeting" style="margin-top:-14px;">Temos novidades empolgantes sobre a evolução do seu projeto na <strong>Nordex Tech</strong>.</p>
      
      <div class="update-card">
        <div class="stage-indicator">
          <div class="stage-dot"></div>
          <div class="stage-label">Etapa {{updateStage}}</div>
        </div>
        <h2 class="update-title">{{updateTitle}}</h2>
        {{#if updateMessage}}
        <p class="update-message">{{updateMessage}}</p>
        {{/if}}
        
        <div class="author-section">
          <div class="author-avatar">{{authorInitial}}</div>
          <div class="author-info">
            <div class="author-name">{{authorName}}</div>
            <div class="author-role">Especialista Nordex Tech</div>
          </div>
        </div>
      </div>
      
      <div class="cta-container">
        <a href="{{portalUrl}}" class="cta-button">Ver Detalhes no Portal do Cliente →</a>
      </div>
    </div>
    <div class="footer">
      <p>Você recebeu esta notificação pois é um cliente exclusivo da <strong>Nordex Tech</strong>.</p>
      <p>Projeto: <strong>{{projectName}}</strong></p>
      <p style="margin-top:20px;"><a href="https://nordex.tech" target="_blank">Acesse nosso site oficial</a></p>
      <p style="font-size: 11px; margin-top: 10px; color: #3f3f46;">&copy; {{year}} Nordex Tech. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`

function renderTemplate(template: string, vars: Record<string, string>): string {
  let html = template
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value || '')
  }
  // Handle simple {{#if var}}...{{/if}} blocks
  html = html.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    return vars[varName] ? content : ''
  })
  return html
}

export async function sendUpdateNotification({
    clientName,
    clientEmail,
    projectName,
    updateTitle,
    updateMessage,
    updateStage,
    authorName,
    isRevision = false,
}: {
    clientName: string
    clientEmail: string
    projectName: string
    updateTitle: string
    updateMessage?: string
    updateStage: number
    authorName: string
    isRevision?: boolean
}) {
    try {
        console.log(`[email] Starting notification for ${clientEmail} (Project: ${projectName}, Revision: ${isRevision})`)
        
        let templateHtml = DEFAULT_TEMPLATE
        let customSubject: string | null = null

        try {
            const res = await db.query('SELECT html, subject FROM email_templates WHERE key = $1 LIMIT 1', ['update_notification'])
            if (res.rows.length > 0) {
                if (res.rows[0].html) templateHtml = res.rows[0].html
                if (res.rows[0].subject) customSubject = res.rows[0].subject
                console.log(`[email] Using custom template for notification`)
            }
        } catch (dbErr) {
            console.warn(`[email] Could not fetch template from DB, using default:`, (dbErr as any).message)
        }

        const portalUrl = (process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.nordex.tech').replace(/\/dashboard$/, '').replace(/\/$/, '') + '/login'
        const authorInitial = authorName ? authorName.charAt(0).toUpperCase() : 'N'
        const year = new Date().getFullYear().toString()

        const html = renderTemplate(templateHtml, {
            clientName,
            projectName,
            updateTitle,
            updateMessage: updateMessage || '',
            updateStage: String(updateStage),
            authorName,
            authorInitial,
            portalUrl,
            year,
        })

        // Render subject if it's custom
        let finalSubject = isRevision 
            ? `[REVISÃO] [${projectName}] Atualização: ${updateTitle}`
            : `[${projectName}] Nova atualização: ${updateTitle}`
            
        if (customSubject) {
            finalSubject = renderTemplate(customSubject, {
                clientName,
                projectName,
                updateTitle,
                updateStage: String(updateStage),
                authorName,
                portalUrl,
            })
            if (isRevision && !finalSubject.includes('[REVISÃO]')) {
                finalSubject = `[REVISÃO] ${finalSubject}`
            }
        }

        console.log(`[email] Sending via Resend. Subject: ${finalSubject}`)

        const { data, error } = await getResend().emails.send({
            from: process.env.RESEND_FROM || 'Nordex Tech <noreply@nordex.tech>',
            to: [clientEmail],
            subject: finalSubject,
            html,
        })

        if (error) {
            console.error('[email] Resend API error:', JSON.stringify(error, null, 2))
            return { success: false, error }
        }

        console.log('[email] Sent successfully to', clientEmail, '| Resend ID:', data?.id)
        return { success: true, id: data?.id }
    } catch (err) {
        console.error('[email] Unexpected error in sendUpdateNotification:', err)
        return { success: false, error: err }
    }
}

