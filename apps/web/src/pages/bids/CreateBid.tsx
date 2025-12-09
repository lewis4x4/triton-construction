import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import './CreateBid.css';

import { useAuth } from '../../hooks/useAuth';

// West Virginia counties for dropdown
const WV_COUNTIES = [
  'Barbour', 'Berkeley', 'Boone', 'Braxton', 'Brooke', 'Cabell', 'Calhoun',
  'Clay', 'Doddridge', 'Fayette', 'Gilmer', 'Grant', 'Greenbrier', 'Hampshire',
  'Hancock', 'Hardy', 'Harrison', 'Jackson', 'Jefferson', 'Kanawha', 'Lewis',
  'Lincoln', 'Logan', 'Marion', 'Marshall', 'Mason', 'McDowell', 'Mercer',
  'Mineral', 'Mingo', 'Monongalia', 'Monroe', 'Morgan', 'Nicholas', 'Ohio',
  'Pendleton', 'Pleasants', 'Pocahontas', 'Preston', 'Putnam', 'Raleigh',
  'Randolph', 'Ritchie', 'Roane', 'Summers', 'Taylor', 'Tucker', 'Tyler',
  'Upshur', 'Wayne', 'Webster', 'Wetzel', 'Wirt', 'Wood', 'Wyoming'
];

interface FormData {
  project_name: string;
  state_project_number: string;
  federal_project_number: string;
  owner: string;
  county: string;
  route: string;
  location_description: string;
  letting_date: string;
  bid_due_date: string;
  contract_time_days: string;
  dbe_goal_percentage: string;
  is_federal_aid: boolean;
  liquidated_damages_per_day: string;
}

export function CreateBid() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    project_name: '',
    state_project_number: '',
    federal_project_number: '',
    owner: 'WVDOH',
    county: '',
    route: '',
    location_description: '',
    letting_date: '',
    bid_due_date: '',
    contract_time_days: '',
    dbe_goal_percentage: '',
    is_federal_aid: false,
    liquidated_damages_per_day: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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
          state_project_number: formData.state_project_number.trim() || null,
          federal_project_number: formData.federal_project_number.trim() || null,
          owner: formData.owner.trim() || 'WVDOH',
          county: formData.county || null,
          route: formData.route.trim() || null,
          location_description: formData.location_description.trim() || null,
          letting_date: formData.letting_date || null,
          bid_due_date: formData.bid_due_date || null,
          contract_time_days: formData.contract_time_days
            ? parseInt(formData.contract_time_days, 10)
            : null,
          dbe_goal_percentage: formData.dbe_goal_percentage
            ? parseFloat(formData.dbe_goal_percentage)
            : null,
          is_federal_aid: formData.is_federal_aid,
          liquidated_damages_per_day: formData.liquidated_damages_per_day
            ? parseFloat(formData.liquidated_damages_per_day)
            : null,
          status: 'IDENTIFIED',
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
          <p>Set up a new bid package for AI-powered estimation</p>
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
                <label htmlFor="state_project_number">State Project Number</label>
                <input
                  type="text"
                  id="state_project_number"
                  name="state_project_number"
                  value={formData.state_project_number}
                  onChange={handleChange}
                  placeholder="e.g., S310-48-0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="federal_project_number">Federal Project Number</label>
                <input
                  type="text"
                  id="federal_project_number"
                  name="federal_project_number"
                  value={formData.federal_project_number}
                  onChange={handleChange}
                  placeholder="e.g., NHPP-0048(123)D"
                />
              </div>
            </div>

            <div className="form-row">
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

              <div className="form-group">
                <label htmlFor="county">County</label>
                <select
                  id="county"
                  name="county"
                  value={formData.county}
                  onChange={handleChange}
                >
                  <option value="">Select County...</option>
                  {WV_COUNTIES.map((county) => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="route">Route Number</label>
              <input
                type="text"
                id="route"
                name="route"
                value={formData.route}
                onChange={handleChange}
                placeholder="e.g., US-48, WV-2, I-79"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location_description">Location Description</label>
              <textarea
                id="location_description"
                name="location_description"
                value={formData.location_description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief description of the project location and scope..."
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contract_time_days">Contract Time (Days)</label>
                <input
                  type="number"
                  id="contract_time_days"
                  name="contract_time_days"
                  value={formData.contract_time_days}
                  onChange={handleChange}
                  min="1"
                  placeholder="e.g., 180"
                />
              </div>

              <div className="form-group">
                <label htmlFor="liquidated_damages_per_day">Liquidated Damages ($/day)</label>
                <input
                  type="number"
                  id="liquidated_damages_per_day"
                  name="liquidated_damages_per_day"
                  value={formData.liquidated_damages_per_day}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  placeholder="e.g., 2500"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Compliance Requirements</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dbe_goal_percentage">DBE Goal (%)</label>
                <input
                  type="number"
                  id="dbe_goal_percentage"
                  name="dbe_goal_percentage"
                  value={formData.dbe_goal_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 8.5"
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    id="is_federal_aid"
                    name="is_federal_aid"
                    checked={formData.is_federal_aid}
                    onChange={handleChange}
                  />
                  <span className="checkbox-text">Federal Aid Project</span>
                </label>
                <p className="form-hint">
                  Requires Davis-Bacon prevailing wages and Buy America compliance
                </p>
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
