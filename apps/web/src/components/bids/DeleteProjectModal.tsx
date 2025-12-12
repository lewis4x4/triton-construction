import { useState } from 'react';
import { supabase } from '@triton/supabase-client';
import { useNavigate } from 'react-router-dom';
import './DeleteProjectModal.css';

interface DeleteProjectModalProps {
  projectId: string;
  projectName: string;
  projectNumber: string | null;
  onClose: () => void;
}

export function DeleteProjectModal({
  projectId,
  projectName,
  projectNumber,
  onClose,
}: DeleteProjectModalProps) {
  const navigate = useNavigate();
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use project number if available, otherwise use a shortened project ID
  const confirmationTarget = projectNumber || projectId.substring(0, 8).toUpperCase();
  const confirmationLabel = projectNumber ? 'project number' : 'project ID';

  const isConfirmed = confirmationText.trim().toUpperCase() === confirmationTarget.toUpperCase();

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      // First, delete related records in proper order (respecting foreign key constraints)
      // Note: Some of these may have CASCADE delete set up, but we'll be explicit

      // Delete bid_line_items
      await supabase
        .from('bid_line_items')
        .delete()
        .eq('bid_project_id', projectId);

      // Delete bid_risks (table may not be in generated types)
      // @ts-expect-error Table exists but may not be in generated types
      await supabase.from('bid_risks').delete().eq('bid_project_id', projectId);

      // Delete bid_prebid_questions
      await supabase
        .from('bid_prebid_questions')
        .delete()
        .eq('bid_project_id', projectId);

      // Delete bid_work_packages
      await supabase
        .from('bid_work_packages')
        .delete()
        .eq('bid_project_id', projectId);

      // Delete bid_executive_snapshots
      await supabase
        .from('bid_executive_snapshots')
        .delete()
        .eq('bid_project_id', projectId);

      // Delete bid_documents (this should also clean up storage)
      const { data: documents } = await supabase
        .from('bid_documents')
        .select('file_path')
        .eq('bid_project_id', projectId);

      if (documents && documents.length > 0) {
        // Delete files from storage
        const filePaths = documents.map(d => d.file_path).filter(Boolean);
        if (filePaths.length > 0) {
          await supabase.storage
            .from('bid-documents')
            .remove(filePaths as string[]);
        }

        // Delete document records
        await supabase
          .from('bid_documents')
          .delete()
          .eq('bid_project_id', projectId);
      }

      // Delete bid_team_members (table may not be in generated types)
      // @ts-expect-error Table exists but may not be in generated types
      await supabase.from('bid_team_members').delete().eq('bid_project_id', projectId);

      // Delete bid_notifications (table may not be in generated types)
      // @ts-expect-error Table exists but may not be in generated types
      await supabase.from('bid_notifications').delete().eq('bid_project_id', projectId);

      // Finally, delete the bid project itself
      const { error: deleteError } = await supabase
        .from('bid_projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        throw deleteError;
      }

      // Navigate back to bid list
      navigate('/bids', {
        state: { message: `Project "${projectName}" has been deleted.` }
      });
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete project. Please try again.'
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header danger">
          <span className="modal-icon">⚠️</span>
          <h2>Delete Project</h2>
          <button className="modal-close" onClick={onClose} disabled={isDeleting}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="delete-warning">
            <p className="warning-text">
              <strong>This action cannot be undone.</strong> This will permanently delete:
            </p>
            <ul className="delete-items-list">
              <li>The bid project <strong>"{projectName}"</strong></li>
              <li>All uploaded documents and files</li>
              <li>All line items and pricing data</li>
              <li>All risks and questions</li>
              <li>AI-generated summaries and analysis</li>
              <li>Team assignments and history</li>
            </ul>
          </div>

          <div className="confirmation-section">
            <label htmlFor="confirmation-input">
              To confirm, type <strong className="confirm-target">{confirmationTarget}</strong> ({confirmationLabel}) below:
            </label>
            <input
              id="confirmation-input"
              type="text"
              className="confirmation-input"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type ${confirmationTarget} to confirm`}
              disabled={isDeleting}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="delete-error">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-danger ${!isConfirmed ? 'btn-disabled' : ''}`}
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="btn-spinner" />
                Deleting...
              </>
            ) : (
              'Delete Project Permanently'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
