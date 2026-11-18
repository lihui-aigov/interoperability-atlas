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
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clause-reader-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <AlignmentIndicator type={mapping.alignmentType} />
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-semibold text-slate-800">
                {detail.instrument?.shortName ?? mapping.instrumentId}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono tabular-nums text-slate-500">
                Verified {mapping.lastVerified}
              </span>
            </div>

            <h2
              id="clause-reader-title"
              className="font-editorial text-xl sm:text-2xl font-medium text-slate-950 mt-1.5 leading-snug"
            >
              {mapping.clauseCitation}
            </h2>

            {detail.instrument && (
              <p className="text-xs text-slate-500 mt-1">
                {detail.instrument.title} ({detail.instrument.issuingBody})
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close clause reader"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Instant Document Locator & Deep-Link Action Strip */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2 min-w-0">
            <span className="text-slate-500 shrink-0">Document Locator:</span>
            <code className="font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded truncate">
              {detail.sectionAnchor}
            </code>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLocator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedAnchor ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Jump to Section in Official Text</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Main Scrollable Reader Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* 1. Substantive Normative Provision (Readable In-App!) */}
          <section aria-labelledby="reader-provision-heading">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <h3 id="reader-provision-heading">
                Substantive Provision &amp; Normative Scope
              </h3>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 leading-relaxed">
              {detail.clauseExcerpt}
            </div>
          </section>

          {/* 2. Use-Case Operational Rationale & Control Context */}
          <section
            aria-labelledby="reader-rationale-heading"
            className="pt-5 border-t border-slate-200"
          >
            <h3
              id="reader-rationale-heading"
              className="text-xs font-semibold text-slate-800 mb-2"
            >
              How This Applies to the Concrete AI Use Case
            </h3>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-2">
              {detail.useCase && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectEntity({ type: 'useCase', id: detail.useCase!.id });
                    onClose();
                  }}
                  className="font-medium text-slate-900 underline underline-offset-4 hover:text-emerald-800 cursor-pointer text-left"
                >
                  {detail.useCase.title}
                </button>
              )}
              <span aria-hidden="true">&rarr;</span>
              {detail.control && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectEntity({ type: 'control', id: detail.control!.id });
                    onClose();
                  }}
                  className="font-medium text-slate-900 underline underline-offset-4 hover:text-emerald-800 cursor-pointer text-left"
                >
                  {detail.control.title}
                </button>
              )}
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{mapping.rationale}</p>

            {detail.control && (
              <p className="mt-2.5 text-xs text-slate-600">
                Target Verification Artifact:{' '}
                <span className="font-medium text-slate-900">{detail.control.artifactName}</span>
              </p>
            )}
          </section>

          {/* 3. Concrete Engineering & Procurement Verification Checklist */}
          <section
            aria-labelledby="reader-steps-heading"
            className="pt-5 border-t border-slate-200"
          >
            <h3
              id="reader-steps-heading"
              className="text-xs font-semibold text-slate-800 mb-3"
            >
              Engineering &amp; Procurement Verification Steps
            </h3>
            <ol className="space-y-2.5">
              {detail.verificationSteps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 leading-relaxed"
                >
                  <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums mt-0.5 shrink-0">
                    0{index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 4. Sibling Clauses Across Other Global Frameworks (Side-by-Side Pivot) */}
          {detail.peerMappings.length > 0 && (
            <section
              aria-labelledby="reader-peers-heading"
              className="pt-5 border-t border-slate-200"
            >
              <h3
                id="reader-peers-heading"
                className="text-xs font-semibold text-slate-800 mb-1"
              >
                Same Operational Control Across Other Frameworks ({detail.peerMappings.length})
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Switch directly to compare how peer instruments regulate this exact control on this use case:
              </p>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-md overflow-hidden">
                {detail.peerMappings.map((peer) => {
                  const peerInst = instMap.get(peer.instrumentId);
                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => onSelectMapping(peer)}
                      className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900">
                            {peerInst?.shortName ?? peer.instrumentId}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-mono text-slate-700">
                            {peer.clauseCitation}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {peer.rationale}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <AlignmentIndicator type={peer.alignmentType} compact />
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
