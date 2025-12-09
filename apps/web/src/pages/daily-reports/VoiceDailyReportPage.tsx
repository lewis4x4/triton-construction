import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { supabase } from '@triton/supabase-client';
import './VoiceDailyReportPage.css';


// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TranscriptionResult {
  text: string;
  segments?: { start: number; end: number; text: string }[];
}

interface StructuredReport {
  summary: string;
  work_performed: string[];
  manpower: { trade: string; count: number; hours: number }[];
  equipment: { name: string; hours: number }[];
  materials: { description: string; quantity: string }[];
  delays: { description: string; duration: string }[];
  safety_notes: string[];
  weather_notes: string;
  visitors: string[];
}

interface Project {
  id: string;
  name: string;
  project_number: string;
}

// Recording state machine
type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

interface RecordingState {
  status: RecordingStatus;
  time: number;
  errorMessage: string | null;
}

type RecordingAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'ERROR'; message: string };

// Error types for better user feedback
enum ErrorCode {
  MICROPHONE_DENIED = 'MICROPHONE_DENIED',
  MICROPHONE_UNAVAILABLE = 'MICROPHONE_UNAVAILABLE',
  BROWSER_UNSUPPORTED = 'BROWSER_UNSUPPORTED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.MICROPHONE_DENIED]: 'Microphone access denied. Please allow microphone access in your browser settings and refresh the page.',
  [ErrorCode.MICROPHONE_UNAVAILABLE]: 'No microphone found. Please connect a microphone and try again.',
  [ErrorCode.BROWSER_UNSUPPORTED]: 'Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.',
  [ErrorCode.UPLOAD_FAILED]: 'Failed to upload audio file. Please check your connection and try again.',
  [ErrorCode.FILE_TOO_LARGE]: 'Recording is too large (max 50MB). Please record a shorter message.',
  [ErrorCode.TRANSCRIPTION_FAILED]: 'Failed to transcribe audio. The service may be temporarily unavailable.',
  [ErrorCode.GENERATION_FAILED]: 'Failed to generate report. Please try again or edit the transcription manually.',
  [ErrorCode.SAVE_FAILED]: 'Failed to save report. Please check your connection and try again.',
  [ErrorCode.NETWORK_OFFLINE]: 'You appear to be offline. Please connect to the internet and try again.',
  [ErrorCode.UNKNOWN]: 'An unexpected error occurred. Please try again or contact support.',
};

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_RECORDING_SECONDS = 30 * 60; // 30 minutes
const AUTOSAVE_INTERVAL_MS = 30000; // 30 seconds
const LOCALSTORAGE_KEY = 'voice_daily_report_draft';

// ============================================================================
// UTILITY FUNCTIONS (defined outside component to avoid recreation)
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSupportedMimeType(): string | null {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
}

function isOnline(): boolean {
  return navigator.onLine;
}

