import { BookOpen, Check, Copy, ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AtlasDataset, InteropMapping } from '../types/atlas';
import type { FocusSelection } from '../utils/atlasAnalytics';
import { buildResolvedClauseDetail } from '../utils/clauseNavigation';
import { AlignmentIndicator } from './AlignmentIndicator';

interface ClauseReaderDrawerProps {
  mapping: InteropMapping | null;
  dataset: AtlasDataset;
  onClose: () => void;
  onSelectMapping: (mapping: InteropMapping) => void;
  onSelectEntity: (selection: FocusSelection) => void;
}

export function ClauseReaderDrawer({
  mapping,
  dataset,
  onClose,
  onSelectMapping,
  onSelectEntity,
}: ClauseReaderDrawerProps) {
  const [copiedAnchor, setCopiedAnchor] = useState(false);

  useEffect(() => {
    if (!mapping) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapping, onClose]);

  if (!mapping) return null;

  const detail = buildResolvedClauseDetail(dataset, mapping);
  const instMap = new Map(dataset.instruments.map((i) => [i.id, i]));

  const handleCopyLocator = async () => {
    try {
      await navigator.clipboard.writeText(detail.sectionAnchor);
      setCopiedAnchor(true);
      setTimeout(() => setCopiedAnchor(false), 2000);
    } catch {
      // Ignore clipboard restrictions cleanly
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1A1D23]/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clause-reader-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white h-full border-l border-[var(--atlas-rule)] flex flex-col overflow-hidden animate-drawer-in">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-[var(--atlas-rule)] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <AlignmentIndicator type={mapping.alignmentType} dotOnly />
              <span className="font-semibold text-[var(--atlas-ink)]">
                {detail.instrument?.shortName ?? mapping.instrumentId}
              </span>
              <span className="font-mono tabular-nums text-[var(--atlas-ink-muted)]">
                verified {mapping.lastVerified}
              </span>
            </div>

            <h2
              id="clause-reader-title"
              className="font-editorial text-[22px] sm:text-2xl font-semibold text-[var(--atlas-ink)] mt-1.5 leading-snug"
            >
              {mapping.clauseCitation}
            </h2>

            {detail.instrument && (
              <p className="text-xs text-[var(--atlas-ink-secondary)] mt-1">
                {detail.instrument.title} ({detail.instrument.issuingBody})
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close clause reader"
            className="p-2 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-ink)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Instant Document Locator & Deep-Link Action Strip */}
        <div className="px-6 py-3 bg-[var(--atlas-surface)] border-b border-[var(--atlas-rule)] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[var(--atlas-ink-secondary)] flex items-center gap-2 min-w-0">
            <span className="shrink-0">Document locator:</span>
            <code className="font-mono font-medium text-[var(--atlas-ink)] bg-white px-2 py-0.5 border border-[var(--atlas-rule)] rounded-[2px] truncate">
              {detail.sectionAnchor}
            </code>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLocator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--atlas-ink)] bg-white border border-[var(--atlas-border-control)] rounded-[2px] hover:bg-[var(--atlas-elevated)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedAnchor ? (
                <>
                  <Check
                    className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)]"
                    aria-hidden="true"
                  />
                  <span>Copied &ldquo;{detail.sectionAnchor}&rdquo;</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy Find Keyword</span>
                </>
              )}
            </button>

            <a
              href={detail.deepLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Jump to Section in Official Text</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Main Scrollable Reader Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 space-y-6">
          {/* 1. Substantive Normative Provision */}
          <section aria-labelledby="reader-provision-heading">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--atlas-ink)] mb-2">
              <BookOpen className="w-3.5 h-3.5 text-[var(--atlas-ink-secondary)]" aria-hidden="true" />
              <h3 id="reader-provision-heading" className="font-sans">
                Substantive Provision &amp; Normative Scope
              </h3>
            </div>
            <div className="p-4 bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] text-sm text-[var(--atlas-ink)] leading-[1.6] max-w-[68ch]">
              {detail.clauseExcerpt}
            </div>
          </section>

          {/* 2. Use-Case Operational Rationale & Control Context */}
          <section
            aria-labelledby="reader-rationale-heading"
            className="pt-5 border-t border-[var(--atlas-rule)]"
          >
            <h3
              id="reader-rationale-heading"
              className="font-sans text-xs font-semibold text-[var(--atlas-ink)] mb-2"
            >
              How this applies to the selected AI system
            </h3>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--atlas-ink-secondary)] mb-2">
              {detail.useCase && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectEntity({ type: 'useCase', id: detail.useCase!.id });
                    onClose();
                  }}
                  className="font-medium text-[var(--atlas-accent)] underline underline-offset-4 cursor-pointer text-left"
                >
                  {detail.useCase.title}
                </button>
              )}
              <span aria-hidden="true">—</span>
              {detail.control && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectEntity({ type: 'control', id: detail.control!.id });
                    onClose();
                  }}
                  className="font-medium text-[var(--atlas-accent)] underline underline-offset-4 cursor-pointer text-left"
                >
                  {detail.control.title}
                </button>
              )}
            </div>

            <p className="text-sm text-[var(--atlas-ink-secondary)] leading-[1.6] max-w-[68ch]">
              {mapping.rationale}
            </p>

            {detail.control && (
              <p className="mt-2.5 text-xs text-[var(--atlas-ink-secondary)]">
                Target verification artifact:{' '}
                <span className="font-medium text-[var(--atlas-ink)]">
                  {detail.control.artifactName}
                </span>
              </p>
            )}
          </section>

          {/* 3. Engineering & Procurement Verification Checklist */}
          <section
            aria-labelledby="reader-steps-heading"
            className="pt-5 border-t border-[var(--atlas-rule)]"
          >
            <h3
              id="reader-steps-heading"
              className="font-sans text-xs font-semibold text-[var(--atlas-ink)] mb-3"
            >
              Engineering &amp; Procurement Verification Steps
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-[var(--atlas-ink-secondary)] leading-[1.55] max-w-[68ch]">
              {detail.verificationSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </section>

          {/* 4. Sibling Clauses Across Other Global Frameworks */}
          {detail.peerMappings.length > 0 && (
            <section
              aria-labelledby="reader-peers-heading"
              className="pt-5 border-t border-[var(--atlas-rule)]"
            >
              <h3
                id="reader-peers-heading"
                className="font-sans text-xs font-semibold text-[var(--atlas-ink)] mb-1"
              >
                Same Operational Control Across Other Frameworks ({detail.peerMappings.length})
              </h3>
              <p className="text-xs text-[var(--atlas-ink-secondary)] mb-3">
                Switch directly to compare how peer instruments regulate this exact control on this use case:
              </p>
              <div className="divide-y divide-[var(--atlas-rule-subtle)] border-t border-[var(--atlas-rule-subtle)]">
                {detail.peerMappings.map((peer) => {
                  const peerInst = instMap.get(peer.instrumentId);
                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => onSelectMapping(peer)}
                      className="w-full text-left py-3 px-2 bg-white hover:bg-[var(--atlas-surface)] transition-colors flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 text-xs">
                          <span className="font-semibold text-[var(--atlas-ink)]">
                            {peerInst?.shortName ?? peer.instrumentId}
                          </span>
                          <span className="font-mono text-[var(--atlas-ink-secondary)]">
                            {peer.clauseCitation}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--atlas-ink-muted)] mt-0.5 line-clamp-1">
                          {peer.rationale}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <AlignmentIndicator type={peer.alignmentType} compact dotOnly />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
