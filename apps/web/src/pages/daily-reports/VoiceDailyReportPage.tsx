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
        .eq('status', 'ACTIVE')
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
    <div className="voice-daily-report">
      <div className="page-header">
        <h1>Voice Daily Report</h1>
        <p>Record your daily report and let AI structure it for you</p>
      </div>

      {/* Offline Banner */}
      {!isOnlineStatus && (
        <div className="offline-banner" role="alert">
          <svg className="offline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
          <span>You're offline. Recording will work, but upload requires internet.</span>
        </div>
      )}

      {/* Browser Unsupported Banner */}
      {!browserSupported && (
        <div className="error-banner" role="alert">
          <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{ERROR_MESSAGES[ErrorCode.BROWSER_UNSUPPORTED]}</span>
        </div>
      )}

      {/* Error Banner */}
      {recordingState.errorMessage && recordingState.status === 'error' && (
        <div className="error-banner" role="alert">
          <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{recordingState.errorMessage}</span>
          <button
            className="dismiss-btn"
            onClick={() => dispatch({ type: 'RESET' })}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="shortcuts-hint">
        <span><kbd>Ctrl</kbd>+<kbd>R</kbd> Record</span>
        <span><kbd>Space</kbd> Pause/Resume</span>
        <span><kbd>Ctrl</kbd>+<kbd>S</kbd> Save</span>
        <span><kbd>Esc</kbd> Discard</span>
      </div>

      {/* Project & Date Selection */}
      <div className="card">
        <div className="card-body-compact">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="project-select">Project</label>
              <select
                id="project-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="form-select"
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
              <span id="project-help" className="form-help">Select the project for this report</span>
            </div>
            <div className="form-group">
              <label htmlFor="report-date">Report Date</label>
              <input
                id="report-date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="form-input"
                disabled={isRecording || isPaused}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recording Interface */}
      <div className="card">
        <div className="card-body">
          <div className="recording-interface">
            {/* Recording Status */}
            <div className="recording-status" role="status" aria-live="polite">
              {isRecording || isPaused ? (
                <div className="recording-active">
                  <div
                    className={`recording-indicator ${isPaused ? 'paused' : 'recording'}`}
                    aria-hidden="true"
                  />
                  <span className="recording-time" aria-label={`Recording time: ${formatTime(recordingState.time)}`}>
                    {formatTime(recordingState.time)}
                  </span>
                  <span className="recording-label">{isPaused ? 'Paused' : 'Recording...'}</span>
                  {recordingState.time > MAX_RECORDING_SECONDS - 60 && (
                    <span className="time-warning">
                      ({Math.floor((MAX_RECORDING_SECONDS - recordingState.time) / 60)}m remaining)
                    </span>
                  )}
                </div>
              ) : audioBlob ? (
                <div className="recording-complete">
                  <div className="recording-indicator complete" aria-hidden="true" />
                  <span className="recording-complete-text">Recording Complete</span>
                  <span className="recording-duration">
                    {formatTime(recordingState.time)} • {formatFileSize(audioBlob.size)}
                  </span>
                </div>
              ) : (
                <div className="recording-idle">
                  <svg
                    className="mic-icon-large"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p>Press the microphone to start recording</p>
                </div>
              )}
            </div>

            {/* Recording Controls */}
            <div className="recording-controls" role="group" aria-label="Recording controls">
              {!isRecording && !isPaused && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="btn btn-record"
                  disabled={!browserSupported}
                  aria-label="Start recording"
                  title="Start recording (Ctrl+R)"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}

              {(isRecording || isPaused) && (
                <>
                  {isPaused ? (
                    <button
                      onClick={resumeRecording}
                      className="btn btn-control btn-resume"
                      aria-label="Resume recording"
                      title="Resume recording (Space)"
                    >
                      <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={pauseRecording}
                      className="btn btn-control btn-pause"
                      aria-label="Pause recording"
                      title="Pause recording (Space)"
                    >
                      <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={stopRecording}
                    className="btn btn-control btn-stop"
                    aria-label="Stop recording"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                  </button>
                </>
              )}

              {audioBlob && !isRecording && !isPaused && (
                <>
                  <button
                    onClick={discardRecording}
                    className="btn btn-secondary"
                    aria-label="Discard recording"
                    title="Discard recording (Esc)"
                  >
                    Discard
                  </button>
                  <button
                    onClick={transcribeAudio}
                    disabled={transcribing || !isOnlineStatus}
                    className="btn btn-primary"
                    aria-label={transcribing ? 'Transcribing audio' : 'Transcribe audio'}
                  >
                    {transcribing ? (
                      uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Transcribing...'
                    ) : (
                      'Transcribe'
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Progress Bar */}
            {uploadProgress !== null && (
              <div className="progress-bar-container" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                <span className="progress-label">
                  {uploadProgress < 50 ? 'Uploading...' : 'Processing...'}
                </span>
              </div>
            )}

            {/* Audio Playback */}
            {audioUrl && (
              <div className="audio-playback">
                <audio
                  controls
                  src={audioUrl}
                  aria-label="Recorded audio playback"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transcription */}
      {transcription && (
        <div className="card">
          <div className="card-body">
            <div className="section-header">
              <h2>Transcription</h2>
              <button
                onClick={generateReport}
                disabled={generating || !isOnlineStatus}
                className="btn btn-success"
                aria-label={generating ? 'Generating report' : 'Generate report from transcription'}
              >
                {generating ? 'Generating Report...' : 'Generate Report'}
              </button>
            </div>
            <div className="transcription-text" role="region" aria-label="Transcription text">
              {transcription.text}
            </div>
          </div>
        </div>
      )}

      {/* Structured Report */}
      {structuredReport && (
        <div className="card">
          <div className="card-body">
            <div className="section-header">
              <h2>Generated Report</h2>
              <button
                onClick={saveReport}
                disabled={saving || !isOnlineStatus}
                className="btn btn-primary"
                aria-label={saving ? 'Saving report' : 'Save report as draft'}
                title="Save report (Ctrl+S)"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>

            <div className="report-sections">
              {/* Summary */}
              <div className="report-section">
                <h3>Summary</h3>
                <p>{structuredReport.summary}</p>
              </div>

              {/* Work Performed */}
              {structuredReport.work_performed.length > 0 && (
                <div className="report-section">
                  <h3>Work Performed</h3>
                  <ul>
                    {structuredReport.work_performed.map((work, i) => (
                      <li key={i}>{work}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Manpower */}
              {structuredReport.manpower.length > 0 && (
                <div className="report-section">
                  <h3>Manpower</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trade</th>
                        <th>Count</th>
                        <th>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structuredReport.manpower.map((m, i) => (
                        <tr key={i}>
                          <td>{m.trade}</td>
                          <td>{m.count}</td>
                          <td>{m.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Equipment */}
              {structuredReport.equipment.length > 0 && (
                <div className="report-section">
                  <h3>Equipment</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Equipment</th>
                        <th>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structuredReport.equipment.map((e, i) => (
                        <tr key={i}>
                          <td>{e.name}</td>
                          <td>{e.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Delays */}
              {structuredReport.delays.length > 0 && (
                <div className="report-section">
                  <h3>Delays</h3>
                  <div className="delay-list">
                    {structuredReport.delays.map((d, i) => (
                      <div key={i} className="delay-item">
                        <span className="delay-duration">{d.duration}:</span>{' '}
                        <span className="delay-description">{d.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weather */}
              {structuredReport.weather_notes && (
                <div className="report-section">
                  <h3>Weather</h3>
                  <p>{structuredReport.weather_notes}</p>
                </div>
              )}

              {/* Safety Notes */}
              {structuredReport.safety_notes.length > 0 && (
                <div className="report-section">
                  <h3>Safety Notes</h3>
                  <ul>
                    {structuredReport.safety_notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Visitors */}
              {structuredReport.visitors.length > 0 && (
                <div className="report-section">
                  <h3>Visitors</h3>
                  <ul>
                    {structuredReport.visitors.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="tips-box">
        <h3>Recording Tips</h3>
        <ul>
          <li>Speak clearly and at a normal pace</li>
          <li>Mention trade types and crew sizes (e.g., "4 operators, 6 laborers")</li>
          <li>Include equipment names and hours used</li>
          <li>Note any delays, weather impacts, or safety observations</li>
          <li>Mention visitors by name and organization</li>
        </ul>
      </div>
    </div>
  );
}

export default VoiceDailyReportPage;
