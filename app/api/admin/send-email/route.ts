import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

const getResend = () => new Resend(process.env.RESEND_API_KEY || 're_config_placeholder')

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { to, subject, message, senderName, replyToAdmin, ctaText, ctaLink } = await req.json()

        if (!to || !to.length || !subject || !message) {
            return NextResponse.json({ error: 'Destinatários, assunto e mensagem são obrigatórios.' }, { status: 400 })
        }

        const resend = getResend()
        const emailsArray = Array.isArray(to) ? to : [to]

        // Fetch users to know their names for personalized {{nome}} variables
        let usersData: any[] = []
        if (emailsArray.length > 0) {
            const placeholders = emailsArray.map((_, i) => `$${i + 1}`).join(',')
            const result = await db.query(`SELECT email, name FROM users WHERE email IN (${placeholders})`, emailsArray)
            usersData = result.rows
        }

        // Prepare the base CTA HTML
        let ctaHtml = ''
        if (ctaText && ctaLink) {
            ctaHtml = `
            <div style="text-align:center;margin-top:32px;margin-bottom:16px;">
                <a href="${ctaLink.startsWith('http') ? ctaLink : 'https://' + ctaLink}" style="display:inline-block;background:#f5a800;color:#000000;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(245,168,0,0.3);">${ctaText}</a>
            </div>`
        }

        // Format raw text Message to HTML (handling line breaks and simple simulated markdown like bold)
        const formatMessage = (msg: string) => {
            let htmlForm = msg
                .replace(/\n\n/g, '</p><p style="margin:0 0 16px 0;font-size:15px;color:#e0e0e0;line-height:1.7;">')
                .replace(/\n/g, '<br/>')
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff;">$1</strong>')
            return `<p style="margin:0 0 16px 0;font-size:15px;color:#e0e0e0;line-height:1.7;">${htmlForm}</p>`
        }

        const buildHtml = (recipientName: string, recipientEmail: string) => {
            const firstName = recipientName.split(' ')[0]
            
            // Replace variables
            let finalSubject = subject.replace(/\{\{nome\}\}/gi, firstName).replace(/\{\{name\}\}/gi, firstName)
            let finalMessage = message.replace(/\{\{nome\}\}/gi, firstName).replace(/\{\{name\}\}/gi, firstName)

            return {
                subject: finalSubject,
                html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"></head>
                <body style="margin:0;padding:0;background:#111111;font-family:Inter,Arial,sans-serif;">
                    <div style="max-width:620px;margin:40px auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                        <div style="background:#000;padding:24px 32px;border-bottom:2px solid #f5a800;display:flex;align-items:center;">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png" alt="Nordex Tech" style="height:32px;width:auto;" />
                        </div>
                        <div style="padding:40px 32px;">
                            <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#f5a800;font-weight:800;">Comunicado Nordex</p>
                            <h2 style="margin:0 0 28px 0;font-size:24px;color:#ffffff;font-weight:800;letter-spacing:-0.5px;">${finalSubject}</h2>
                            <div style="background:#222;border-left:4px solid #f5a800;border-radius:6px;padding:24px 28px;margin-bottom:24px;">
                                ${formatMessage(finalMessage)}
                                ${ctaHtml}
                            </div>
                            <p style="margin:0;font-size:13px;color:#888;">Mensagem enviada por <strong style="color:#f5a800;">${senderName || 'Equipe Nordex Tech'}</strong>.</p>
                        </div>
                        <div style="background:#0a0a0a;padding:24px 32px;text-align:center;border-top:1px solid #222;">
                            <p style="margin:0 0 8px 0;font-size:12px;color:#666;">Este email destina-se a <b>${recipientEmail}</b></p>
                            <p style="margin:0;font-size:11px;color:#555;">© ${new Date().getFullYear()} Nordex Tech · Todos os direitos reservados</p>
                        </div>
                    </div>
                </body>
                </html>
                `
            }
        }

        // Send individually to protect privacy
        const sendPromises = emailsArray.map(email => {
            const user = usersData.find(u => u.email === email)
            const recipientName = user ? user.name : 'Cliente'
            const { subject: finalSubject, html } = buildHtml(recipientName, email)
            
            const payload: any = {
                from: 'Nordex Tech <noreply@nordex.tech>',
                to: [email],
                subject: finalSubject,
                html: html,
            }

            if (replyToAdmin && session.email) {
                payload.reply_to = session.email
            }

            return resend.emails.send(payload)
        })

        const results = await Promise.allSettled(sendPromises)
        const failed = results.filter(r => r.status === 'rejected')

        if (failed.length === emailsArray.length) {
            console.error('[send-email] All sends failed:', failed)
            return NextResponse.json({ error: 'Falha completa ao enviar emails.' }, { status: 400 })
        }

        return NextResponse.json({ 
            success: true, 
            sent: emailsArray.length - failed.length, 
            failed: failed.length 
        })
    } catch (err) {
        console.error('[send-email]', err)
        return NextResponse.json({ error: 'Erro interno ao enviar email.' }, { status: 500 })
    }
}
