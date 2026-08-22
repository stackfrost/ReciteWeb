export interface DiagnosticReport {
  incidentId: string;
  timestamp: string;
  errorName: string;
  errorMessage: string;
  stackTrace?: string;
  context: {
    url: string;
    userAgent: string;
    screenResolution: string;
    activeFormat?: string;
    documentLength?: number;
    quarantinedTokensCount?: number;
  };
  recentLogs: string[];
}

class DiagnosticReporter {
  private logRingBuffer: string[] = [];
  private readonly maxLogs = 30;

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole(): void {
    if (typeof window === 'undefined') return;

    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args) => {
      this.pushLog(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      this.pushLog(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      originalError.apply(console, args);
    };
  }

  public pushLog(entry: string): void {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    this.logRingBuffer.push(`[${timestamp}] ${entry}`);
    if (this.logRingBuffer.length > this.maxLogs) {
      this.logRingBuffer.shift();
    }
  }

  public generateIncidentId(): string {
    const timeHex = Date.now().toString(16).toUpperCase().slice(-6);
    const randHex = Math.random().toString(16).toUpperCase().substring(2, 6);
    return `ERR-${timeHex}-${randHex}`;
  }

  public createReport(
    error: Error | string,
    metadata: {
      activeFormat?: string;
      documentLength?: number;
      quarantinedTokensCount?: number;
    } = {}
  ): DiagnosticReport {
    const incidentId = this.generateIncidentId();
    const isErrorObj = error instanceof Error;

    return {
      incidentId,
      timestamp: new Date().toISOString(),
      errorName: isErrorObj ? error.name : 'ApplicationDiagnosticWarning',
      errorMessage: isErrorObj ? error.message : String(error),
      stackTrace: isErrorObj ? error.stack : undefined,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
        activeFormat: metadata.activeFormat,
        documentLength: metadata.documentLength,
        quarantinedTokensCount: metadata.quarantinedTokensCount,
      },
      recentLogs: [...this.logRingBuffer],
    };
  }

  public formatMarkdownReport(report: DiagnosticReport): string {
    return [
      `### ⚠️ ReciteAI Diagnostic Incident Report [${report.incidentId}]`,
      `**Timestamp:** ${report.timestamp}`,
      `**Error:** \`${report.errorName}: ${report.errorMessage}\``,
      `**Active Format:** \`${report.context.activeFormat || 'unknown'}\` | **Length:** ${report.context.documentLength || 0} chars`,
      '',
      '#### System Context',
      `- **Resolution:** ${report.context.screenResolution}`,
      `- **Agent:** \`${report.context.userAgent}\``,
      '',
      '#### Diagnostic Logs',
      '```text',
      report.recentLogs.slice(-10).join('\n') || 'No recent logs recorded.',
      '```',
      report.stackTrace ? `\n#### Stack Trace\n\`\`\`text\n${report.stackTrace}\n\`\`\`` : '',
    ].join('\n');
  }

  public downloadReportBundle(report: DiagnosticReport): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reciteai-diagnostic-${report.incidentId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const diagnosticReporter = new DiagnosticReporter();
