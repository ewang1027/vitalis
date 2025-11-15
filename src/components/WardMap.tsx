import React, { useState } from 'react';
import { Asset, RoomReadiness } from '@/types/wardops';
import { Activity } from 'lucide-react';

interface WardMapProps {
  assets: Asset[];
  roomReadiness: RoomReadiness[];
  onRoomSelect: (roomId: string) => void;
  onAssetSelect: (assetId: string) => void;
  selectedRoomId: string | null;
}

const assetStateColors = {
  'in_use': 'text-accent-green',
  'idle_ready': 'text-accent-blue',
  'idle_too_long': 'text-accent-yellow',
  'missing': 'text-accent-red',
  'dirty': 'text-accent-yellow',
  'broken': 'text-accent-red',
};

export function WardMap({ assets, roomReadiness, onRoomSelect, onAssetSelect, selectedRoomId }: WardMapProps) {
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);

  const getRoomAssets = (roomId: string) => {
    return assets.filter(a => a.roomId === roomId);
  };

  const getRoomReadinessColor = (roomId: string) => {
    const readiness = roomReadiness.find(r => r.roomId === roomId);
    if (!readiness) return 'border-border';
    
    if (readiness.readinessScore >= 90) return 'border-accent-green';
    if (readiness.readinessScore >= 70) return 'border-accent-yellow';
    return 'border-accent-red';
  };

  return (
    <div className="h-full p-4 flex flex-col min-w-0">
      <div className="mb-4 min-w-0">
        <h3 className="text-lg font-bold text-text-primary truncate">Ward 101 - Floor Plan</h3>
        <p className="text-sm text-text-secondary truncate">Click rooms or assets for details</p>
      </div>

      <div className="flex-1 glass-panel rounded-lg p-4 relative min-w-0">
        {/* Stylized Grid Background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(hsl(var(--accent-cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent-cyan)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Rooms Layout */}
        <div className="relative h-full grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
          {/* Room 101 */}
          <div
            onClick={() => onRoomSelect('room-101')}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-glow relative min-w-0
              ${selectedRoomId === 'room-101' ? 'glow-border-cyan' : getRoomReadinessColor('room-101')}
            `}
          >
            <div className="min-w-0 mb-12">
              <h4 className="text-base font-bold text-text-primary truncate">Room 101</h4>
              <div className="flex items-center gap-2 mt-1">
                <Activity className="h-3 w-3 text-accent-yellow flex-shrink-0" />
                <span className="text-xs text-text-secondary whitespace-nowrap">72% Ready</span>
              </div>
            </div>

            {/* Assets in Room 101 */}
            <div className="space-y-2 min-w-0">
              {getRoomAssets('room-101').map(asset => (
                <button
                  key={asset.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssetSelect(asset.id);
                  }}
                  onMouseEnter={() => setHoveredAsset(asset.id)}
                  onMouseLeave={() => setHoveredAsset(null)}
                  className={`
                    w-full px-2 py-1.5 rounded text-left text-sm min-w-0
                    bg-bg-tertiary/50 border transition-smooth
                    hover:bg-bg-tertiary hover:scale-105
                    ${assetStateColors[asset.state]}
                  `}
                  style={{ borderColor: hoveredAsset === asset.id ? 'hsl(var(--accent-cyan))' : 'hsl(var(--border-subtle))' }}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-medium truncate min-w-0">{asset.name}</span>
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      asset.state === 'in_use' ? 'bg-accent-green' :
                      asset.state === 'idle_ready' ? 'bg-accent-blue' :
                      asset.state === 'idle_too_long' ? 'bg-accent-yellow' :
                      'bg-accent-red'
                    }`} />
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5 truncate">{asset.stateLabel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Room 102 */}
          <div
            onClick={() => onRoomSelect('room-102')}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-glow relative min-w-0
              ${selectedRoomId === 'room-102' ? 'glow-border-cyan' : getRoomReadinessColor('room-102')}
            `}
          >
            <div className="min-w-0 mb-12">
              <h4 className="text-base font-bold text-text-primary truncate">Room 102</h4>
              <div className="flex items-center gap-2 mt-1">
                <Activity className="h-3 w-3 text-accent-green flex-shrink-0" />
                <span className="text-xs text-text-secondary whitespace-nowrap">95% Ready</span>
              </div>
            </div>

            {/* Assets in Room 102 */}
            <div className="space-y-2 min-w-0">
              {getRoomAssets('room-102').map(asset => (
                <button
                  key={asset.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssetSelect(asset.id);
                  }}
                  onMouseEnter={() => setHoveredAsset(asset.id)}
                  onMouseLeave={() => setHoveredAsset(null)}
                  className={`
                    w-full px-2 py-1.5 rounded text-left text-sm min-w-0
                    bg-bg-tertiary/50 border transition-smooth
                    hover:bg-bg-tertiary hover:scale-105
                    ${assetStateColors[asset.state]}
                  `}
                  style={{ borderColor: hoveredAsset === asset.id ? 'hsl(var(--accent-cyan))' : 'hsl(var(--border-subtle))' }}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-medium truncate min-w-0">{asset.name}</span>
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      asset.state === 'in_use' ? 'bg-accent-green' :
                      asset.state === 'idle_ready' ? 'bg-accent-blue' :
                      'bg-accent-red'
                    }`} />
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5 truncate">{asset.stateLabel}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
