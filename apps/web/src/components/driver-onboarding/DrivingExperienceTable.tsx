import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DrivingExperience, CDLClass } from './types';
import { EQUIPMENT_TYPES } from './types';
import './DrivingExperienceTable.css';

interface DrivingExperienceTableProps {
  experience: DrivingExperience[];
  onChange: (experience: DrivingExperience[]) => void;
}

const EMPTY_EXPERIENCE: DrivingExperience = {
  equipment_type: '',
  class_required: null,
  years_experience: 0,
  approximate_miles: 0,
};

export function DrivingExperienceTable({ experience, onChange }: DrivingExperienceTableProps) {
  const [newEntry, setNewEntry] = useState<DrivingExperience>(EMPTY_EXPERIENCE);

  const handleAddEntry = () => {
    if (!newEntry.equipment_type) return;

    const equipmentConfig = EQUIPMENT_TYPES.find((eq) => eq.value === newEntry.equipment_type);
    const entryToAdd = {
      ...newEntry,
      class_required: equipmentConfig?.class || null,
    };

    onChange([...experience, entryToAdd]);
    setNewEntry(EMPTY_EXPERIENCE);
  };

  const handleRemoveEntry = (index: number) => {
    const updated = [...experience];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleUpdateEntry = (index: number, field: keyof DrivingExperience, value: any) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleNewEntryChange = (field: keyof DrivingExperience, value: any) => {
    setNewEntry((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-set class based on equipment type
      if (field === 'equipment_type') {
        const equipmentConfig = EQUIPMENT_TYPES.find((eq) => eq.value === value);
        updated.class_required = equipmentConfig?.class || null;
      }
      return updated;
    });
  };

  const getEquipmentLabel = (value: string) => {
    return EQUIPMENT_TYPES.find((eq) => eq.value === value)?.label || value;
  };

  // Get equipment types not already added
  const availableEquipmentTypes = EQUIPMENT_TYPES.filter(
    (eq) => !experience.some((exp) => exp.equipment_type === eq.value)
  );

  return (
    <div className="driving-experience-table">
      {experience.length > 0 && (
        <div className="experience-list">
          <div className="table-header">
            <span className="col-equipment">Equipment Type</span>
            <span className="col-class">Class</span>
            <span className="col-years">Years</span>
            <span className="col-miles">Approx. Miles</span>
            <span className="col-action"></span>
          </div>
          {experience.map((entry, index) => (
            <div key={index} className="table-row">
              <span className="col-equipment">{getEquipmentLabel(entry.equipment_type)}</span>
              <span className="col-class">
                {entry.class_required ? `Class ${entry.class_required}` : 'N/A'}
              </span>
              <span className="col-years">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={entry.years_experience}
                  onChange={(e) =>
                    handleUpdateEntry(index, 'years_experience', parseInt(e.target.value) || 0)
                  }
                />
              </span>
              <span className="col-miles">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={entry.approximate_miles}
                  onChange={(e) =>
                    handleUpdateEntry(index, 'approximate_miles', parseInt(e.target.value) || 0)
                  }
                />
              </span>
              <span className="col-action">
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => handleRemoveEntry(index)}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {availableEquipmentTypes.length > 0 && (
        <div className="add-experience-row">
          <select
            value={newEntry.equipment_type}
            onChange={(e) => handleNewEntryChange('equipment_type', e.target.value)}
            className="equipment-select"
          >
            <option value="">Select equipment type...</option>
            {availableEquipmentTypes.map((eq) => (
              <option key={eq.value} value={eq.value}>
                {eq.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            max="50"
            placeholder="Years"
            value={newEntry.years_experience || ''}
            onChange={(e) =>
              handleNewEntryChange('years_experience', parseInt(e.target.value) || 0)
            }
            className="years-input"
          />

          <input
            type="number"
            min="0"
            step="1000"
            placeholder="Miles"
            value={newEntry.approximate_miles || ''}
            onChange={(e) =>
              handleNewEntryChange('approximate_miles', parseInt(e.target.value) || 0)
            }
            className="miles-input"
          />

          <button
            type="button"
            className="btn btn-add"
            onClick={handleAddEntry}
            disabled={!newEntry.equipment_type}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      )}

      {experience.length === 0 && (
        <div className="empty-state">
          <p>No driving experience added yet. Add at least one equipment type.</p>
        </div>
      )}

      <div className="experience-totals">
        <span>
          Total Years: <strong>{experience.reduce((sum, e) => sum + (e.years_experience || 0), 0)}</strong>
        </span>
        <span>
          Total Miles: <strong>{experience.reduce((sum, e) => sum + (e.approximate_miles || 0), 0).toLocaleString()}</strong>
        </span>
      </div>
    </div>
  );
}
