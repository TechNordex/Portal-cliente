import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Clean filename and add timestamp to avoid overwrites
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const relativePath = `/uploads/${filename}`;
        
        // Save to public dir
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const uploadPath = path.join(uploadDir, filename);

        await writeFile(uploadPath, buffer);

        return NextResponse.json({ url: relativePath }, { status: 201 });
    } catch (error) {
        console.error('[API UPLOAD POST]', error);
        return NextResponse.json({ error: 'Erro ao fazer upload da imagem.' }, { status: 500 });
    }
}
