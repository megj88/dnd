import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./MapBuilderPage.css";

const MARKER_TYPES = [
  { value:"city", label:"City", icon:"🏙️" },
  { value:"dungeon", label:"Dungeon", icon:"⚔️" },
  { value:"landmark", label:"Landmark", icon:"🗿" },
  { value:"danger", label:"Danger", icon:"💀" },
  { value:"mystery", label:"Mystery", icon:"❓" },
  { value:"camp", label:"Camp", icon:"⛺" },
];

const DEFAULT_BG = "linear-gradient(135deg, #1a0e0a 0%, #2a1a0e 25%, #1e150a 50%, #251a0e 75%, #1a0e0a 100%)";

export default function MapBuilderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingMode, setPlacingMode] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const isOwner = map?.user_id === user?.id;

  useEffect(() => { fetchMap(); }, [id]);

  const fetchMap = async () => {
    const { data: mapData } = await supabase.from("maps").select("*").eq("id", id).maybeSingle();
    if (!mapData) { navigate("/maps"); return; }
    setMap(mapData);
    const { data: markerData } = await supabase.from("map_markers").select("*").eq("map_id", id).order("created_at");
    setMarkers(markerData || []);
    setLoading(false);
  };

  const handleMapClick = useCallback(async (e) => {
    if (!placingMode || !isOwner) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const { data } = await supabase.from("map_markers").insert({
      map_id: id, x, y, label: "New Location", type: "landmark", notes: "",
    }).select().single();

    if (data) {
      setMarkers(prev => [...prev, data]);
      setSelectedMarker(data);
      setEditForm({ ...data });
      setPlacingMode(false);
    }
  }, [placingMode, isOwner, id]);

  const handleMarkerClick = (e, marker) => {
    e.stopPropagation();
    setSelectedMarker(marker);
    setEditForm({ ...marker });
  };

  const handleSaveMarker = async () => {
    if (!editForm) return;
    await supabase.from("map_markers").update({
      label: editForm.label,
      type: editForm.type,
      notes: editForm.notes,
    }).eq("id", editForm.id);
    setMarkers(prev => prev.map(m => m.id === editForm.id ? { ...m, ...editForm } : m));
    setSelectedMarker({ ...selectedMarker, ...editForm });
  };

  const handleDeleteMarker = async (markerId) => {
    await supabase.from("map_markers").delete().eq("id", markerId);
    setMarkers(prev => prev.filter(m => m.id !== markerId));
    setSelectedMarker(null);
    setEditForm(null);
  };

  const handleUploadBg = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${id}/bg.${ext}`;
    await supabase.storage.from("maps").upload(path, file, { upsert: true });
    const { data: urlData } = supabase.storage.from("maps").getPublicUrl(path);
    const url = urlData.publicUrl;
    await supabase.from("maps").update({ background_url: url }).eq("id", id);
    setMap(prev => ({ ...prev, background_url: url }));
    setUploading(false);
  };

  const handleToggleShare = async () => {
    const updated = !map.shared;
    await supabase.from("maps").update({ shared: updated }).eq("id", id);
    setMap(prev => ({ ...prev, shared: updated }));
  };

  const markerIcon = (type) => MARKER_TYPES.find(t => t.value === type)?.icon || "📍";

  if (loading) return <div className="mb-loading">Unrolling the parchment...</div>;

  return (
    <div className="mb-wrap">
      {/* Toolbar */}
      <div className="mb-toolbar">
        <button className="mb-back-btn" onClick={() => navigate("/maps")}>← Maps</button>
        <div className="mb-toolbar-center">
          <div className="mb-map-title">{map.title}</div>
        </div>
        {isOwner && (
          <div className="mb-toolbar-right">
            <button
              className={`mb-tool-btn ${placingMode ? "active" : ""}`}
              onClick={() => { setPlacingMode(!placingMode); setSelectedMarker(null); }}
            >
              {placingMode ? "✕ Cancel" : "📍 Place Marker"}
            </button>
            <label className="mb-tool-btn mb-upload-label">
              {uploading ? "Uploading..." : "🖼️ Set Background"}
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleUploadBg} />
            </label>
            <button className={`mb-tool-btn ${map.shared ? "active" : ""}`} onClick={handleToggleShare}>
              {map.shared ? "🔓 Shared" : "🔒 Private"}
            </button>
          </div>
        )}
      </div>

      <div className="mb-main">
        {/* Map canvas */}
        <div
          className={`mb-map ${placingMode ? "placing" : ""}`}
          ref={mapRef}
          onClick={handleMapClick}
          style={map.background_url
            ? { backgroundImage:`url(${map.background_url})`, backgroundSize:"cover", backgroundPosition:"center" }
            : { background: DEFAULT_BG }
          }
        >
          {/* Parchment texture overlay */}
          {!map.background_url && (
            <div className="mb-parchment-overlay">
              <div className="mb-parchment-text">Upload a map image or click "Place Marker" to begin charting your world</div>
            </div>
          )}

          {/* Markers */}
          {markers.map(marker => (
            <div
              key={marker.id}
              className={`mb-marker ${selectedMarker?.id === marker.id ? "selected" : ""}`}
              style={{ left:`${marker.x}%`, top:`${marker.y}%` }}
              onClick={e => handleMarkerClick(e, marker)}
              onMouseEnter={() => setTooltip(marker)}
              onMouseLeave={() => setTooltip(null)}
            >
              <div className="mb-marker-icon">{markerIcon(marker.type)}</div>
              <div className="mb-marker-label">{marker.label}</div>
            </div>
          ))}

          {/* Tooltip */}
          {tooltip && selectedMarker?.id !== tooltip.id && (
            <div
              className="mb-tooltip"
              style={{ left:`${tooltip.x}%`, top:`${Math.max(0, tooltip.y - 8)}%` }}
            >
              <div className="mb-tooltip-label">{tooltip.label}</div>
              {tooltip.notes && <div className="mb-tooltip-notes">{tooltip.notes}</div>}
            </div>
          )}

          {placingMode && (
            <div className="mb-placing-hint">Click anywhere on the map to place a marker</div>
          )}
        </div>

        {/* Side panel */}
        {selectedMarker && editForm && (
          <div className="mb-panel">
            <div className="mb-panel-header">
              <div className="mb-panel-title">Edit Marker</div>
              <button className="mb-panel-close" onClick={() => { setSelectedMarker(null); setEditForm(null); }}>✕</button>
            </div>

            <div className="mb-panel-fields">
              <div className="mb-panel-field">
                <label className="mb-panel-label">Name</label>
                <input className="mb-panel-input" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} disabled={!isOwner} />
              </div>
              <div className="mb-panel-field">
                <label className="mb-panel-label">Type</label>
                <div className="mb-type-grid">
                  {MARKER_TYPES.map(t => (
                    <button
                      key={t.value}
                      className={`mb-type-btn ${editForm.type === t.value ? "active" : ""}`}
                      onClick={() => isOwner && setEditForm(f => ({ ...f, type: t.value }))}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-panel-field">
                <label className="mb-panel-label">Notes</label>
                <textarea className="mb-panel-input mb-panel-textarea" rows={4} value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe this location..." disabled={!isOwner} />
              </div>
            </div>

            {isOwner && (
              <div className="mb-panel-actions">
                <button className="mb-save-btn" onClick={handleSaveMarker}>Save Changes</button>
                <button className="mb-delete-btn" onClick={() => handleDeleteMarker(selectedMarker.id)}>Delete Marker</button>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        {!selectedMarker && (
          <div className="mb-legend">
            <div className="mb-legend-title">Legend</div>
            {MARKER_TYPES.map(t => (
              <div key={t.value} className="mb-legend-row">
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </div>
            ))}
            <div className="mb-legend-divider" />
            <div className="mb-legend-stat">{markers.length} location{markers.length !== 1 ? "s" : ""} marked</div>
            {map.shared && <div className="mb-legend-shared">🔓 Shared with party</div>}
          </div>
        )}
      </div>
    </div>
  );
}