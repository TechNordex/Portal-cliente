import { GoogleGenAI, createPartFromUri } from "@google/genai"
import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

// Cache do arquivo enviado ao Gemini (válido por 48h)
let cachedFileUri: string | null = null
let cachedFileMime: string | null = null

// Inicializa sob demanda
const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" })

async function getOrUploadPdf() {
    if (cachedFileUri) return { uri: cachedFileUri, mimeType: cachedFileMime! }

    const pdfPath = join(process.cwd(), "public", "nordex-info.pdf")
    const pdfBuffer = readFileSync(pdfPath)

    const ai = getAI()
    const uploaded = await ai.files.upload({
        file: new Blob([pdfBuffer], { type: "application/pdf" }),
        config: { displayName: "nordex-info.pdf" },
    })

    cachedFileUri = uploaded.uri!
    cachedFileMime = uploaded.mimeType ?? "application/pdf"

    return { uri: cachedFileUri, mimeType: cachedFileMime }
}

export async function POST(request: Request) {
    try {
        const { messages, context } = await request.json()

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Mensagens inválidas." }, { status: 400 })
        }

        const { uri, mimeType } = await getOrUploadPdf()

        // Limita o contexto às últimas 5 mensagens
        const recentMessages = messages.slice(-5)

        // Monta histórico de conversa (sem a última mensagem das recentes)
        const history = recentMessages.slice(0, -1).map((m: { role: string; content: string }) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
        }))

        const lastMessage = recentMessages[recentMessages.length - 1]

        const portalContext = context ? ` CONTEXTO DO PORTAL: ${context}` : ''

        const ai = getAI()
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            history,
            config: {
                systemInstruction: `Você é o assistente virtual da Nordex Tech, uma empresa de tecnologia nordestina. Seu nome é Nordy.
Seja sempre simpático, acolhedor e use linguagem leve e descontraída, mas profissional.
Use APENAS as informações do documento PDF fornecido para responder sobre a empresa.${portalContext}
Se estiver no contexto do portal, você pode ajudar o cliente a entender o progresso do projeto dele.
Se a pergunta não estiver relacionada ao documento ou ao contexto do portal, responda com simpatia dizendo que só pode ajudar com informações sobre a Nordex Tech ou o projeto atual.
Seja CONCISO: responda em no máximo 5 frases. Vá direto ao ponto.
Se o usuário quiser falar com um humano, pedir um orçamento detalhado, agendar uma reunião ou se você não souber responder algo, sugira sempre que ele entre em contato com nossa equipe pelo WhatsApp através do link: https://wa.me/5581984889683 ou pelo e-mail: contato@nordex.tech

REGRA ABSOLUTA DE FORMATAÇÁO: Você deve escrever APENAS texto puro e simples. É PROIBIDO usar qualquer elemento Markdown ou de formatação como: asteriscos (*), dois asteriscos (**), cerquilha (#), underline (_), hífen (-) para listas, ou qualquer outro símbolo especial de formatação. Escreva frases normais como em uma conversa, usando vírgulas e pontos para separar ideias. Lembre-se, apenas texto puro, sem formatação.`,
            },
        })

        const response = await chat.sendMessage({
            message: [
                createPartFromUri(uri, mimeType),
                { text: lastMessage.content },
            ],
        })

        return NextResponse.json({ reply: response.text })
    } catch (err) {
        console.error("Erro no chat Gemini:", err)
        cachedFileUri = null
        cachedFileMime = null
        return NextResponse.json(
            { error: "Erro ao processar sua mensagem. Tente novamente." },
            { status: 500 }
        )
    }
}