// Recording state reducer
function recordingReducer(state: RecordingState, action: RecordingAction): RecordingState {
  switch (action.type) {
    case 'START':
      return { status: 'recording', time: 0, errorMessage: null };
    case 'PAUSE':
      return { ...state, status: 'paused' };
    case 'RESUME':
      return { ...state, status: 'recording' };
    case 'STOP':
      return { ...state, status: 'stopped' };
    case 'RESET':
      return { status: 'idle', time: 0, errorMessage: null };
    case 'TICK':
      return { ...state, time: state.time + 1 };
    case 'ERROR':
      return { ...state, status: 'error', errorMessage: action.message };
    default:
      return state;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VoiceDailyReportPage() {
  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Recording state (using reducer for state machine)
  const [recordingState, dispatch] = useReducer(recordingReducer, {
    status: 'idle',
    time: 0,
    errorMessage: null,
  });

  // Audio state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Processing state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [structuredReport, setStructuredReport] = useState<StructuredReport | null>(null);
  const [saving, setSaving] = useState(false);

  // UI state
  const [isOnlineStatus, setIsOnlineStatus] = useState(isOnline());
  const [browserSupported, setBrowserSupported] = useState(true);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Check browser support on mount
  useEffect(() => {
    const supported = typeof MediaRecorder !== 'undefined' && getSupportedMimeType() !== null;
    setBrowserSupported(supported);

    if (!supported) {
      dispatch({ type: 'ERROR', message: ERROR_MESSAGES[ErrorCode.BROWSER_UNSUPPORTED] });
    }
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnlineStatus(true);
    const handleOffline = () => setIsOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup audio URL when blob changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      // Stop recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!transcription && !structuredReport) return;

    const saveInterval = setInterval(() => {
      const draft = {
        transcription,
        structuredReport,
        projectId: selectedProjectId,
        reportDate,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(draft));
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(saveInterval);
  }, [transcription, structuredReport, selectedProjectId, reportDate]);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        // Only restore if less than 24 hours old
        const savedAt = new Date(draft.savedAt);
        const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceSave < 24 && draft.transcription) {
          setTranscription(draft.transcription);
          setStructuredReport(draft.structuredReport);
          if (draft.projectId) setSelectedProjectId(draft.projectId);
          if (draft.reportDate) setReportDate(draft.reportDate);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Timer management
  useEffect(() => {
    if (recordingState.status === 'recording') {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [recordingState.status]);

  // Auto-stop at max duration
  useEffect(() => {
    if (recordingState.time >= MAX_RECORDING_SECONDS && recordingState.status === 'recording') {
      stopRecording();
    }
  }, [recordingState.time, recordingState.status]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_number')
        // .eq('status', 'ACTIVE') // Fixed project visibility
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        setProjects(data);
        if (!selectedProjectId && data[0]) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  // ============================================================================
  // RECORDING HANDLERS
  // ============================================================================

  const startRecording = useCallback(async () => {
    if (!browserSupported) {
      dispatch({ type: 'ERROR', message: ERROR_MESSAGES[ErrorCode.BROWSER_UNSUPPORTED] });
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      // Get supported MIME type
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error(ErrorCode.BROWSER_UNSUPPORTED);
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeTypeBase = mimeType.split(';')[0];
        const blob = new Blob(chunksRef.current, { type: mimeTypeBase });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = () => {
        dispatch({ type: 'ERROR', message: ERROR_MESSAGES[ErrorCode.UNKNOWN] });
        stopRecording();
      };

      mediaRecorder.start(1000); // Collect data every second
      dispatch({ type: 'START' });

    } catch (err: any) {
      console.error('Failed to start recording:', err);

      // Determine specific error
      let errorCode = ErrorCode.UNKNOWN;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorCode = ErrorCode.MICROPHONE_DENIED;
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorCode = ErrorCode.MICROPHONE_UNAVAILABLE;
      } else if (err.message === ErrorCode.BROWSER_UNSUPPORTED) {
        errorCode = ErrorCode.BROWSER_UNSUPPORTED;
      }

      dispatch({ type: 'ERROR', message: ERROR_MESSAGES[errorCode] });
    }
  }, [browserSupported]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      dispatch({ type: 'PAUSE' });
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      dispatch({ type: 'RESUME' });
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      dispatch({ type: 'STOP' });
    }
  }, []);

  const discardRecording = useCallback(() => {
    // Cleanup audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Reset all state
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription(null);
    setStructuredReport(null);
    setUploadProgress(null);
    dispatch({ type: 'RESET' });

    // Clear saved draft
    localStorage.removeItem(LOCALSTORAGE_KEY);
  }, [audioUrl]);

  // ============================================================================
  // TRANSCRIPTION & REPORT GENERATION
  // ============================================================================

  const transcribeAudio = useCallback(async () => {
    if (!audioBlob) return;

    // Check network status
    if (!isOnline()) {
      alert(ERROR_MESSAGES[ErrorCode.NETWORK_OFFLINE]);
      return;
    }

    // Validate file size
    if (audioBlob.size > MAX_FILE_SIZE_BYTES) {
      alert(ERROR_MESSAGES[ErrorCode.FILE_TOO_LARGE] + ` Current size: ${formatFileSize(audioBlob.size)}`);
      return;
    }

    setTranscribing(true);
    setUploadProgress(0);

    try {
      // Upload audio to storage
      const fileName = `voice-${Date.now()}.webm`;
      const filePath = `${selectedProjectId}/${fileName}`;

      setUploadProgress(20);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw new Error(ErrorCode.UPLOAD_FAILED);
      }

      setUploadProgress(50);

      // Call transcription function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      try {
        const { data, error } = await supabase.functions.invoke('voice-transcribe', {
          body: { file_path: uploadData.path },
        });

        clearTimeout(timeoutId);

        if (error) {
          throw new Error(ErrorCode.TRANSCRIPTION_FAILED);
        }

        setUploadProgress(100);
        setTranscription(data);

      } catch (invokeErr: any) {
        clearTimeout(timeoutId);
        if (invokeErr.name === 'AbortError') {
          throw new Error(ErrorCode.TRANSCRIPTION_FAILED);
        }
        throw invokeErr;
      }

    } catch (err: any) {
      console.error('Transcription failed:', err);

      let errorMessage = ERROR_MESSAGES[ErrorCode.UNKNOWN];
      if (err.message === ErrorCode.UPLOAD_FAILED) {
        errorMessage = ERROR_MESSAGES[ErrorCode.UPLOAD_FAILED];
      } else if (err.message === ErrorCode.TRANSCRIPTION_FAILED) {
        errorMessage = ERROR_MESSAGES[ErrorCode.TRANSCRIPTION_FAILED];
      }

      alert(errorMessage);
    } finally {
      setTranscribing(false);
      setUploadProgress(null);
    }
  }, [audioBlob, selectedProjectId]);

  const generateReport = useCallback(async () => {
    if (!transcription?.text) return;

    if (!isOnline()) {
      alert(ERROR_MESSAGES[ErrorCode.NETWORK_OFFLINE]);
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('daily-report-generate', {
        body: {
          project_id: selectedProjectId,
          transcription: transcription.text,
          report_date: reportDate,
        },
      });

      if (error) {
        throw new Error(ErrorCode.GENERATION_FAILED);
      }

      setStructuredReport(data);

    } catch (err) {
      console.error('Report generation failed:', err);
      alert(ERROR_MESSAGES[ErrorCode.GENERATION_FAILED]);
    } finally {
      setGenerating(false);
    }
  }, [transcription, selectedProjectId, reportDate]);

  const saveReport = useCallback(async () => {
    if (!structuredReport) return;

    if (!isOnline()) {
      alert(ERROR_MESSAGES[ErrorCode.NETWORK_OFFLINE]);
      return;
    }

    // Validate required fields
    if (!selectedProjectId || !reportDate) {
      alert('Please select a project and date.');
      return;
    }

    if (!structuredReport.summary?.trim()) {
      alert('Report summary is required. Please ensure the transcription includes a summary of work.');
      return;
    }

    setSaving(true);

    try {
      // Check for existing report on same date
      const { data: existingReport } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('project_id', selectedProjectId)
        .eq('report_date', reportDate)
        .single();

      if (existingReport) {
        const confirmOverwrite = window.confirm(
          'A report already exists for this date. Do you want to create another report?'
        );
        if (!confirmOverwrite) {
          setSaving(false);
          return;
        }
      }

      // Create the daily report
      const { data: report, error: reportError } = await supabase
        .from('daily_reports')
        .insert({
          project_id: selectedProjectId,
          report_date: reportDate,
          weather_summary: structuredReport.weather_notes || '',
          work_summary: structuredReport.summary,
          status: 'DRAFT',
          is_working_day: true,
        } as any)
        .select()
        .single();

      if (reportError) {
        throw new Error(ErrorCode.SAVE_FAILED);
      }

      // Create work entries
      if (structuredReport.work_performed.length > 0) {
        const entries = structuredReport.work_performed.map((work, index) => ({
          daily_report_id: report.id,
          entry_type: 'WORK_PERFORMED',
          description: work,
          sequence_order: index + 1,
        }));

        await supabase.from('daily_report_entries').insert(entries);
      }

      // Create delay entries
      if (structuredReport.delays.length > 0) {
        const delayEntries = structuredReport.delays.map((delay, index) => ({
          daily_report_id: report.id,
          entry_type: 'DELAY',
          description: `${delay.description} (${delay.duration})`,
          sequence_order: index + 1,
        }));

        await supabase.from('daily_report_entries').insert(delayEntries);
      }

      // Clear saved draft
      localStorage.removeItem(LOCALSTORAGE_KEY);

      alert('Report saved successfully!');
      discardRecording();

    } catch (err) {
      console.error('Failed to save report:', err);
      alert(ERROR_MESSAGES[ErrorCode.SAVE_FAILED]);
    } finally {
      setSaving(false);
    }
  }, [structuredReport, selectedProjectId, reportDate, discardRecording]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            if (recordingState.status === 'idle' && !audioBlob) {
              startRecording();
            }
            break;
          case 's':
            e.preventDefault();
            if (structuredReport && !saving) {
              saveReport();
            }
            break;
        }
      }

      // Escape to discard
      if (e.key === 'Escape' && (audioBlob || transcription)) {
        if (window.confirm('Are you sure you want to discard the current recording?')) {
          discardRecording();
        }
      }

      // Space to pause/resume while recording
      if (e.key === ' ' && (recordingState.status === 'recording' || recordingState.status === 'paused')) {
        e.preventDefault();
        if (recordingState.status === 'recording') {
          pauseRecording();
        } else {
          resumeRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingState.status, audioBlob, transcription, structuredReport, saving, startRecording, saveReport, discardRecording, pauseRecording, resumeRecording]);

  // ============================================================================
  // RENDER
  // ============================================================================


  const isRecording = recordingState.status === 'recording';
  const isPaused = recordingState.status === 'paused';

  return (
    <div className="voice-report-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Voice Daily Report</h1>
            <p className="header-subtitle">Record your daily report and let AI structure it for you</p>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto p-6">

        {/* Offline Banner */}
        {!isOnlineStatus && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3 text-yellow-500">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            <span className="font-mono text-sm">You're offline. Recording will work, but upload requires internet.</span>
          </div>
        )}

        {/* Browser Unsupported Banner */}
        {!browserSupported && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-500">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-mono text-sm">{ERROR_MESSAGES[ErrorCode.BROWSER_UNSUPPORTED]}</span>
          </div>
        )}

        {/* Error Banner */}
        {recordingState.errorMessage && recordingState.status === 'error' && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-500">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-sm">{recordingState.errorMessage}</span>
            <button
              className="ml-auto text-red-400 hover:text-red-300 transition-colors"
              onClick={() => dispatch({ type: 'RESET' })}
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="flex flex-wrap gap-4 justify-center mb-8 text-xs text-gray-400 font-mono uppercase tracking-wider">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <kbd className="min-w-[20px] h-5 flex items-center justify-center bg-slate-700 rounded text-gray-200 border-b-2 border-slate-600">Ctrl</kbd>
            <span className="text-gray-500">+</span>
            <kbd className="min-w-[20px] h-5 flex items-center justify-center bg-slate-700 rounded text-gray-200 border-b-2 border-slate-600">R</kbd>
            <span className="ml-1 text-cyan-400 font-bold">Record</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <kbd className="px-1.5 h-5 flex items-center justify-center bg-slate-700 rounded text-gray-200 border-b-2 border-slate-600">Space</kbd>
            <span className="ml-1 text-yellow-400 font-bold">Pause</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <kbd className="min-w-[20px] h-5 flex items-center justify-center bg-slate-700 rounded text-gray-200 border-b-2 border-slate-600">Ctrl</kbd>
            <span className="text-gray-500">+</span>
            <kbd className="min-w-[20px] h-5 flex items-center justify-center bg-slate-700 rounded text-gray-200 border-b-2 border-slate-600">S</kbd>
            <span className="ml-1 text-green-400 font-bold">Save</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <kbd className="px-1.5 h-5 flex items-center justify-center bg-slate-700 rounded text-gray-200 border-b-2 border-slate-600">Esc</kbd>
            <span className="ml-1 text-red-400 font-bold">Discard</span>
          </span>
        </div>

        {/* Project & Date Selection */}
        <div className="dashboard-card mb-8">
          <div className="card-content grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="project-select" className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest pl-1">Project</label>
              <div className="relative">
                <select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none cursor-pointer shadow-inner"
                  disabled={isRecording || isPaused}
                  aria-describedby="project-help"
                >
                  {projects.length === 0 && (
                    <option value="">No projects available</option>
                  )}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="report-date" className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest pl-1">Report Date</label>
              <input
                id="report-date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-inner"
                disabled={isRecording || isPaused}
              />
            </div>
          </div>
        </div>

        {/* Recording Interface */}
        <div className="recording-card mb-8">
          <div className="mb-8">
            {/* Recording Status */}
            <div className="min-h-[120px] flex items-center justify-center" role="status" aria-live="polite">
              {isRecording || isPaused ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} aria-hidden="true" />
                    {isRecording && <div className="absolute top-0 left-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-5xl font-mono font-bold text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" aria-label={`Recording time: ${formatTime(recordingState.time)}`}>
                      {formatTime(recordingState.time)}
                    </span>
                    <span className="text-sm text-gray-400 font-mono uppercase tracking-widest">{isPaused ? 'Paused' : 'Recording...'}</span>
                  </div>
                  {recordingState.time > MAX_RECORDING_SECONDS - 60 && (
                    <span className="text-red-400 font-mono text-xs animate-pulse">
                      ({Math.floor((MAX_RECORDING_SECONDS - recordingState.time) / 60)}m remaining)
                    </span>
                  )}
                </div>
              ) : audioBlob ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                    <div className="w-4 h-4 rounded bg-green-500" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-xl font-bold text-green-400">Recording Complete</span>
                    <span className="text-sm text-gray-500 font-mono mt-1">
                      {formatTime(recordingState.time)} • {formatFileSize(audioBlob.size)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p className="font-mono text-sm uppercase tracking-wider">Press the microphone to start recording</p>
                </div>
              )}
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex justify-center gap-6" role="group" aria-label="Recording controls">
            {!isRecording && !isPaused && !audioBlob && (
              <button
                onClick={startRecording}
                className="group relative flex items-center justify-center w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] hover:scale-105"
                disabled={!browserSupported}
                aria-label="Start recording"
                title="Start recording (Ctrl+R)"
              >
                <div className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-ping opacity-20 group-hover:opacity-40" />
                <svg className="w-10 h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}

            {(isRecording || isPaused) && (
              <>
                {isPaused ? (
                  <button
                    onClick={resumeRecording}
                    className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-105"
                    aria-label="Resume recording"
                    title="Resume recording (Space)"
                  >
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={pauseRecording}
                    className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all hover:scale-105"
                    aria-label="Pause recording"
                    title="Pause recording (Space)"
                  >
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={stopRecording}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-void-dark border border-white/20 hover:bg-white/10 transition-all hover:scale-105"
                  aria-label="Stop recording"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                </button>
              </>
            )}

            {audioBlob && !isRecording && !isPaused && (
              <div className="flex items-center gap-4">
                <button
                  onClick={discardRecording}
                  className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 transition-colors uppercase font-bold text-sm tracking-wide"
                  aria-label="Discard recording"
                  title="Discard recording (Esc)"
                >
                  Discard
                </button>
                <button
                  onClick={transcribeAudio}
                  disabled={transcribing || !isOnlineStatus}
                  className="px-8 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={transcribing ? 'Transcribing audio' : 'Transcribe audio'}
                >
                  {transcribing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Processing...'}
                    </span>
                  ) : (
                    'Transcribe'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {uploadProgress !== null && (
            <div className="mt-8 relative h-2 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
              <div className="absolute top-0 left-0 h-full bg-cyan-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          {/* Audio Playback */}
          {audioUrl && (
            <div className="mt-8 flex justify-center">
              <audio
                controls
                src={audioUrl}
                className="w-full max-w-md [&::-webkit-media-controls-panel]:bg-gray-800 [&::-webkit-media-controls-current-time-display]:text-gray-300 [&::-webkit-media-controls-time-remaining-display]:text-gray-300"
                aria-label="Recorded audio playback"
              />
            </div>
          )}
        </div>

        {/* Transcription */}
        {transcription && (
          <div className="gravity-card p-6 mb-8 border-green-500/20 bg-green-500/5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Transcription
              </h2>
              <button
                onClick={generateReport}
                disabled={generating || !isOnlineStatus}
                className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold text-sm uppercase tracking-wide shadow-lg transition-all disabled:opacity-50"
                aria-label={generating ? 'Generating report' : 'Generate report from transcription'}
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
            <div className="bg-void-dark border border-white/10 rounded-lg p-6 text-gray-300 font-mono text-sm leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar" role="region" aria-label="Transcription text">
              {transcription.text}
            </div>
          </div>
        )}

        {/* Structured Report */}
        {structuredReport && (
          <div className="gravity-card p-6 border-cyan-500/20 bg-cyan-500/5">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6">
              <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Generated Report
              </h2>
              <button
                onClick={saveReport}
                disabled={saving || !isOnlineStatus}
                className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm uppercase tracking-wide shadow-lg transition-all disabled:opacity-50"
                aria-label={saving ? 'Saving report' : 'Save report as draft'}
                title="Save report (Ctrl+S)"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>

            <div className="space-y-8">
              {/* Summary */}
              <div>
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Summary</h3>
                <p className="text-gray-300 leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5">{structuredReport.summary}</p>
              </div>

              {/* Work Performed */}
              {structuredReport.work_performed.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Work Performed</h3>
                  <ul className="space-y-2">
                    {structuredReport.work_performed.map((work, i) => (
                      <li key={i} className="flex gap-3 text-gray-300 bg-white/5 p-3 rounded border border-white/5">
                        <span className="text-cyan-500 mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                        {work}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Manpower */}
              {structuredReport.manpower.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Manpower</h3>
                  <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-400 uppercase tracking-wider">Trade</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-400 uppercase tracking-wider">Count</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-400 uppercase tracking-wider">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {structuredReport.manpower.map((m, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-white font-mono">{m.trade}</td>
                            <td className="px-4 py-3 text-gray-300 font-mono">{m.count}</td>
                            <td className="px-4 py-3 text-gray-300 font-mono">{m.hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Equipment */}
              {structuredReport.equipment.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Equipment</h3>
                  <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-400 uppercase tracking-wider">Equipment</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-400 uppercase tracking-wider">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {structuredReport.equipment.map((e, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-white font-mono">{e.name}</td>
                            <td className="px-4 py-3 text-gray-300 font-mono">{e.hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Delays */}
              {structuredReport.delays.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-2">Delays</h3>
                  <div className="space-y-2">
                    {structuredReport.delays.map((d, i) => (
                      <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex gap-3 text-sm">
                        <span className="font-bold text-orange-400 whitespace-nowrap">{d.duration}:</span>
                        <span className="text-orange-200">{d.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weather */}
              {structuredReport.weather_notes && (
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Weather</h3>
                  <p className="text-gray-300 bg-white/5 p-4 rounded-lg border border-white/5">{structuredReport.weather_notes}</p>
                </div>
              )}

              {/* Safety Notes */}
              {structuredReport.safety_notes.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">Safety Notes</h3>
                  <ul className="space-y-2">
                    {structuredReport.safety_notes.map((note, i) => (
                      <li key={i} className="flex gap-3 text-red-200 bg-red-500/10 p-3 rounded border border-red-500/20">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Visitors */}
              {structuredReport.visitors.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2">Visitors</h3>
                  <ul className="space-y-2">
                    {structuredReport.visitors.map((v, i) => (
                      <li key={i} className="flex gap-3 text-purple-200 bg-purple-500/10 p-3 rounded border border-purple-500/20">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 p-6 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recording Tips
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-300/80">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full" />
              Speak clearly and at a normal pace
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full" />
              Mention trade types and crew sizes
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full" />
              Include equipment names and hours used
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full" />
              Note any delays or weather impacts
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full" />
              Mention visitors by name and organization
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default VoiceDailyReportPage;
