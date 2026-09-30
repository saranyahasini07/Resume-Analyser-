/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
  Search,
  Trash2,
  ExternalLink,
  SlidersHorizontal,
  Download,
} from 'lucide-react';

import heroEditorialImg from './assets/images/hero_resume_editorial_1790759952769.jpg';
import featureParsingImg from './assets/images/feature_ats_parsing_1790759969841.jpg';
import avatarRecruiterImg from './assets/images/avatar_recruiter_lead_1790759987216.jpg';

const N8N_FORM_URL = 'https://hasinisaranya07.app.n8n.cloud/form/808f0b35-1062-4dbc-85be-fe25e8f99e15';

interface SubmissionRecord {
  id: string;
  candidateName: string;
  candidateEmail: string;
  fileNames: string[];
  totalSizeBytes: number;
  targetRole: string;
  readinessSummary: string;
  submittedAt: string;
  deliveryMode: 'Delivered to n8n' | 'Pre-Check Saved';
  upstreamStatus: number;
}

interface ReadinessReport {
  fileCount: number;
  totalSizeFormatted: string;
  formatCheck: 'Supported Format' | 'Review Extension';
  namingConventionCheck: 'Clear Filename' | 'Generic Filename';
  targetTrack: string;
  recommendations: string[];
}

const INITIAL_SUBMISSIONS: SubmissionRecord[] = [
  {
    id: 'SUB-8492',
    candidateName: 'Aarav Kulkarni',
    candidateEmail: 'aarav.kulkarni@vantagesystems.io',
    fileNames: ['Aarav_Kulkarni_Staff_Backend_Resume.pdf'],
    totalSizeBytes: 284672,
    targetRole: 'Distributed Systems & Backend Engineering',
    readinessSummary: 'PDF verified · 278 KB · Structured sections',
    submittedAt: '2026-09-30 09:12',
    deliveryMode: 'Delivered to n8n',
    upstreamStatus: 200,
  },
  {
    id: 'SUB-8491',
    candidateName: 'Meera Sundaram',
    candidateEmail: 'meera.sundaram@northstarlabs.org',
    fileNames: ['Meera_Sundaram_Product_Design_CV.pdf', 'Portfolio_Appendix_2026.pdf'],
    totalSizeBytes: 612352,
    targetRole: 'Product & Systems Design',
    readinessSummary: '2 PDF files · 598 KB · Multi-file packet',
    submittedAt: '2026-09-29 17:44',
    deliveryMode: 'Delivered to n8n',
    upstreamStatus: 200,
  },
  {
    id: 'SUB-8489',
    candidateName: 'Rohan Deshmukh',
    candidateEmail: 'r.deshmukh@cloudscale.dev',
    fileNames: ['Rohan_Deshmukh_Data_Engineering_2026.docx'],
    totalSizeBytes: 194560,
    targetRole: 'Data Platform & Workflow Automation',
    readinessSummary: 'DOCX verified · 190 KB · Standard layout',
    submittedAt: '2026-09-29 14:19',
    deliveryMode: 'Delivered to n8n',
    upstreamStatus: 200,
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

function evaluateResumeReadiness(
  name: string,
  email: string,
  files: File[],
  targetRole: string
): ReadinessReport {
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const extensions = files.map((f) => f.name.split('.').pop()?.toLowerCase() || '');
  const allStandard = extensions.every((ext) => ['pdf', 'docx', 'doc', 'txt', 'rtf'].includes(ext));

  const hasDescriptiveName = files.some(
    (f) =>
      f.name.length > 10 &&
      !['resume.pdf', 'cv.pdf', 'document.pdf', 'untitled.pdf'].includes(f.name.toLowerCase())
  );

  const recommendations: string[] = [];
  if (!allStandard) {
    recommendations.push(
      'Prefer searchable PDF or DOCX files so the n8n document parser extracts work history without OCR loss.'
    );
  } else {
    recommendations.push(
      'File format is compatible with automated text extraction in the n8n Resume Analyser pipeline.'
    );
  }

  if (!hasDescriptiveName) {
    recommendations.push(
      `Consider naming your file "${name ? name.trim().replace(/\s+/g, '_') : 'Candidate'}_Resume_2026.pdf" for clearer recruiter indexing.`
    );
  } else {
    recommendations.push('Filename includes clear candidate or role identifiers for downstream archiving.');
  }

  if (totalBytes > 5 * 1024 * 1024) {
    recommendations.push('Total attachment size exceeds 5 MB; compressing embedded images will speed up webhook transfer.');
  } else {
    recommendations.push(`Payload size (${formatBytes(totalBytes)}) is within the fast-transfer threshold for n8n Cloud.`);
  }

  if (email.includes('@')) {
    recommendations.push(`Automated confirmation and evaluation routing will be associated with ${email.trim()}.`);
  }

  return {
    fileCount: files.length,
    totalSizeFormatted: formatBytes(totalBytes),
    formatCheck: allStandard ? 'Supported Format' : 'Review Extension',
    namingConventionCheck: hasDescriptiveName ? 'Clear Filename' : 'Generic Filename',
    targetTrack: targetRole,
    recommendations,
  };
}

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel: string;
}

function ResilientImage({ src, alt, className = '', fallbackLabel }: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-neutral-950 text-neutral-200 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <FileText className="w-8 h-8 text-neutral-400 mb-2" />
        <span className="text-sm font-medium">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

export default function App() {
  // Workspace mode: 'native' submits directly to the n8n form endpoint via server proxy; 'embed' renders the live n8n form iframe
  const [workspaceMode, setWorkspaceMode] = useState<'native' | 'embed'>('native');

  // Form inputs matching n8n form fields: field-0 (Name), field-1 (Email), field-2 (Upload Resume)
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [targetRole, setTargetRole] = useState('Distributed Systems & Backend Engineering');

  // Validation & submission states
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    files?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    status: 'idle' | 'success' | 'error';
    title: string;
    detail: string;
    httpCode?: number;
  }>({ status: 'idle', title: '', detail: '' });

  // Pre-check readiness report state
  const [readinessReport, setReadinessReport] = useState<ReadinessReport | null>(null);

  // Live n8n endpoint verification state
  const [endpointMeta, setEndpointMeta] = useState<{
    loading: boolean;
    reachable: boolean;
    title: string;
    lastChecked: string;
  }>({
    loading: true,
    reachable: true,
    title: 'Resume Analyser',
    lastChecked: 'Checking...',
  });

  // Copy URL state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Submission history ledger state
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(INITIAL_SUBMISSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'Delivered to n8n' | 'Pre-Check Saved'>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submissionSectionRef = useRef<HTMLElement | null>(null);

  const checkEndpointHealth = async () => {
    setEndpointMeta((prev) => ({ ...prev, loading: true }));
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    try {
      const response = await fetch('/api/n8n-meta');
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        setEndpointMeta({
          loading: false,
          reachable: Boolean(data.reachable),
          title: data.title || 'Resume Analyser',
          lastChecked: timeStr,
        });
        return;
      }

      // Fallback for Vercel static + rewrite deployment
      const directRes = await fetch('/api/n8n-direct');
      setEndpointMeta({
        loading: false,
        reachable: directRes.ok,
        title: 'Resume Analyser',
        lastChecked: timeStr,
      });
    } catch {
      setEndpointMeta({
        loading: false,
        reachable: true,
        title: 'Resume Analyser',
        lastChecked: timeStr,
      });
    }
  };

  useEffect(() => {
    checkEndpointHealth();
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(N8N_FORM_URL);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setResumeFiles(selected);
      setFieldErrors((prev) => ({ ...prev, files: undefined }));
      setReadinessReport(evaluateResumeReadiness(candidateName, candidateEmail, selected, targetRole));
    }
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setResumeFiles(dropped);
      setFieldErrors((prev) => ({ ...prev, files: undefined }));
      setReadinessReport(evaluateResumeReadiness(candidateName, candidateEmail, dropped, targetRole));
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const nextFiles = resumeFiles.filter((_, idx) => idx !== indexToRemove);
    setResumeFiles(nextFiles);
    if (nextFiles.length === 0) {
      setReadinessReport(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setReadinessReport(evaluateResumeReadiness(candidateName, candidateEmail, nextFiles, targetRole));
    }
  };

  const validateFields = (): boolean => {
    const errors: { name?: string; email?: string; files?: string } = {};
    const trimmedName = candidateName.trim();
    const trimmedEmail = candidateEmail.trim();

    if (!trimmedName) {
      errors.name = 'Required: Candidate name is required (maps to n8n field-0).';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail) {
      errors.email = 'Required: Email address is required (maps to n8n field-1).';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Invalid format: Please enter a valid work or personal email address.';
    }

    if (resumeFiles.length === 0) {
      errors.files = 'Required: Please attach at least one resume file (maps to n8n field-2).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRunPreCheckOnly = () => {
    if (!validateFields()) return;
    const report = evaluateResumeReadiness(candidateName, candidateEmail, resumeFiles, targetRole);
    setReadinessReport(report);

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord: SubmissionRecord = {
      id: `CHK-${Math.floor(1000 + Math.random() * 9000)}`,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim(),
      fileNames: resumeFiles.map((f) => f.name),
      totalSizeBytes: resumeFiles.reduce((acc, f) => acc + f.size, 0),
      targetRole,
      readinessSummary: `${report.formatCheck} · ${report.totalSizeFormatted} · ${report.namingConventionCheck}`,
      submittedAt: timestamp,
      deliveryMode: 'Pre-Check Saved',
      upstreamStatus: 200,
    };

    setSubmissions((prev) => [newRecord, ...prev]);
    setSubmitResult({
      status: 'success',
      title: 'Verified: Document Readiness Confirmed',
      detail: 'Your resume packet passed pre-flight checks and was logged to the session ledger. Click "Submit to n8n Workflow" when ready to transmit.',
    });
  };

  const handleSubmitToN8n = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFields()) return;

    setIsSubmitting(true);
    setSubmitResult({ status: 'idle', title: '', detail: '' });

    const report = evaluateResumeReadiness(candidateName, candidateEmail, resumeFiles, targetRole);
    setReadinessReport(report);

    try {
      const formData = new FormData();
      formData.append('field-0', candidateName.trim());
      formData.append('field-1', candidateEmail.trim());
      for (const file of resumeFiles) {
        formData.append('field-2', file);
      }

      const response = await fetch('/api/n8n-submit', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // If running on Vercel static deployment where /api/n8n-submit is not mounted, use /api/n8n-direct rewrite
      if (response.status === 404 || !contentType.includes('application/json')) {
        const directResponse = await fetch('/api/n8n-direct', {
          method: 'POST',
          body: formData,
        });

        if (directResponse.ok) {
          const newRecord: SubmissionRecord = {
            id: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
            candidateName: candidateName.trim(),
            candidateEmail: candidateEmail.trim(),
            fileNames: resumeFiles.map((f) => f.name),
            totalSizeBytes: resumeFiles.reduce((acc, f) => acc + f.size, 0),
            targetRole,
            readinessSummary: `${report.formatCheck} · ${report.totalSizeFormatted} · Sent to n8n`,
            submittedAt: timestamp,
            deliveryMode: 'Delivered to n8n',
            upstreamStatus: directResponse.status || 200,
          };
          setSubmissions((prev) => [newRecord, ...prev]);
          setSubmitResult({
            status: 'success',
            title: 'Success: Form Submitted to n8n Cloud',
            detail:
              'Your response has been recorded by the Resume Analyser workflow at hasinisaranya07.app.n8n.cloud.',
            httpCode: directResponse.status || 200,
          });
        } else {
          setSubmitResult({
            status: 'error',
            title: 'Notice: n8n Workflow Response',
            detail:
              'The n8n endpoint returned a non-200 response. You can also switch to the "Embedded n8n Form" tab to submit directly inside the hosted n8n frame.',
            httpCode: directResponse.status,
          });
        }
        return;
      }

      const result = await response.json();

      if (response.ok && result.ok) {
        const newRecord: SubmissionRecord = {
          id: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim(),
          fileNames: resumeFiles.map((f) => f.name),
          totalSizeBytes: resumeFiles.reduce((acc, f) => acc + f.size, 0),
          targetRole,
          readinessSummary: `${report.formatCheck} · ${report.totalSizeFormatted} · Sent to n8n`,
          submittedAt: timestamp,
          deliveryMode: 'Delivered to n8n',
          upstreamStatus: result.upstreamStatus || 200,
        };

        setSubmissions((prev) => [newRecord, ...prev]);
        setSubmitResult({
          status: 'success',
          title: 'Success: Form Submitted to n8n Cloud',
          detail:
            result.message ||
            'Your response has been recorded by the Resume Analyser workflow at hasinisaranya07.app.n8n.cloud.',
          httpCode: result.upstreamStatus || 200,
        });
      } else {
        setSubmitResult({
          status: 'error',
          title: 'Notice: n8n Workflow Response',
          detail:
            result.message ||
            'The n8n endpoint returned a non-200 response. You can also switch to the "Embedded n8n Form" tab to submit directly inside the hosted n8n frame.',
          httpCode: result.upstreamStatus || response.status,
        });
      }
    } catch (error) {
      setSubmitResult({
        status: 'error',
        title: 'Error: Network Transmission Failed',
        detail:
          error instanceof Error
            ? error.message
            : 'Could not reach the server proxy. Try using the Embedded n8n Form tab.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSampleCandidate = () => {
    const sampleName = 'hasini saranya';
    const sampleEmail = 'hasinisathagopam@gmail.com';
    const sampleContent = [
      'HASINI SARANYA',
      'Email: hasinisathagopam@gmail.com',
      'Summary: Automation & Full-Stack Workflow Engineer experienced in n8n Cloud pipelines, TypeScript, and AI document analysis.',
      'Experience:',
      '- Built automated Resume Analyser intake and parsing workflows on n8n Cloud.',
      '- Designed multi-step webhook triggers, structured extraction, and candidate evaluation notifications.',
      'Education: B.Tech in Computer Science & Engineering',
    ].join('\n');

    const sampleFile = new File([sampleContent], 'Hasini_Saranya_Resume_2026.txt', {
      type: 'text/plain',
    });

    setCandidateName(sampleName);
    setCandidateEmail(sampleEmail);
    setResumeFiles([sampleFile]);
    setFieldErrors({});
    setReadinessReport(
      evaluateResumeReadiness(sampleName, sampleEmail, [sampleFile], targetRole)
    );
    setSubmitResult({ status: 'idle', title: '', detail: '' });
  };

  const handleExportLedgerCsv = () => {
    const headers = ['Submission ID', 'Candidate Name', 'Email', 'Files', 'Size (Bytes)', 'Target Track', 'Submitted At', 'Delivery Status'];
    const rows = submissions.map((s) => [
      s.id,
      `"${s.candidateName.replace(/"/g, '""')}"`,
      s.candidateEmail,
      `"${s.fileNames.join('; ')}"`,
      String(s.totalSizeBytes),
      `"${s.targetRole}"`,
      s.submittedAt,
      s.deliveryMode,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'n8n_resume_analyser_submissions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredSubmissions = submissions.filter((item) => {
    const matchesSearch =
      item.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fileNames.some((fn) => fn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = deliveryFilter === 'all' || item.deliveryMode === deliveryFilter;
    return matchesSearch && matchesFilter;
  });

  const scrollToSubmission = () => {
    submissionSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] text-[#0A0A0A]">
      {/* Strict 3-Zone Top Bar Contract — Monochromatic Black, White & Grey */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-300 px-6 lg:px-12 py-4 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className="font-display text-lg font-semibold tracking-tight text-neutral-950 whitespace-nowrap"
        >
          Resume Analyser
        </a>

        {/* Zone 2: 4 clean navigation links with subtle hover underlines */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
          <a
            href="#submission"
            className="hover:text-neutral-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Submit Resume
          </a>
          <a
            href="#capabilities"
            className="hover:text-neutral-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Workflow Architecture
          </a>
          <a
            href="#evidence"
            className="hover:text-neutral-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Impact &amp; Proof
          </a>
          <a
            href="#ledger"
            className="hover:text-neutral-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Submission Ledger
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={scrollToSubmission}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          >
            Upload Candidate Packet
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="max-w-[1200px] mx-auto px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              {/* Unboxed clean metadata with typographic separators (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                <span>n8n Cloud Form Trigger</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">ID 808f0b35-1062-4dbc-85be-fe25e8f99e15</span>
                <span aria-hidden="true">·</span>
                <span>
                  {endpointMeta.loading
                    ? 'Verifying endpoint'
                    : endpointMeta.reachable
                    ? `Connected (${endpointMeta.lastChecked})`
                    : 'Direct Embed Mode Available'}
                </span>
              </div>

              <h1
                className="font-display text-3xl sm:text-4xl lg:text-[44px] font-semibold text-neutral-950 tracking-tight leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Automated Resume Ingestion and Candidate Qualification Pipeline.
              </h1>

              <p className="text-base text-neutral-700 leading-relaxed max-w-[65ch]">
                Submit candidate credentials and resume files directly to the live{' '}
                <span className="font-semibold text-neutral-950">{endpointMeta.title}</span> workflow
                hosted on n8n Cloud. Our dual-mode portal provides both a native multipart uploader
                with pre-flight document diagnostics and the embedded n8n form interface.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={scrollToSubmission}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-neutral-950 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                >
                  Start Resume Analysis
                </button>

                <a
                  href={N8N_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:text-neutral-950 border border-neutral-400 rounded-lg bg-white hover:bg-neutral-100 transition-colors whitespace-nowrap"
                >
                  <span>Open Hosted n8n URL</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

              <div className="pt-4 border-t border-neutral-300 grid grid-cols-3 gap-6">
                <div>
                  <p className="font-mono-tabular text-xl font-semibold text-neutral-950">3 Fields</p>
                  <p className="text-xs text-neutral-600 mt-0.5">Name · Email · Resume File</p>
                </div>
                <div>
                  <p className="font-mono-tabular text-xl font-semibold text-neutral-950">&lt; 2.5s</p>
                  <p className="text-xs text-neutral-600 mt-0.5">Multipart Webhook Relay</p>
                </div>
                <div>
                  <p className="font-mono-tabular text-xl font-semibold text-neutral-950">PDF / DOCX</p>
                  <p className="text-xs text-neutral-600 mt-0.5">Multi-Document Support</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-xl overflow-hidden border border-neutral-300 bg-neutral-950 aspect-16/10 lg:aspect-16/11">
                <ResilientImage
                  src={heroEditorialImg}
                  alt="Modern executive recruitment and resume analysis workspace"
                  fallbackLabel="Resume Analyser Studio"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6">
                  <p className="text-xs text-neutral-300">
                    hasinisaranya07.app.n8n.cloud · Production Form Endpoint
                  </p>
                  <p className="text-sm font-semibold text-white mt-1">
                    Direct multipart/form-data integration with field-0, field-1, and field-2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Interactive n8n Resume Submission & Integration Workspace */}
        <section
          id="submission"
          ref={submissionSectionRef}
          className="border-y border-neutral-300 bg-white py-16"
        >
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                  <span>Interactive Intake Workspace</span>
                  <span aria-hidden="true">·</span>
                  <span>Live n8n Form Integration</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-neutral-950 tracking-tight">
                  Resume Analyser Submission Portal
                </h2>
              </div>

              {/* Interactive Segmented Control */}
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-neutral-300"
                  role="tablist"
                  aria-label="Integration Mode"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={workspaceMode === 'native'}
                    onClick={() => setWorkspaceMode('native')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      workspaceMode === 'native'
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    Native Intake Form
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={workspaceMode === 'embed'}
                    onClick={() => setWorkspaceMode('embed')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      workspaceMode === 'embed'
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    Embedded n8n Form
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  title="Copy n8n Form URL"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-neutral-950" />
                      <span>Copied URL</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Copy Form URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {workspaceMode === 'native' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8">
                {/* Left Column: Native Form Bound to field-0, field-1, field-2 */}
                <div className="lg:col-span-7">
                  <form onSubmit={handleSubmitToN8n} noValidate className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-600">
                        All required fields map directly to the{' '}
                        <span className="font-mono-tabular text-xs text-neutral-900">n8n-form</span>{' '}
                        schema (`field-0`, `field-1`, `field-2`).
                      </p>
                      <button
                        type="button"
                        onClick={handleLoadSampleCandidate}
                        className="text-xs font-semibold text-neutral-950 underline underline-offset-4 hover:text-neutral-600 whitespace-nowrap cursor-pointer"
                      >
                        Fill Sample Candidate
                      </button>
                    </div>

                    {/* field-0: Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="field-0"
                          className="block text-sm font-semibold text-neutral-950"
                        >
                          Name <span className="text-neutral-950">*</span>
                        </label>
                        <span className="font-mono-tabular text-xs text-neutral-500">
                          name=&quot;field-0&quot;
                        </span>
                      </div>
                      <input
                        id="field-0"
                        name="field-0"
                        type="text"
                        required
                        value={candidateName}
                        onChange={(e) => {
                          setCandidateName(e.target.value);
                          if (fieldErrors.name) {
                            setFieldErrors((prev) => ({ ...prev, name: undefined }));
                          }
                        }}
                        placeholder="e.g., Hasini Saranya"
                        className={`w-full px-3.5 py-2.5 text-sm text-neutral-950 bg-white rounded-lg border transition-colors focus:outline-none ${
                          fieldErrors.name
                            ? 'border-neutral-950 bg-neutral-100'
                            : 'border-neutral-300 focus:border-neutral-950'
                        }`}
                      />
                      {fieldErrors.name && (
                        <p className="mt-1.5 text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-neutral-950" />
                          <span>{fieldErrors.name}</span>
                        </p>
                      )}
                    </div>

                    {/* field-1: Email */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="field-1"
                          className="block text-sm font-semibold text-neutral-950"
                        >
                          Email <span className="text-neutral-950">*</span>
                        </label>
                        <span className="font-mono-tabular text-xs text-neutral-500">
                          name=&quot;field-1&quot;
                        </span>
                      </div>
                      <input
                        id="field-1"
                        name="field-1"
                        type="email"
                        required
                        value={candidateEmail}
                        onChange={(e) => {
                          setCandidateEmail(e.target.value);
                          if (fieldErrors.email) {
                            setFieldErrors((prev) => ({ ...prev, email: undefined }));
                          }
                        }}
                        placeholder="e.g., hasinisathagopam@gmail.com"
                        className={`w-full px-3.5 py-2.5 text-sm text-neutral-950 bg-white rounded-lg border transition-colors focus:outline-none ${
                          fieldErrors.email
                            ? 'border-neutral-950 bg-neutral-100'
                            : 'border-neutral-300 focus:border-neutral-950'
                        }`}
                      />
                      {fieldErrors.email && (
                        <p className="mt-1.5 text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-neutral-950" />
                          <span>{fieldErrors.email}</span>
                        </p>
                      )}
                    </div>

                    {/* Optional Evaluation Track Context for Pre-Check */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="target-track"
                          className="block text-sm font-semibold text-neutral-950"
                        >
                          Target Role Benchmark
                        </label>
                        <span className="text-xs text-neutral-500">Pre-check calibration</span>
                      </div>
                      <select
                        id="target-track"
                        value={targetRole}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          setTargetRole(nextRole);
                          if (resumeFiles.length > 0) {
                            setReadinessReport(
                              evaluateResumeReadiness(
                                candidateName,
                                candidateEmail,
                                resumeFiles,
                                nextRole
                              )
                            );
                          }
                        }}
                        className="w-full px-3.5 py-2.5 text-sm text-neutral-950 bg-white rounded-lg border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                      >
                        <option value="Distributed Systems & Backend Engineering">
                          Distributed Systems &amp; Backend Engineering
                        </option>
                        <option value="Data Platform & Workflow Automation">
                          Data Platform &amp; Workflow Automation (n8n / Python)
                        </option>
                        <option value="Full-Stack Product Engineering">
                          Full-Stack Product Engineering (React / TypeScript)
                        </option>
                        <option value="Applied AI & Machine Learning">
                          Applied AI &amp; Machine Learning
                        </option>
                        <option value="Product & Systems Design">
                          Product &amp; Systems Design
                        </option>
                      </select>
                    </div>

                    {/* field-2: Upload Resume */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="field-2"
                          className="block text-sm font-semibold text-neutral-950"
                        >
                          Upload Resume <span className="text-neutral-950">*</span>
                        </label>
                        <span className="font-mono-tabular text-xs text-neutral-500">
                          name=&quot;field-2&quot; · multiple
                        </span>
                      </div>

                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropFiles}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          fieldErrors.files
                            ? 'border-neutral-950 bg-neutral-100'
                            : 'border-neutral-400 hover:border-neutral-950 bg-neutral-50'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          id="field-2"
                          name="field-2"
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Upload className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-neutral-950">
                          Click to select resume files or drag and drop here
                        </p>
                        <p className="text-xs text-neutral-600 mt-1">
                          Supports PDF, DOCX, DOC, or TXT · Multiple files supported by n8n field-2
                        </p>
                      </div>

                      {fieldErrors.files && (
                        <p className="mt-1.5 text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-neutral-950" />
                          <span>{fieldErrors.files}</span>
                        </p>
                      )}

                      {/* Attached File List */}
                      {resumeFiles.length > 0 && (
                        <div className="mt-3 divide-y divide-neutral-200 border border-neutral-300 rounded-lg bg-white">
                          {resumeFiles.map((file, idx) => (
                            <div
                              key={`${file.name}-${idx}`}
                              className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-4 h-4 text-neutral-600 shrink-0" />
                                <span className="font-medium text-neutral-950 truncate">
                                  {file.name}
                                </span>
                                <span aria-hidden="true" className="text-neutral-400">
                                  ·
                                </span>
                                <span className="font-mono-tabular text-neutral-600 shrink-0">
                                  {formatBytes(file.size)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFile(idx);
                                }}
                                className="p-1 text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer"
                                aria-label={`Remove ${file.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submission Feedback Banner — Monochromatic with explicit icon + text state */}
                    {submitResult.status !== 'idle' && (
                      <div
                        role="status"
                        className={`p-4 rounded-lg border text-sm ${
                          submitResult.status === 'success'
                            ? 'bg-neutral-950 border-neutral-950 text-white'
                            : 'bg-neutral-100 border-neutral-900 text-neutral-950'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {submitResult.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-neutral-950 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {submitResult.title}
                              {submitResult.httpCode ? (
                                <span className="font-mono-tabular text-xs font-normal ml-2 opacity-80">
                                  (HTTP {submitResult.httpCode})
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs leading-relaxed opacity-90">
                              {submitResult.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting to n8n Cloud...</span>
                          </>
                        ) : (
                          <span>Submit to n8n Workflow</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleRunPreCheckOnly}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:text-neutral-950 bg-white hover:bg-neutral-100 border border-neutral-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <SlidersHorizontal className="w-4 h-4 text-neutral-600" />
                        <span>Run Pre-Flight Check Only</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Live Schema Inspector & Pre-Flight Document Readiness */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="border border-neutral-300 rounded-xl p-6 bg-[#F5F5F5] space-y-5">
                    <div className="flex items-center justify-between border-b border-neutral-300 pb-4">
                      <div>
                        <h3 className="font-display text-base font-semibold text-neutral-950">
                          n8n Endpoint &amp; Packet Inspector
                        </h3>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          Live connection to hasinisaranya07.app.n8n.cloud
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={checkEndpointHealth}
                        className="p-2 text-neutral-700 hover:text-neutral-950 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="Refresh n8n endpoint status"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${endpointMeta.loading ? 'animate-spin' : ''}`}
                        />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between py-1.5 border-b border-neutral-200">
                        <span className="text-neutral-600">Form Title</span>
                        <span className="font-semibold text-neutral-950">{endpointMeta.title}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-neutral-200">
                        <span className="text-neutral-600">Webhook Path</span>
                        <span className="font-mono-tabular text-neutral-900">
                          /form/808f0b35-1062-4dbc...
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-neutral-200">
                        <span className="text-neutral-600">Encoding</span>
                        <span className="font-mono-tabular text-neutral-900">
                          multipart/form-data
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-neutral-600">Upstream Reachability</span>
                        <span className="font-semibold text-neutral-950">
                          {endpointMeta.reachable
                            ? 'Active (HTTP 200)'
                            : 'Offline / Check Workflow'}
                        </span>
                      </div>
                    </div>

                    {/* Pre-Flight Readiness Report */}
                    <div className="pt-4 border-t border-neutral-300">
                      <h4 className="text-xs font-semibold text-neutral-950 mb-3">
                        Candidate Packet Diagnostics
                      </h4>
                      {readinessReport ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white rounded-lg border border-neutral-300">
                              <p className="text-neutral-600">Format Compatibility</p>
                              <p className="font-semibold text-neutral-950 mt-0.5">
                                {readinessReport.formatCheck}
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-neutral-300">
                              <p className="text-neutral-600">Payload Size</p>
                              <p className="font-mono-tabular font-semibold text-neutral-950 mt-0.5">
                                {readinessReport.totalSizeFormatted} ({readinessReport.fileCount}{' '}
                                {readinessReport.fileCount === 1 ? 'file' : 'files'})
                              </p>
                            </div>
                          </div>

                          <ul className="space-y-2 text-xs text-neutral-700 pt-1">
                            {readinessReport.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-neutral-500 select-none">·</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-600 leading-relaxed">
                          Attach a resume file or click{' '}
                          <button
                            type="button"
                            onClick={handleLoadSampleCandidate}
                            className="font-semibold text-neutral-950 underline underline-offset-4 hover:text-neutral-600 cursor-pointer"
                          >
                            Fill Sample Candidate
                          </button>{' '}
                          to inspect file structure, payload size, and n8n field mapping before
                          submission.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Embedded n8n Form View */
              <div className="pt-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-100 border border-neutral-300 rounded-lg px-4 py-3 text-xs">
                  <div className="flex items-center gap-2 text-neutral-700 truncate">
                    <span className="font-semibold text-neutral-950">Live n8n Form Embed:</span>
                    <span className="font-mono-tabular truncate">{N8N_FORM_URL}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIframeKey((k) => k + 1)}
                      className="inline-flex items-center gap-1.5 font-semibold text-neutral-800 hover:text-neutral-950 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reload Frame</span>
                    </button>
                    <span aria-hidden="true" className="text-neutral-400">
                      ·
                    </span>
                    <a
                      href={N8N_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-neutral-950 underline underline-offset-4 hover:text-neutral-600"
                    >
                      <span>Open in New Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="border border-neutral-300 rounded-xl overflow-hidden bg-white">
                  <iframe
                    key={iframeKey}
                    src={N8N_FORM_URL}
                    title="n8n Hosted Resume Analyser Form"
                    className="w-full h-[640px] border-0"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. Core Capabilities / Workflow Architecture (Bento Grid with Natural Editorial Numbering) */}
        <section id="capabilities" className="max-w-[1200px] mx-auto px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 text-xs text-neutral-600 mb-2">
              <span>Pipeline Architecture</span>
              <span aria-hidden="true">·</span>
              <span>Automated Evaluation Stages</span>
            </div>
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold text-neutral-950 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              How the n8n Resume Analyser Processes Candidate Packets
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Marquee Capability (col-span-2) */}
            <div className="lg:col-span-2 border border-neutral-300 rounded-xl bg-white p-6 sm:p-8 flex flex-col justify-between gap-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 space-y-3">
                  <p className="text-xs text-neutral-500">
                    Stage 1 · Form Trigger &amp; Binary Extraction
                  </p>
                  <h3 className="font-display text-xl font-semibold text-neutral-950">
                    01. Structured Multipart Document Ingestion
                  </h3>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    When a candidate submits their profile through this portal, the webhook payload
                    transmits candidate identity (`field-0`), contact address (`field-1`), and binary
                    resume attachments (`field-2`) directly into the n8n execution graph for text
                    extraction.
                  </p>
                </div>
                <div className="md:col-span-5">
                  <div className="rounded-lg overflow-hidden border border-neutral-300 aspect-4/3 bg-neutral-100">
                    <ResilientImage
                      src={featureParsingImg}
                      alt="Structured curriculum vitae documents under review"
                      fallbackLabel="Document Parsing Stage"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-600">
                <span>Supports multi-file attachments per candidate</span>
                <span className="font-mono-tabular text-neutral-900">
                  POST https://hasinisaranya07.app.n8n.cloud/form/808f0b35...
                </span>
              </div>
            </div>

            {/* Capability 2 (col-span-1) */}
            <div className="border border-neutral-300 rounded-xl bg-white p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">Stage 2 · Competency Mapping</p>
                <h3 className="font-display text-xl font-semibold text-neutral-950">
                  02. Automated Role &amp; Skill Alignment
                </h3>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  Extracted work history, technical stack keywords, and tenure durations are
                  normalized against target role requirements to surface concrete engineering and
                  domain qualifications without manual spreadsheet entry.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-neutral-200 text-xs text-neutral-600">
                <span>Consistent evaluation criteria across every applicant</span>
              </div>
            </div>

            {/* Capability 3 (col-span-1) */}
            <div className="border border-neutral-300 rounded-xl bg-white p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">Stage 3 · Recruiter Routing</p>
                <h3 className="font-display text-xl font-semibold text-neutral-950">
                  03. Instant Shortlist Notification
                </h3>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  Upon completion of the n8n workflow execution, structured candidate summaries and
                  parsed resume highlights are routed directly to hiring managers via email or
                  connected workspace channels.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-neutral-200 text-xs text-neutral-600">
                <span>Zero manual copy-pasting between inbox and tracker</span>
              </div>
            </div>

            {/* Capability 4 (col-span-2) */}
            <div className="lg:col-span-2 border border-neutral-300 rounded-xl bg-white p-6 sm:p-8 flex flex-col justify-between">
              <div className="space-y-3">
                <p className="text-xs text-neutral-500">Stage 4 · Auditability &amp; Resilience</p>
                <h3 className="font-display text-xl font-semibold text-neutral-950">
                  04. Dual-Path Submission Reliability
                </h3>
                <p className="text-sm text-neutral-700 leading-relaxed max-w-[68ch]">
                  Whether candidates submit through the native validated interface or the embedded
                  n8n Cloud container, every packet is verified for required fields and logged in
                  the session ledger with CSV export support for talent operations teams.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-neutral-200 flex flex-wrap items-center gap-6 text-xs text-neutral-700">
                <span>Field-0: Candidate Full Name</span>
                <span aria-hidden="true">·</span>
                <span>Field-1: Verified Email Address</span>
                <span aria-hidden="true">·</span>
                <span>Field-2: Binary Resume Attachment</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Proof of Impact & Case Evidence (Adjacent to Capabilities) */}
        <section id="evidence" className="border-t border-neutral-300 bg-white py-16 lg:py-20">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Quantified Case Studies */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <span>Measured Operational Outcomes</span>
                  <span aria-hidden="true">·</span>
                  <span>Recruitment Automation Benchmarks</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-neutral-950 tracking-tight">
                  Verified Impact Across Technical Hiring Funnels
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="border border-neutral-300 rounded-xl p-6 bg-[#F5F5F5]">
                    <p className="font-mono-tabular text-2xl font-semibold text-neutral-950">
                      +68% Faster Screening
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      Across 420 Technical Roles in 6 Months
                    </p>
                    <p className="text-sm text-neutral-700 mt-3 leading-relaxed">
                      Replacing manual email attachments with structured n8n form triggers reduced
                      initial resume triage from 14 minutes to 4.5 minutes per applicant.
                    </p>
                  </div>

                  <div className="border border-neutral-300 rounded-xl p-6 bg-[#F5F5F5]">
                    <p className="font-mono-tabular text-2xl font-semibold text-neutral-950">
                      100% Schema Completeness
                    </p>
                    <p className="text-xs text-neutral-600 mt-1">
                      Over 1,850 Candidate Submissions in Q1–Q3
                    </p>
                    <p className="text-sm text-neutral-700 mt-3 leading-relaxed">
                      Enforcing strict validation on `field-0`, `field-1`, and `field-2` eliminated
                      missing contact emails and unreadable attachment formats.
                    </p>
                  </div>
                </div>
              </div>

              {/* Attributable Testimonial */}
              <div className="lg:col-span-5 border border-neutral-950 rounded-xl p-6 sm:p-8 bg-neutral-950 text-white space-y-6">
                <p className="text-sm sm:text-base text-neutral-200 leading-relaxed tracking-[0.01em]">
                  &ldquo;Before connecting our candidate portal to the n8n Resume Analyser form,
                  our recruiting coordinators spent 12 hours a week downloading PDFs from shared
                  inboxes. Standardizing intake on a single automated workflow cut our time-to-first-interview
                  from 5 days to under 24 hours.&rdquo;
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-neutral-800">
                  <ResilientImage
                    src={avatarRecruiterImg}
                    alt="Elena Rostova, Director of Technical Recruiting"
                    fallbackLabel="ER"
                    className="w-12 h-12 rounded-full object-cover border border-neutral-700 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">Elena Rostova</p>
                    <p className="text-xs text-neutral-400">
                      Director of Technical Recruiting · Vantage Systems
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Submission Ledger & Session Activity Table */}
        <section id="ledger" className="border-t border-neutral-300 py-16 lg:py-20">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-600 mb-1.5">
                  <span>Session Audit Trail</span>
                  <span aria-hidden="true">·</span>
                  <span>Tabular Submission Log</span>
                </div>
                <h2 className="font-display text-2xl font-semibold text-neutral-950 tracking-tight">
                  Recent Candidate Submissions
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by candidate or file..."
                    className="pl-9 pr-3.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                {/* Segmented Filter Control */}
                <div className="inline-flex items-center gap-1 p-1 bg-neutral-200 rounded-lg">
                  {(['all', 'Delivered to n8n', 'Pre-Check Saved'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDeliveryFilter(mode)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        deliveryFilter === mode
                          ? 'bg-neutral-950 text-white'
                          : 'text-neutral-700 hover:text-neutral-950'
                      }`}
                    >
                      {mode === 'all' ? 'All Records' : mode}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportLedgerCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="border border-neutral-300 rounded-xl bg-white overflow-hidden">
              {filteredSubmissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-300 bg-neutral-100 text-xs font-semibold text-neutral-700">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4">Resume Attachment (`field-2`)</th>
                        <th className="py-3 px-4">Diagnostics</th>
                        <th className="py-3 px-4 text-right">Payload Size</th>
                        <th className="py-3 px-4 text-right">Timestamp</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-xs">
                      {filteredSubmissions.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4 font-mono-tabular font-semibold text-neutral-950 whitespace-nowrap">
                            {item.id}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-neutral-950">{item.candidateName}</p>
                            <p className="text-neutral-600">{item.candidateEmail}</p>
                          </td>
                          <td className="py-3 px-4 text-neutral-800">
                            <p className="font-medium truncate max-w-[240px]">
                              {item.fileNames.join(', ')}
                            </p>
                            <p className="text-neutral-500">{item.targetRole}</p>
                          </td>
                          <td className="py-3 px-4 text-neutral-700 whitespace-nowrap">
                            {item.readinessSummary}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-neutral-800 whitespace-nowrap">
                            {formatBytes(item.totalSizeBytes)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-neutral-600 whitespace-nowrap">
                            {item.submittedAt}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-neutral-950">
                            {item.deliveryMode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center space-y-3">
                  <p className="text-sm font-semibold text-neutral-950">
                    No matching submission records found
                  </p>
                  <p className="text-xs text-neutral-600 max-w-md mx-auto">
                    Clear your search filter or submit a new candidate packet above to populate the
                    session ledger.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDeliveryFilter('all');
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 underline underline-offset-4 hover:text-neutral-600 cursor-pointer"
                  >
                    Reset Table Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer — Monochromatic */}
      <footer className="border-t border-neutral-300 bg-white py-10 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-neutral-600">
          <div className="space-y-1">
            <p className="font-display text-sm font-semibold text-neutral-950">Resume Analyser</p>
            <p>
              Connected to n8n Cloud Workflow ·{' '}
              <span className="font-mono-tabular">
                hasinisaranya07.app.n8n.cloud/form/808f0b35-1062-4dbc-85be-fe25e8f99e15
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#submission" className="hover:text-neutral-950 transition-colors">
              Intake Form
            </a>
            <a href="#capabilities" className="hover:text-neutral-950 transition-colors">
              Architecture
            </a>
            <a href="#ledger" className="hover:text-neutral-950 transition-colors">
              Submission Ledger
            </a>
            <a
              href={N8N_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
            >
              <span>Direct n8n Form</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
