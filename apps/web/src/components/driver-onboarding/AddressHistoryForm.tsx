import { useState } from 'react';
import { MapPin, Plus, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { Address } from './types';
import { US_STATES } from './types';
import './AddressHistoryForm.css';

interface AddressHistoryFormProps {
  addresses: Address[];
  onChange: (addresses: Address[]) => void;
  minYears?: number;
}

const EMPTY_ADDRESS: Address = {
  street: '',
  city: '',
  state: '',
  zip: '',
  from_date: '',
  to_date: null,
  is_current: false,
};

export function AddressHistoryForm({ addresses, onChange, minYears = 3 }: AddressHistoryFormProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    addresses.length === 0 ? null : addresses.findIndex((a) => a.is_current) ?? 0
  );
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  const addAddress = () => {
    const newAddress = { ...EMPTY_ADDRESS };
    onChange([...addresses, newAddress]);
    setExpandedIndex(addresses.length);
  };

  const removeAddress = (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    onChange(newAddresses);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    // Clear errors for removed address
    const newErrors = { ...errors };
    delete newErrors[index.toString()];
    setErrors(newErrors);
  };

  const updateAddress = (index: number, field: keyof Address, value: string | boolean | null) => {
    const newAddresses = [...addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };

    // If setting as current address, clear to_date and unset other current addresses
    if (field === 'is_current' && value === true) {
      newAddresses[index].to_date = null;
      newAddresses.forEach((addr, i) => {
        if (i !== index) {
          addr.is_current = false;
        }
      });
    }

    onChange(newAddresses);

    // Clear error for this field
    if (errors[index.toString()]?.[field]) {
      const newErrors = { ...errors };
      const indexErrors = { ...newErrors[index.toString()] };
      delete indexErrors[field];
      newErrors[index.toString()] = indexErrors;
      setErrors(newErrors);
    }
  };

  const validateAddress = (address: Address, index: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (!address.street.trim()) newErrors.street = 'Street is required';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.state) newErrors.state = 'State is required';
    if (!address.zip.trim()) newErrors.zip = 'ZIP is required';
    if (!address.from_date) newErrors.from_date = 'From date is required';
    if (!address.is_current && !address.to_date) newErrors.to_date = 'To date is required';

    setErrors((prev) => ({ ...prev, [index.toString()]: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const getAddressLabel = (address: Address): string => {
    if (address.is_current) return 'Current Address';
    if (address.city && address.state) return `${address.city}, ${address.state}`;
    return 'New Address';
  };

  const getDateRange = (address: Address): string => {
    if (!address.from_date) return '';
    const from = new Date(address.from_date).toLocaleDateString();
    if (address.is_current) return `${from} - Present`;
    if (address.to_date) {
      return `${from} - ${new Date(address.to_date).toLocaleDateString()}`;
    }
    return from;
  };

  const calculateTotalYears = (): number => {
    let totalMonths = 0;
    addresses.forEach((address) => {
      if (address.from_date) {
        const from = new Date(address.from_date);
        const to = address.to_date ? new Date(address.to_date) : new Date();
        const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
        totalMonths += Math.max(0, months);
      }
    });
    return totalMonths / 12;
  };

  const totalYears = calculateTotalYears();
  const hasEnoughHistory = totalYears >= minYears;

  return (
    <div className="address-history-form">
      <div className="form-section-header">
        <div className="header-icon">
          <MapPin size={18} />
        </div>
        <div className="header-content">
          <h4>Address History</h4>
          <p>Provide all addresses for the past {minYears} years, starting with your current address</p>
        </div>
        <button type="button" className="btn btn-sm btn-secondary" onClick={addAddress}>
          <Plus size={14} />
          Add Address
        </button>
      </div>

      <div className="progress-bar-container">
        <div className="progress-info">
          <span>{totalYears.toFixed(1)} years documented</span>
          <span className={hasEnoughHistory ? 'status-complete' : 'status-incomplete'}>
            {hasEnoughHistory ? (
              <>
                <Check size={14} />
                {minYears}-year requirement met
              </>
            ) : (
              `${(minYears - totalYears).toFixed(1)} more years needed`
            )}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${hasEnoughHistory ? 'complete' : ''}`}
            style={{ width: `${Math.min((totalYears / minYears) * 100, 100)}%` }}
          />
        </div>
      </div>

      {addresses.length === 0 ? (
        <div className="empty-state">
          <MapPin size={32} />
          <p>No addresses added yet</p>
          <button type="button" className="btn btn-primary" onClick={addAddress}>
            <Plus size={16} />
            Add Current Address
          </button>
        </div>
      ) : (
        <div className="address-list">
          {addresses.map((address, index) => {
            const isExpanded = expandedIndex === index;
            const addressErrors = errors[index.toString()] || {};
            const hasErrors = Object.keys(addressErrors).length > 0;

            return (
              <div key={index} className={`address-card ${isExpanded ? 'expanded' : ''} ${hasErrors ? 'has-errors' : ''}`}>
                <div
                  className="address-header"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <div className="address-info">
                    <div className="address-label">
                      {address.is_current && <span className="current-badge">Current</span>}
                      <span className="address-title">{getAddressLabel(address)}</span>
                    </div>
                    <span className="address-dates">{getDateRange(address)}</span>
                  </div>
                  <div className="address-actions">
                    {addresses.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAddress(index);
                        }}
                        title="Remove address"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button type="button" className="btn-icon">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="address-body">
                    <div className="form-group">
                      <label>
                        Street Address <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={address.street}
                        onChange={(e) => updateAddress(index, 'street', e.target.value)}
                        className={addressErrors.street ? 'error' : ''}
                        placeholder="123 Main St, Apt 4B"
                      />
                      {addressErrors.street && <span className="error-message">{addressErrors.street}</span>}
                    </div>

                    <div className="form-row three-col">
                      <div className="form-group">
                        <label>
                          City <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) => updateAddress(index, 'city', e.target.value)}
                          className={addressErrors.city ? 'error' : ''}
                          placeholder="City"
                        />
                        {addressErrors.city && <span className="error-message">{addressErrors.city}</span>}
                      </div>

                      <div className="form-group">
                        <label>
                          State <span className="required">*</span>
                        </label>
                        <select
                          value={address.state}
                          onChange={(e) => updateAddress(index, 'state', e.target.value)}
                          className={addressErrors.state ? 'error' : ''}
                        >
                          <option value="">Select</option>
                          {US_STATES.map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.value}
                            </option>
                          ))}
                        </select>
                        {addressErrors.state && <span className="error-message">{addressErrors.state}</span>}
                      </div>

                      <div className="form-group">
                        <label>
                          ZIP <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          value={address.zip}
                          onChange={(e) => updateAddress(index, 'zip', e.target.value)}
                          className={addressErrors.zip ? 'error' : ''}
                          placeholder="12345"
                          maxLength={10}
                        />
                        {addressErrors.zip && <span className="error-message">{addressErrors.zip}</span>}
                      </div>
                    </div>

                    <div className="form-row three-col">
                      <div className="form-group">
                        <label>
                          From Date <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          value={address.from_date}
                          onChange={(e) => updateAddress(index, 'from_date', e.target.value)}
                          className={addressErrors.from_date ? 'error' : ''}
                        />
                        {addressErrors.from_date && <span className="error-message">{addressErrors.from_date}</span>}
                      </div>

                      <div className="form-group">
                        <label>
                          To Date {!address.is_current && <span className="required">*</span>}
                        </label>
                        <input
                          type="date"
                          value={address.to_date || ''}
                          onChange={(e) => updateAddress(index, 'to_date', e.target.value || null)}
                          className={addressErrors.to_date ? 'error' : ''}
                          disabled={address.is_current}
                        />
                        {addressErrors.to_date && <span className="error-message">{addressErrors.to_date}</span>}
                      </div>

                      <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={address.is_current}
                            onChange={(e) => updateAddress(index, 'is_current', e.target.checked)}
                          />
                          <span className="checkbox-custom" />
                          <span>Current Address</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
