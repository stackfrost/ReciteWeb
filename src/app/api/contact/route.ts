import { NextRequest, NextResponse } from 'next/server';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  department: string;
  institution?: string;
  message: string;
  createdAt: string;
}

// In-memory ring buffer for recent contact submissions (persists during process lifetime)
export const recentSubmissions: ContactSubmission[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, department, institution, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { status: 'error', message: 'Name, email, and message details are required.' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { status: 'error', message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const submission: ContactSubmission = {
      id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      department: String(department || 'support').trim(),
      institution: institution ? String(institution).trim() : undefined,
      message: String(message).trim(),
      createdAt: new Date().toISOString(),
    };

    recentSubmissions.unshift(submission);
    if (recentSubmissions.length > 100) {
      recentSubmissions.pop();
    }

    console.log(`[Contact Inquiry Received] ${submission.id} from ${submission.email} (${submission.department}): ${submission.message.slice(0, 80)}...`);

    return NextResponse.json({
      status: 'success',
      inquiryId: submission.id,
      message: 'Your inquiry has been successfully received. We will respond within 24 hours.',
    });
  } catch (err: any) {
    console.error('[Contact API Error]:', err);
    return NextResponse.json(
      { status: 'error', message: 'Failed to process inquiry submission.' },
      { status: 500 }
    );
  }
}
