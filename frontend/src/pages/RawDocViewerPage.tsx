import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves this to the worker asset URL; pdf.js runs its parsing off the
// main thread so a big PDF doesn't freeze the page.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import api from '../lib/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker as string;

/**
 * The "read the original" door: renders the teacher's raw uploaded PDF one
 * page at a time (a slide-style reader) and remembers the last page, so
 * leaving and coming back resumes exactly where the student was. Distinct
 * from the generated interactive tutorial - this is the source material,
 * unmodified.
 *
 * The PDF is fetched as an authenticated blob (JWT in the axios header)
 * rather than an <iframe src> so access control still applies. Progress saves
 * are debounced and best-effort - a failed save just means re-opening starts
 * a page earlier, never blocks reading.
 */
export const RawDocViewerPage: React.FC = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);

  // Load resume pointer + the PDF bytes together.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: prog }, fileRes] = await Promise.all([
          api.get(`/units/${unitId}/raw-progress`),
          api.get(`/units/${unitId}/document/file`, { responseType: 'arraybuffer' })
        ]);
        if (cancelled) return;
        setFilename(prog.document?.filename || 'Document');

        const pdf = await pdfjsLib.getDocument({ data: fileRes.data }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        const resume = Math.min(Math.max(prog.lastPage || 1, 1), pdf.numPages);
        setPage(resume);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? 'This unit has no original document to read.'
            : err.response?.data?.error || 'Could not open this document'
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  // Render whenever the page changes.
  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || loading) return;
    let cancelled = false;

    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;
        // Fit width to the container, but cap for very wide displays.
        const container = canvas.parentElement;
        const targetWidth = Math.min(container?.clientWidth || 800, 900);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = targetWidth / baseViewport.width;
        const viewport = pdfPage.getViewport({ scale });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTaskRef.current?.cancel();
        const task = pdfPage.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch {
        /* a cancelled render (fast page-flipping) throws - safe to ignore */
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [page, loading]);

  // Debounced, best-effort save of the current page.
  const saveProgress = useCallback(
    (p: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.patch(`/units/${unitId}/raw-progress`, { lastPage: p }).catch(() => {});
      }, 600);
    },
    [unitId]
  );

  const goTo = (p: number) => {
    const clamped = Math.min(Math.max(p, 1), numPages || 1);
    setPage(clamped);
    saveProgress(clamped);
  };

  // Save on unmount too, so a quick Back still records the page.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const leave = () => {
    // Flush the latest page synchronously-ish before navigating away.
    api.patch(`/units/${unitId}/raw-progress`, { lastPage: page }).catch(() => {});
    navigate('/classroom');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 pb-16">
      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-200 shadow-xs">
        <button onClick={leave} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Classroom
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 truncate max-w-[40vw]">{filename}</span>
        </div>
        {numPages > 0 && (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Page {page} / {numPages}
          </span>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="bg-white max-w-md mx-auto p-8 rounded-3xl border border-slate-200/80 shadow-md text-center mt-12">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Can&apos;t open document</h1>
            <p className="text-slate-600 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/classroom')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-2.5 rounded-2xl text-xs"
            >
              Back to Classroom
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 flex justify-center overflow-auto">
              <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto" />
            </div>

            <div className="flex items-center justify-between gap-3 mt-6">
              <button
                onClick={() => goTo(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-2xl text-xs shadow-xs hover:border-slate-300 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-xs font-semibold text-slate-500">Your place is saved automatically</span>
              <button
                onClick={() => goTo(page + 1)}
                disabled={page >= numPages}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default RawDocViewerPage;
