import { Check, Copy, Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AtlasDataset, UseCase } from '../types/atlas';
import {
  generateProcurementMarkdown,
  generateUseCaseJsonExport,
} from '../utils/atlasAnalytics';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: AtlasDataset;
  selectedUseCase: UseCase;
  onChangeUseCase: (useCaseId: string) => void;
}

export function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportPreviewModal({
  isOpen,
  onClose,
  dataset,
  selectedUseCase,
  onChangeUseCase,
}: ExportPreviewModalProps) {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content =
    format === 'markdown'
      ? generateProcurementMarkdown(dataset, selectedUseCase)
      : generateUseCaseJsonExport(dataset, selectedUseCase);

  const fileSlug = selectedUseCase.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const filename =
    format === 'markdown'
      ? `procurement-checklist-${fileSlug}.md`
      : `atlas-mapping-${fileSlug}.json`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly if restricted
    }
  };

  const handleDownload = () => {
    triggerFileDownload(
      filename,
      content,
      format === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1A1D23]/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[88vh] bg-white border border-[var(--atlas-rule)] rounded-[2px] flex flex-col overflow-hidden shadow-lg animate-fade-in">
        <div className="px-6 py-4 border-b border-[var(--atlas-rule)] flex items-center justify-between gap-4">
          <div>
            <h2
              id="export-modal-title"
              className="font-editorial text-xl font-semibold text-[var(--atlas-ink)]"
            >
              Procurement &amp; Readiness Checklist Export
            </h2>
            <p className="text-xs text-[var(--atlas-ink-secondary)] mt-0.5">
              Download or copy vendor verification artifacts, jurisdictional deltas, and clause citations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-2 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-ink)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-3.5 bg-[var(--atlas-surface)] border-b border-[var(--atlas-rule)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <label
              htmlFor="export-usecase-select"
              className="text-xs font-medium text-[var(--atlas-ink-secondary)] shrink-0"
            >
              Use Case:
            </label>
            <select
              id="export-usecase-select"
              value={selectedUseCase.id}
              onChange={(e) => onChangeUseCase(e.target.value)}
              className="text-base sm:text-sm bg-white border border-[var(--atlas-border-control)] rounded-[2px] px-3 py-1.5 text-[var(--atlas-ink)] max-w-md w-full truncate focus-visible:outline-2 focus-visible:outline-[var(--atlas-accent)]"
            >
              {dataset.useCases.map((uc) => (
                <option key={uc.id} value={uc.id}>
                  {uc.title}
                </option>
              ))}
            </select>
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-[var(--atlas-elevated)] rounded-[2px] shrink-0"
            role="group"
            aria-label="Export format"
          >
            <button
              type="button"
              onClick={() => setFormat('markdown')}
              className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                format === 'markdown'
                  ? 'bg-white text-[var(--atlas-ink)]'
                  : 'text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)]'
              }`}
            >
              Markdown Checklist (.md)
            </button>
            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                format === 'json'
                  ? 'bg-white text-[var(--atlas-ink)]'
                  : 'text-[var(--atlas-ink-secondary)] hover:text-[var(--atlas-ink)]'
              }`}
            >
              Atlas Schema (.json)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 bg-[#1A1D23] text-[#F5F6F8]">
          <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </pre>
        </div>

        <div className="px-6 py-4 border-t border-[var(--atlas-rule)] bg-white flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-mono text-[var(--atlas-ink-muted)]">{filename}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check
                    className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)]"
                    aria-hidden="true"
                  />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy Content</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download {format === 'markdown' ? '.md' : '.json'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
