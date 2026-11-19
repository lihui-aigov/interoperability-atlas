import { Check, Copy, ExternalLink, Scale, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AtlasDataset } from '../types/atlas';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: AtlasDataset;
}

export function CitationModal({ isOpen, onClose, dataset }: CitationModalProps) {
  const [copiedFormat, setCopiedFormat] = useState<'apa' | 'bibtex' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const year = dataset.metadata.lastUpdated.slice(0, 4) || '2026';
  const apaCitation = `Xu, L. (${year}). Open Atlas of AI Governance Interoperability (Version ${dataset.metadata.datasetVersion}) [Computer software and structured dataset]. GitHub. https://github.com/lihui-aigov/interoperability-atlas`;

  const bibtexCitation = `@software{xu_${year}_interoperability_atlas,
  author       = {Xu, Lihui},
  title        = {{Open Atlas of AI Governance Interoperability}},
  year         = {${year}},
  version      = {${dataset.metadata.datasetVersion}},
  url          = {https://github.com/lihui-aigov/interoperability-atlas},
  note         = {Use-case-anchored operational mapping across ${dataset.instruments.length} global AI governance instruments (${dataset.mappings.length} verified clause citations). Independent open research.}
}`;

  const handleCopy = async (kind: 'apa' | 'bibtex', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(kind);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      // Clipboard fallback ignored cleanly when blocked
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1A1D23]/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white border border-[var(--atlas-rule)] rounded-[2px] overflow-hidden shadow-lg animate-fade-in">
        <div className="px-6 py-4 border-b border-[var(--atlas-rule)] flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-[var(--atlas-ink-muted)] tabular-nums">
              Dataset v{dataset.metadata.datasetVersion}, Schema {dataset.metadata.schemaVersion}
            </p>
            <h2
              id="citation-modal-title"
              className="font-editorial text-xl font-semibold text-[var(--atlas-ink)] mt-0.5"
            >
              Cite &amp; Reuse This Atlas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close citation dialog"
            className="p-2 text-[var(--atlas-ink-muted)] hover:text-[var(--atlas-ink)] rounded-[2px] hover:bg-[var(--atlas-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto overscroll-contain">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-[var(--atlas-ink)]">
                Policy &amp; Academic Reference (APA 7th Edition)
              </span>
              <button
                type="button"
                onClick={() => handleCopy('apa', apaCitation)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--atlas-ink)] bg-[var(--atlas-surface)] hover:bg-[var(--atlas-elevated)] rounded-[2px] border border-[var(--atlas-rule)] transition-colors cursor-pointer"
              >
                {copiedFormat === 'apa' ? (
                  <>
                    <Check
                      className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)]"
                      aria-hidden="true"
                    />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy APA</span>
                  </>
                )}
              </button>
            </div>
            <p className="p-3.5 bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] text-xs sm:text-sm text-[var(--atlas-ink)] leading-relaxed select-all">
              {apaCitation}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-[var(--atlas-ink)]">BibTeX Entry</span>
              <button
                type="button"
                onClick={() => handleCopy('bibtex', bibtexCitation)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--atlas-ink)] bg-[var(--atlas-surface)] hover:bg-[var(--atlas-elevated)] rounded-[2px] border border-[var(--atlas-rule)] transition-colors cursor-pointer"
              >
                {copiedFormat === 'bibtex' ? (
                  <>
                    <Check
                      className="w-3.5 h-3.5 text-[var(--align-equivalent-ink)]"
                      aria-hidden="true"
                    />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy BibTeX</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-[#1A1D23] text-[#F5F6F8] rounded-[2px] text-[11.5px] font-mono leading-relaxed overflow-x-auto select-all">
              {bibtexCitation}
            </pre>
          </div>

          <div className="p-4 bg-[var(--atlas-surface)] border border-[var(--atlas-rule)] rounded-[2px] text-xs text-[var(--atlas-ink-secondary)] leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[var(--atlas-ink)]">
              <Scale className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Dual Open License &amp; Institutional Neutrality Notice</span>
            </div>
            <p>
              Software components are released under the MIT License; structured governance mappings
              and schema documentation in{' '}
              <code className="font-mono text-[var(--atlas-ink)]">src/data/atlas.json</code> carry a
              CC-BY-4.0 attribution license.
            </p>
            <p>
              Maintained independently by Lihui Xu (@lihui-aigov) in a personal scholarly capacity
              using solely official public statutory and standards texts; does not represent
              official positions of UNESCO or Member States.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--atlas-rule)] bg-white flex items-center justify-between gap-4 text-xs">
          <a
            href="https://github.com/lihui-aigov/interoperability-atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-[var(--atlas-accent)] underline underline-offset-4"
          >
            <span>View Repository &amp; CITATION.cff on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-white bg-[var(--atlas-accent)] rounded-[2px] hover:bg-[var(--atlas-accent-hover)] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
