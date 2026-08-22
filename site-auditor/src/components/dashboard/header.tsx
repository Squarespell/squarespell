'use client';

import { useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LinkIcon, DownloadIcon, PrinterIcon, RotateCcwIcon, CheckIcon, EllipsisVerticalIcon } from 'lucide-react';
import { formatDate } from './dashboard-helpers';

export function DashboardHeader({ report, onReset }: { report: AuditReport; onReset: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    if (typeof window === 'undefined') return;
    const url = report.id ? `${window.location.origin}/r/${report.id}` : window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">{report.host}</span>
        <span className="truncate text-xs text-muted-foreground">Audited {formatDate(report.createdAt)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? <CheckIcon /> : <LinkIcon />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
        </Button>
        {/* PDF/Print: full buttons at sm+, collapsed into a "More" menu below sm so the
            header never overflows the viewport on phones. */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {report.id && (
            <a href={`/api/report-pdf?token=${encodeURIComponent(report.id)}`}>
              <Button variant="outline" size="sm">
                <DownloadIcon />
                <span className="hidden lg:inline">PDF</span>
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <PrinterIcon />
            <span className="hidden lg:inline">Print</span>
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="sm:hidden" aria-label="More actions">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {report.id && (
              <DropdownMenuItem asChild>
                <a href={`/api/report-pdf?token=${encodeURIComponent(report.id)}`}>
                  <DownloadIcon />
                  Download PDF
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => window.print()}>
              <PrinterIcon />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" onClick={onReset}>
          <RotateCcwIcon />
          <span className="hidden sm:inline">New audit</span>
        </Button>
      </div>
    </header>
  );
}
