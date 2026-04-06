import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        
        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure avatars directory exists
        const publicDir = join(process.cwd(), 'public')
        const avatarsDir = join(publicDir, 'avatars')
        
        try {
            await mkdir(avatarsDir, { recursive: true })
        } catch (e) {
            // Directory might already exist
        }

        // Create a unique filename
        const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
        const path = join(avatarsDir, filename)

        await writeFile(path, buffer)
        
        // Return the public URL
        const url = `/avatars/${filename}`
        
        return NextResponse.json({ url })

    } catch (error) {
        console.error('[admin/upload POST]', error)
        return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
    }
}
