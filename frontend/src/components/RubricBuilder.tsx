/**
 * Custom Rubric Builder Component
 *
 * Full CRUD interface for creating and managing evaluation rubrics
 * with customizable dimensions and weights.
 */
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, GripVertical, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'
import { createRubric, fetchRubrics, deleteRubric } from '../services/api'
import type { Rubric, RubricDimension } from '../types'

const DEFAULT_DIMENSION: RubricDimension = {
  name: '',
  weight: 1.0,
  description: '',
  max_score: 5,
}

const PRESET_RUBRICS: { name: string; dimensions: RubricDimension[] }[] = [
  {
    name: 'Standard Teaching Rubric',
    dimensions: [
      { name: 'Clarity of Explanation', weight: 1.2, description: 'How well concepts are explained', max_score: 5 },
      { name: 'Student Engagement', weight: 1.0, description: 'Interaction and engagement techniques', max_score: 5 },
      { name: 'Pacing', weight: 0.8, description: 'Appropriate speed and timing', max_score: 5 },
      { name: 'Body Language', weight: 0.8, description: 'Posture, gestures, eye contact', max_score: 5 },
      { name: 'Content Accuracy', weight: 1.2, description: 'Correctness of subject matter', max_score: 5 },
    ],
  },
  {
    name: 'Presentation Skills Rubric',
    dimensions: [
      { name: 'Voice Modulation', weight: 1.0, description: 'Volume, tone, and pitch variation', max_score: 5 },
      { name: 'Visual Aids Usage', weight: 1.0, description: 'Effective use of slides/props', max_score: 5 },
      { name: 'Audience Engagement', weight: 1.2, description: 'Questions, interaction, responsive to feedback', max_score: 5 },
      { name: 'Time Management', weight: 0.8, description: 'Staying within allocated time', max_score: 5 },
    ],
  },
]

export default function RubricBuilder() {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [editName, setEditName] = useState('')
  const [editDimensions, setEditDimensions] = useState<RubricDimension[]>([{ ...DEFAULT_DIMENSION }])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    loadRubrics()
  }, [])

  const loadRubrics = async () => {
    try {
      const data = await fetchRubrics()
      setRubrics(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rubrics')
    } finally {
      setLoading(false)
    }
  }

  const addDimension = () => {
    setEditDimensions(prev => [...prev, { ...DEFAULT_DIMENSION }])
  }

  const removeDimension = (idx: number) => {
    setEditDimensions(prev => prev.filter((_, i) => i !== idx))
  }

  const updateDimension = (idx: number, field: keyof RubricDimension, value: string | number) => {
    setEditDimensions(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const loadPreset = (preset: typeof PRESET_RUBRICS[0]) => {
    setEditName(preset.name)
    setEditDimensions([...preset.dimensions])
  }

  const handleSave = async () => {
    if (!editName.trim()) {
      setError('Please enter a rubric name')
      return
    }
    if (editDimensions.length === 0) {
      setError('At least one dimension is required')
      return
    }
    const valid = editDimensions.every(d => d.name.trim())
    if (!valid) {
      setError('All dimensions must have a name')
      return
    }

    setSaving(true)
    setError('')
    try {
      await createRubric({ name: editName, dimensions: editDimensions })
      setSuccessMsg('Rubric saved successfully!')
      setEditName('')
      setEditDimensions([{ ...DEFAULT_DIMENSION }])
      await loadRubrics()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save rubric')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rubric?')) return
    try {
      await deleteRubric(id)
      await loadRubrics()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete rubric')
    }
  }

  const totalWeight = editDimensions.reduce((sum, d) => sum + d.weight, 0)

  return (
    <div className="rubric-builder">
      {/* ── Existing Rubrics ───────────────────────── */}
      <div className="rubric-section">
        <h3><BookOpen size={18} /> Saved Rubrics</h3>
        {loading ? (
          <div className="loading-shimmer">Loading rubrics…</div>
        ) : rubrics.length === 0 ? (
          <p className="empty-state">No rubrics yet. Create one below or load a preset.</p>
        ) : (
          <div className="rubric-list">
            {rubrics.map(r => (
              <div key={r.id} className="rubric-card glass-card">
                <div className="rubric-card-header">
                  <strong>{r.name}</strong>
                  <span className="badge">{r.dimensions.length} dimensions</span>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(r.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="rubric-dims-preview">
                  {r.dimensions.map((d, i) => (
                    <span key={i} className="dim-tag">
                      {d.name} <small>×{d.weight}</small>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Preset Templates ─────────────────────── */}
      <div className="rubric-section">
        <h3>Quick Templates</h3>
        <div className="preset-buttons">
          {PRESET_RUBRICS.map((p, i) => (
            <button key={i} className="btn-secondary" onClick={() => loadPreset(p)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Builder ──────────────────────────────── */}
      <div className="rubric-section">
        <h3>Create / Edit Rubric</h3>

        <label className="form-label">Rubric Name</label>
        <input
          type="text"
          className="form-input"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder="e.g. My Custom Teaching Rubric"
        />

        <div className="dimensions-header">
          <label className="form-label">Dimensions</label>
          <span className="weight-total">Total weight: {totalWeight.toFixed(1)}</span>
        </div>

        <div className="dimensions-list">
          {editDimensions.map((dim, idx) => (
            <div key={idx} className="dimension-row glass-card">
              <GripVertical size={16} className="drag-handle" />
              <div className="dim-fields">
                <input
                  type="text"
                  className="form-input dim-name"
                  value={dim.name}
                  onChange={e => updateDimension(idx, 'name', e.target.value)}
                  placeholder="Dimension name"
                />
                <input
                  type="text"
                  className="form-input dim-desc"
                  value={dim.description}
                  onChange={e => updateDimension(idx, 'description', e.target.value)}
                  placeholder="Description"
                />
                <div className="dim-numbers">
                  <label>
                    Weight
                    <input
                      type="number"
                      className="form-input dim-num"
                      value={dim.weight}
                      onChange={e => updateDimension(idx, 'weight', parseFloat(e.target.value) || 0)}
                      step="0.1"
                      min="0"
                    />
                  </label>
                  <label>
                    Max
                    <input
                      type="number"
                      className="form-input dim-num"
                      value={dim.max_score}
                      onChange={e => updateDimension(idx, 'max_score', parseInt(e.target.value) || 1)}
                      min="1"
                      max="10"
                    />
                  </label>
                </div>
              </div>
              <button className="btn-icon btn-danger" onClick={() => removeDimension(idx)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="builder-actions">
          <button className="btn-secondary" onClick={addDimension}>
            <Plus size={16} /> Add Dimension
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Rubric'}
          </button>
        </div>

        {error && <div className="rubric-message error-msg"><AlertCircle size={16} />{error}</div>}
        {successMsg && <div className="rubric-message success-msg"><CheckCircle size={16} />{successMsg}</div>}
      </div>
    </div>
  )
}
