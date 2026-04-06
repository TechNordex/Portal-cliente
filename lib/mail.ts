import { Resend } from 'resend'

const getResend = () => new Resend(process.env.RESEND_API_KEY || 're_config_placeholder')

const NORDEX_GOLD = '#f5a800'
const NORDEX_DARK = '#111111'
const NORDEX_CARD = '#1a1a1a'
const TEXT_MUTED = '#a1a1aa'
const TEAM_EMAIL = 'contato@nordex.tech'

/**
 * Base template for Nordex Tech emails
 */
const getBaseTemplate = (content: string) => `
<div style="font-family: Arial, sans-serif; background-color: ${NORDEX_DARK}; color: #f2f2f2; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: ${NORDEX_CARD}; border: 1px solid #333333; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #000000; padding: 24px; text-align: center; border-bottom: 2px solid ${NORDEX_GOLD};">
      <h1 style="margin: 0; color: ${NORDEX_GOLD}; font-size: 24px; font-weight: bold; letter-spacing: 2px;">NORDEX TECH</h1>
    </div>
    <div style="padding: 32px 24px;">
      ${content}
    </div>
    <div style="background-color: #000000; padding: 16px; text-align: center; font-size: 11px; color: ${TEXT_MUTED};">
      Este é um e-mail automático do Portal do Cliente Nordex Tech.
      <br>© ${new Date().getFullYear()} Nordex Tech. Todos os direitos reservados.
    </div>
  </div>
</div>
`

/**
 * Notify client about a new project update
 */
export async function sendClientUpdateEmail({
  to,
  clientName,
  projectName,
  updateTitle,
  updateStageLabel,
  teamMemberName
}: {
  to: string,
  clientName: string,
  projectName: string,
  updateTitle: string,
  updateStageLabel: string,
  teamMemberName: string
}) {
  const resend = getResend()
  const content = `
    <h2 style="font-size: 20px; color: #ffffff; margin-top: 0;">Olá, ${clientName}! 👋</h2>
    <p style="color: ${TEXT_MUTED}; font-size: 15px; line-height: 1.6;">
      Temos o prazer de informar que houve uma nova atualização no seu projeto <strong>${projectName}</strong>.
    </p>
    
    <div style="background-color: #222222; padding: 20px; border-radius: 8px; border-left: 4px solid ${NORDEX_GOLD}; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: ${NORDEX_GOLD}; font-weight: bold; letter-spacing: 1px;">Atualização</p>
      <p style="margin: 0 0 16px 0; font-size: 18px; color: #ffffff; font-weight: bold;">${updateTitle}</p>
      
      <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: ${TEXT_MUTED};">Estágio Atual</p>
      <p style="margin: 0; font-size: 14px; color: #f2f2f2;">${updateStageLabel}</p>
    </div>

    <p style="font-size: 14px; color: ${TEXT_MUTED};">
      Atualizado por: <strong>${teamMemberName}</strong>
    </p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="https://nordex.tech/login" style="display: inline-block; background-color: ${NORDEX_GOLD}; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 15px rgba(245, 168, 0, 0.2);">Acessar Painel do Cliente</a>
    </div>
  `

  return resend.emails.send({
    from: 'Nordex Tech <contato@nordex.tech>',
    to: [to],
    subject: `Atualização: ${projectName} - ${updateTitle}`,
    html: getBaseTemplate(content)
  })
}

/**
 * Notify the Nordex team about client feedback (Approval/Rejection)
 */
export async function sendTeamFeedbackEmail({
  clientName,
  projectName,
  status,
  feedback
}: {
  clientName: string,
  projectName: string,
  status: 'approved' | 'rejected',
  feedback?: string | null
}) {
  const resend = getResend()
  const isApproved = status === 'approved'
  
  const content = `
    <h2 style="font-size: 20px; color: #ffffff; margin-top: 0;">Novo Feedback do Cliente! 📥</h2>
    <p style="color: ${TEXT_MUTED}; font-size: 15px; line-height: 1.6;">
      O cliente <strong>${clientName}</strong> acaba de realizar uma ação no projeto <strong>${projectName}</strong>.
    </p>

    <div style="background-color: #222222; padding: 20px; border-radius: 8px; border-left: 4px solid ${isApproved ? '#10b981' : '#f43f5e'}; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: ${isApproved ? '#10b981' : '#f43f5e'}; font-weight: bold; letter-spacing: 1px;">Decisão do Cliente</p>
      <p style="margin: 0; font-size: 20px; color: #ffffff; font-weight: bold;">
        ${isApproved ? '✅ Aprovado' : '❌ Ajustes Solicitados'}
      </p>

      ${!isApproved && feedback ? `
        <p style="margin: 20px 0 8px 0; font-size: 12px; text-transform: uppercase; color: ${TEXT_MUTED};">Feedback do Cliente</p>
        <p style="margin: 0; font-size: 14px; color: #f2f2f2; font-style: italic; line-height: 1.5; padding: 12px; background: #2a2a2a; border-radius: 4px;">
          "${feedback}"
        </p>
      ` : ''}
    </div>

    <p style="font-size: 14px; color: ${TEXT_MUTED};">
      Verifique os detalhes no Painel Administrativo para dar continuidade ao projeto.
    </p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="https://nordex.tech/admin" style="display: inline-block; border: 1px solid #444; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;">Ir para Painel Admin</a>
    </div>
  `

  return resend.emails.send({
    from: 'Nordex Portal <contato@nordex.tech>',
    to: [TEAM_EMAIL],
    subject: `Feedback: ${isApproved ? 'APROVADO' : ' REJEITADO'} - ${projectName} (${clientName})`,
    html: getBaseTemplate(content)
  })
}
