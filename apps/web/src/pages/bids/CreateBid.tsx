import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';

import { useAuth } from '../../hooks/useAuth';

interface FormData {
  project_name: string;
  contract_number: string;
  owner: string;
  county: string;
  state_route: string;
  letting_date: string;
  bid_due_date: string;
  project_description: string;
  estimated_value_low: string;
  estimated_value_high: string;
}

export function CreateBid() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    project_name: '',
    contract_number: '',
    owner: 'WVDOH',
    county: '',
    state_route: '',
    letting_date: '',
    bid_due_date: '',
    project_description: '',
    estimated_value_low: '',
    estimated_value_high: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!profile?.organization_id) {
        throw new Error('Organization not found. Please refresh and try again.');
      }

      // Validate required fields
      if (!formData.project_name.trim()) {
        throw new Error('Project name is required');
      }

      const { data, error: insertError } = await supabase
        .from('bid_projects')
        .insert({
          organization_id: profile.organization_id,
          project_name: formData.project_name.trim(),
          contract_number: formData.contract_number.trim() || null,
          owner: formData.owner.trim() || null,
          county: formData.county.trim() || null,
          state_route: formData.state_route.trim() || null,
          letting_date: formData.letting_date || null,
          bid_due_date: formData.bid_due_date || null,
          project_description: formData.project_description.trim() || null,
          estimated_value_low: formData.estimated_value_low
            ? parseFloat(formData.estimated_value_low)
            : null,
          estimated_value_high: formData.estimated_value_high
            ? parseFloat(formData.estimated_value_high)
            : null,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Navigate to the new project's detail page
      navigate(`/bids/${data.id}`);
    } catch (err) {
      console.error('Error creating bid project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bid project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <h1>Create Bid Project</h1>
          <p>Set up a new bid package for estimation</p>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="bid-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-section">
            <h2>Project Information</h2>

            <div className="form-group">
              <label htmlFor="project_name">
                Project Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="project_name"
                name="project_name"
                value={formData.project_name}
                onChange={handleChange}
                placeholder="e.g., Corridor H Section 12 Bridge Replacement"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contract_number">Contract Number</label>
                <input
                  type="text"
                  id="contract_number"
                  name="contract_number"
                  value={formData.contract_number}
                  onChange={handleChange}
                  placeholder="e.g., DOH-2024-0123"
                />
              </div>

              <div className="form-group">
                <label htmlFor="owner">Owner/Agency</label>
                <select
                  id="owner"
                  name="owner"
                  value={formData.owner}
                  onChange={handleChange}
                >
                  <option value="WVDOH">WV DOH</option>
                  <option value="FHWA">FHWA</option>
                  <option value="County">County</option>
                  <option value="Municipal">Municipal</option>
                  <option value="Private">Private</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="county">County</label>
                <input
                  type="text"
                  id="county"
                  name="county"
                  value={formData.county}
                  onChange={handleChange}
                  placeholder="e.g., Kanawha"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state_route">State Route</label>
                <input
                  type="text"
                  id="state_route"
                  name="state_route"
                  value={formData.state_route}
                  onChange={handleChange}
                  placeholder="e.g., US-48"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="project_description">Project Description</label>
              <textarea
                id="project_description"
                name="project_description"
                value={formData.project_description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of the project scope..."
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Schedule</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="letting_date">Letting Date</label>
                <input
                  type="date"
                  id="letting_date"
                  name="letting_date"
                  value={formData.letting_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bid_due_date">Bid Due Date</label>
                <input
                  type="date"
                  id="bid_due_date"
                  name="bid_due_date"
                  value={formData.bid_due_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Estimated Value Range</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="estimated_value_low">Low Estimate ($)</label>
                <input
                  type="number"
                  id="estimated_value_low"
                  name="estimated_value_low"
                  value={formData.estimated_value_low}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  placeholder="e.g., 1000000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="estimated_value_high">High Estimate ($)</label>
                <input
                  type="number"
                  id="estimated_value_high"
                  name="estimated_value_high"
                  value={formData.estimated_value_high}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  placeholder="e.g., 1500000"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/bids')}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Bid Project'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
