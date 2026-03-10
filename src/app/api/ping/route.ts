import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'O servidor está respondendo!',
        timestamp: new Date().toISOString()
    });
}
