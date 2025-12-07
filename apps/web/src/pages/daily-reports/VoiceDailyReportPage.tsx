import { useState, useRef, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

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

export function VoiceDailyReportPage() {
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [structuredReport, setStructuredReport] = useState<StructuredReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProjects();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Unable to access microphone. Please check permissions.');
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function discardRecording() {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscription(null);
    setStructuredReport(null);
    setRecordingTime(0);
  }

  async function transcribeAudio() {
    if (!audioBlob) return;

    setTranscribing(true);
    try {
      // Upload audio to storage
      const fileName = `voice-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(`${selectedProjectId}/${fileName}`, audioBlob);

      if (uploadError) throw uploadError;

      // Call transcription function
      const { data, error } = await supabase.functions.invoke('voice-transcribe', {
        body: { file_path: uploadData.path },
      });

      if (error) throw error;

      setTranscription(data);
    } catch (err) {
      console.error('Transcription failed:', err);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setTranscribing(false);
    }
  }

  async function generateReport() {
    if (!transcription?.text) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-report-generate', {
        body: {
          project_id: selectedProjectId,
          transcription: transcription.text,
          report_date: reportDate,
        },
      });

      if (error) throw error;

      setStructuredReport(data);
    } catch (err) {
      console.error('Report generation failed:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function saveReport() {
    if (!structuredReport) return;

    setSaving(true);
    try {
      // Create the daily report
      const { data: report, error: reportError } = await supabase
        .from('daily_reports')
        .insert({
          project_id: selectedProjectId,
          report_date: reportDate,
          weather_summary: structuredReport.weather_notes,
          work_summary: structuredReport.summary,
          status: 'DRAFT',
          is_working_day: true,
        })
        .select()
        .single();

      if (reportError) throw reportError;

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

      alert('Report saved successfully!');

      // Reset form
      discardRecording();
    } catch (err) {
      console.error('Failed to save report:', err);
      alert('Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Voice Daily Report</h1>
        <p className="text-gray-600">Record your daily report and let AI structure it for you</p>
      </div>

      {/* Project & Date Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isRecording}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isRecording}
            />
          </div>
        </div>
      </div>

      {/* Recording Interface */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="text-center">
          {/* Recording Status */}
          <div className="mb-6">
            {isRecording ? (
              <div className="flex items-center justify-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</span>
                <span className="text-gray-500">{isPaused ? 'Paused' : 'Recording...'}</span>
              </div>
            ) : audioBlob ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-lg font-medium text-green-600">Recording Complete</span>
                <span className="text-gray-500">({formatTime(recordingTime)})</span>
              </div>
            ) : (
              <div className="text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p>Press the microphone to start recording</p>
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="flex justify-center gap-4">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-lg"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}

            {isRecording && (
              <>
                {isPaused ? (
                  <button
                    onClick={resumeRecording}
                    className="w-16 h-16 rounded-full bg-green-600 text-white hover:bg-green-700 flex items-center justify-center"
                  >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={pauseRecording}
                    className="w-16 h-16 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 flex items-center justify-center"
                  >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-gray-800 text-white hover:bg-gray-900 flex items-center justify-center"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                </button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <button
                  onClick={discardRecording}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Discard
                </button>
                <button
                  onClick={transcribeAudio}
                  disabled={transcribing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {transcribing ? 'Transcribing...' : 'Transcribe'}
                </button>
              </>
            )}
          </div>

          {/* Audio Playback */}
          {audioUrl && (
            <div className="mt-6">
              <audio controls src={audioUrl} className="w-full max-w-md mx-auto" />
            </div>
          )}
        </div>
      </div>

      {/* Transcription */}
      {transcription && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Transcription</h2>
            <button
              onClick={generateReport}
              disabled={generating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {generating ? 'Generating Report...' : 'Generate Report'}
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{transcription.text}</p>
          </div>
        </div>
      )}

      {/* Structured Report */}
      {structuredReport && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Generated Report</h2>
            <button
              onClick={saveReport}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>

          <div className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
              <p className="text-gray-700">{structuredReport.summary}</p>
            </div>

            {/* Work Performed */}
            {structuredReport.work_performed.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Work Performed</h3>
                <ul className="list-disc list-inside space-y-1">
                  {structuredReport.work_performed.map((work, i) => (
                    <li key={i} className="text-gray-700">{work}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Manpower */}
            {structuredReport.manpower.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Manpower</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Trade</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Count</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structuredReport.manpower.map((m, i) => (
                        <tr key={i} className="border-t border-gray-200">
                          <td className="px-4 py-2 text-gray-700">{m.trade}</td>
                          <td className="px-4 py-2 text-gray-700">{m.count}</td>
                          <td className="px-4 py-2 text-gray-700">{m.hours}</td>
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
                <h3 className="font-medium text-gray-900 mb-2">Equipment</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Equipment</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structuredReport.equipment.map((e, i) => (
                        <tr key={i} className="border-t border-gray-200">
                          <td className="px-4 py-2 text-gray-700">{e.name}</td>
                          <td className="px-4 py-2 text-gray-700">{e.hours}</td>
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
                <h3 className="font-medium text-gray-900 mb-2">Delays</h3>
                <div className="space-y-2">
                  {structuredReport.delays.map((d, i) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <span className="font-medium text-yellow-800">{d.duration}:</span>{' '}
                      <span className="text-yellow-700">{d.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weather */}
            {structuredReport.weather_notes && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Weather</h3>
                <p className="text-gray-700">{structuredReport.weather_notes}</p>
              </div>
            )}

            {/* Safety Notes */}
            {structuredReport.safety_notes.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Safety Notes</h3>
                <ul className="list-disc list-inside space-y-1">
                  {structuredReport.safety_notes.map((note, i) => (
                    <li key={i} className="text-gray-700">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visitors */}
            {structuredReport.visitors.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Visitors</h3>
                <ul className="list-disc list-inside space-y-1">
                  {structuredReport.visitors.map((v, i) => (
                    <li key={i} className="text-gray-700">{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Recording Tips</h3>
        <ul className="text-sm text-blue-700 space-y-1">
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
