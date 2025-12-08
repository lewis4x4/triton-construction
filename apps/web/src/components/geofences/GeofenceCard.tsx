import { useState } from 'react';
import {
  MapPin,
  Building,
  Fuel,
  Truck,
  Users,
  ShieldAlert,
  Car,
  Wrench,
  MoreVertical,
  Edit,
  Trash2,
  Bell,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Database } from '../../types/database';

type Geofence = Database['public']['Tables']['geofences']['Row'];
type GeofenceType = Database['public']['Enums']['geofence_type'];

interface GeofenceCardProps {
  geofence: Geofence & {
    project_name?: string;
    event_count_today?: number;
  };
  onEdit?: (geofence: Geofence) => void;
  onDelete?: (geofence: Geofence) => void;
  onToggleActive?: (geofence: Geofence, isActive: boolean) => void;
  onViewEvents?: (geofence: Geofence) => void;
}

const geofenceTypeConfig: Record<GeofenceType, { icon: typeof MapPin; color: string; label: string }> = {
  PROJECT_SITE: { icon: Building, color: 'blue', label: 'Project Site' },
  COMPANY_YARD: { icon: Truck, color: 'green', label: 'Company Yard' },
  FUEL_STATION: { icon: Fuel, color: 'orange', label: 'Fuel Station' },
  SUPPLIER: { icon: Users, color: 'purple', label: 'Supplier' },
  CUSTOMER: { icon: Users, color: 'indigo', label: 'Customer' },
  RESTRICTED_AREA: { icon: ShieldAlert, color: 'red', label: 'Restricted Area' },
  PARKING: { icon: Car, color: 'gray', label: 'Parking' },
  MAINTENANCE_SHOP: { icon: Wrench, color: 'yellow', label: 'Maintenance Shop' },
};

export function GeofenceCard({
  geofence,
  onEdit,
  onDelete,
  onToggleActive,
  onViewEvents,
}: GeofenceCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const typeConfig = geofenceTypeConfig[geofence.geofence_type as GeofenceType] || geofenceTypeConfig.PROJECT_SITE;
  const Icon = typeConfig.icon;

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  };

  const colors = colorClasses[typeConfig.color] || { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4 relative`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{geofence.name}</h3>
            {!geofence.is_active && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                Inactive
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.text} bg-white`}>
              {typeConfig.label}
            </span>
            {geofence.project_name && (
              <span className="text-xs text-gray-500">{geofence.project_name}</span>
            )}
          </div>

          {geofence.description && (
            <p className="text-sm text-gray-600 mt-2 truncate">{geofence.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{geofence.radius_meters || 100}m radius</span>
            </div>
            {geofence.event_count_today !== undefined && (
              <div className="flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" />
                <span>{geofence.event_count_today} events today</span>
              </div>
            )}
            {geofence.speed_limit_mph && (
              <div className="flex items-center gap-1">
                <span>{geofence.speed_limit_mph} mph limit</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-white/50"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                <div className="py-1">
                  {onViewEvents && (
                    <button
                      onClick={() => {
                        onViewEvents(geofence);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      View Events
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(geofence);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Geofence
                    </button>
                  )}
                  {onToggleActive && (
                    <button
                      onClick={() => {
                        onToggleActive(geofence, !geofence.is_active);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      {geofence.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(geofence);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Alert Configuration Summary */}
      {(geofence.alert_on_enter || geofence.alert_on_exit || geofence.alert_on_speeding) && (
        <div className="mt-3 pt-3 border-t border-white/50 flex flex-wrap gap-2">
          {geofence.alert_on_enter && (
            <span className="px-2 py-1 text-xs bg-white rounded border text-gray-600">
              Entry Alert
            </span>
          )}
          {geofence.alert_on_exit && (
            <span className="px-2 py-1 text-xs bg-white rounded border text-gray-600">
              Exit Alert
            </span>
          )}
          {geofence.alert_on_speeding && (
            <span className="px-2 py-1 text-xs bg-white rounded border text-gray-600">
              Speeding Alert
            </span>
          )}
          {geofence.dwell_threshold_minutes && (
            <span className="px-2 py-1 text-xs bg-white rounded border text-gray-600">
              Dwell {geofence.dwell_threshold_minutes}min
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default GeofenceCard;
