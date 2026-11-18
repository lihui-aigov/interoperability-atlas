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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xl animate-fade-in">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-slate-500 tabular-nums">
              Dataset v{dataset.metadata.datasetVersion} · Schema {dataset.metadata.schemaVersion}
            </p>
            <h2
              id="citation-modal-title"
              className="font-editorial text-xl font-medium text-slate-950 mt-0.5"
            >
              Cite &amp; Reuse This Atlas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close citation dialog"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-slate-800">
                Policy &amp; Academic Reference (APA 7th Edition)
              </span>
              <button
                type="button"
                onClick={() => handleCopy('apa', apaCitation)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer"
              >
                {copiedFormat === 'apa' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
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
            <p className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-800 leading-relaxed select-all">
              {apaCitation}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-slate-800">BibTeX Entry</span>
              <button
                type="button"
                onClick={() => handleCopy('bibtex', bibtexCitation)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer"
              >
                {copiedFormat === 'bibtex' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
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
            <pre className="p-4 bg-slate-950 text-slate-100 rounded-md text-[11.5px] font-mono leading-relaxed overflow-x-auto select-all">
              {bibtexCitation}
            </pre>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Scale className="w-4 h-4 text-slate-700 shrink-0" aria-hidden="true" />
              <span>Dual Open License &amp; Institutional Neutrality Notice</span>
            </div>
            <p>
              Software components are released under the MIT License; structured governance mappings
              and schema documentation in <code className="font-mono text-slate-800">src/data/atlas.json</code>{' '}
              carry a CC-BY-4.0 attribution license.
            </p>
            <p>
              Maintained independently by Lihui Xu (@lihui-aigov) in a personal scholarly capacity.
              Published using solely official public statutory and standards texts; does not
              represent official positions of UNESCO or Member States.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-4 text-xs">
          <a
            href="https://github.com/lihui-aigov/interoperability-atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-slate-800 hover:text-slate-950 underline underline-offset-4"
          >
            <span>View Repository &amp; CITATION.cff on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
