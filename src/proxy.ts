import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Allow all routes without login enforcement for local test mode
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
