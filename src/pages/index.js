import { useEffect, useMemo, useState } from 'react';

export default function FileUploader() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [filePath, setFilePath] = useState('');
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [letterYear, setLetterYear] = useState(currentYear);
  const [customSubject, setCustomSubject] = useState('');
  const [customParagraphs, setCustomParagraphs] = useState([]);

  // Fetch available templates on load
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
          if (data.length > 0) {
            setSelectedTemplateId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Fehler beim Laden der Vorlagen:', err);
      }
    };
    fetchTemplates();
  }, []);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Sync editor fields with the chosen template defaults
  useEffect(() => {
    if (selectedTemplate) {
      setCustomSubject(selectedTemplate.subject || '');
      setCustomParagraphs(selectedTemplate.paragraphs || []);
    } else {
      setCustomSubject('');
      setCustomParagraphs([]);
    }
  }, [selectedTemplate]);

  const requiredOk = useMemo(() => {
    if (!preview?.required_columns) return false;
    return Object.values(preview.required_columns).every(Boolean);
  }, [preview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedTemplateId) return;

    setUploading(true);
    setMessage('');
    try {
      const customSubjectB64 = btoa(unescape(encodeURIComponent(customSubject)));
      const customParagraphsB64 = btoa(unescape(encodeURIComponent(JSON.stringify(customParagraphs))));

      const response = await fetch(`/api/upload?year=${letterYear}&templateId=${selectedTemplateId}&customSubject=${customSubjectB64}&customParagraphs=${customParagraphsB64}`, {
        method: 'POST',
        headers: {
          'X-File-Name': file.name,
          'X-Letter-Year': String(letterYear),
          'X-Template-Id': selectedTemplateId,
          'X-Custom-Subject': customSubjectB64,
          'X-Custom-Paragraphs': customParagraphsB64,
        },
        body: file,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error || 'Fehler beim Erstellen der PDF');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Dynamic link download to bypass browser navigation blocks
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Briefe_${letterYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      setMessage('PDF erfolgreich erstellt und heruntergeladen.');
    } catch (error) {
      setMessage('Fehler: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async () => {
    if (!file || !selectedTemplateId) return;
    setUploading(true);
    setMessage('');
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'X-File-Name': file.name,
          'X-Template-Id': selectedTemplateId,
        },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Vorschau fehlgeschlagen');
      }
      setPreview(data);
      setFilePath(data.file_path);
    } catch (err) {
      setMessage('Vorschau fehlgeschlagen: ' + err.message);
      setPreview(null);
      setFilePath('');
    } finally {
      setUploading(false);
    }
  };

  // Re-run preview when file or selected template changes
  useEffect(() => {
    if (file && selectedTemplateId) {
      handlePreview();
    } else {
      setPreview(null);
      setFilePath('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, selectedTemplateId]);

  const themeColors = {
    'theme-red': '#ef4444',
    'theme-blue': '#3b82f6',
    'theme-green': '#10b981',
    'theme-gold': '#d97706',
  };
  const themeLightColors = {
    'theme-red': '#fee2e2',
    'theme-blue': '#dbeafe',
    'theme-green': '#d1fae5',
    'theme-gold': '#fef3c7',
  };
  const activeColor = themeColors[selectedTemplate?.theme] || '#4361ee';
  const activeLightColor = themeLightColors[selectedTemplate?.theme] || '#e0e7ff';

  return (
    <div className="upload-card" style={{ '--primary': activeColor, '--primary-light': activeLightColor }}>
      <div className="upload-header">
        <h2 className="upload-title">AWO Brief-Generator</h2>
        <p className="upload-subtitle">Wählen Sie eine Vorlage und laden Sie die CSV-Datei hoch</p>
      </div>

      {/* Schritt 1: Vorlage auswählen */}
      <section className="step">
        <div className="step-header">
          <span className="step-number">1</span>
          <h3 className="step-title">Vorlage auswählen</h3>
        </div>
        <div className="step-body">
          <select
            className="year-select"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', color: '#374151' }}
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={uploading || templates.length === 0}
          >
            {templates.length === 0 ? (
              <option>Lade Vorlagen...</option>
            ) : (
              templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
          {selectedTemplate?.description && (
            <p className="upload-subtitle" style={{ marginTop: '0.4rem', fontStyle: 'italic' }}>
              {selectedTemplate.description}
            </p>
          )}
        </div>
      </section>

      {/* Schritt 2: Datei auswählen */}
      <section className="step">
        <div className="step-header">
          <span className="step-number">2</span>
          <h3 className="step-title">Datei auswählen</h3>
        </div>
        <div className="step-body">
          <div 
            className={`upload-zone ${isDragging ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              setFile(e.dataTransfer.files[0]);
            }}
          >
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            
            {file ? (
              <div className="file-preview">
                <p className="file-name">{file.name}</p>
                <button 
                  className="clear-button"
                  onClick={() => setFile(null)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <label className="browse-button">
                  Datei auswählen
                  <input 
                    type="file" 
                    className="file-input"
                    onChange={(e) => setFile(e.target.files[0])}
                    disabled={uploading}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Schritt 3: Vorschau der Pflichtfelder */}
      {preview && (
        <section className="step">
          <div className="step-header">
            <span className="step-number">3</span>
            <h3 className="step-title">Vorschau der Pflichtfelder</h3>
          </div>
          <div className="step-body">
            <div className="preview-container">
              <div className="preview-meta">
                <span className="badge">Encoding: {preview.detected_encoding}</span>
                <span className="badge">Delimiter: {preview.used_delimiter}</span>
                <span className="badge">Zeilen: {preview.row_count_estimate}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="preview-table">
                  <thead>
                    <tr>
                      {(preview.required_columns_order || []).map((name) => (
                        <th key={name}>{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i}>
                        {(preview.required_columns_order || []).map((name) => (
                          <td key={name}>{r[name] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.required_columns && (
                <div style={{ marginTop: 8 }}>
                  <strong>Pflichtspalten Status:</strong>
                  <div className="preview-required">
                    {(preview.required_columns_order || []).map((name) => {
                      const ok = preview.required_columns?.[name] ?? false;
                      return (
                        <span key={name} className={`badge ${ok ? 'ok' : 'error'}`}>
                          {name}: {ok ? 'ok' : 'fehlt'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Schritt 4: Jahr auswählen (nur sichtbar wenn die Vorlage ein Datumsfeld benötigt) */}
      {preview && selectedTemplate?.date_column && (
        <section className="step">
          <div className="step-header">
            <span className="step-number">4</span>
            <h3 className="step-title">Jahr auswählen</h3>
          </div>
          <div className="step-body">
            <div className="year-input">
              <select
                className="year-select"
                disabled={uploading}
                value={letterYear}
                onChange={(e) => setLetterYear(Number(e.target.value))}
              >
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Schritt 5: PDF erstellen */}
      {preview && (
        <section className="step">
          <div className="step-header">
            <span className="step-number">{selectedTemplate?.date_column ? 5 : 4}</span>
            <h3 className="step-title">PDF erstellen</h3>
          </div>
          <div className="step-body">
            <button 
              className={`submit-button ${uploading ? 'uploading' : ''}`}
              disabled={uploading || !file || !requiredOk}
              onClick={handleSubmit}
            >
              {uploading ? (
                <>
                  <span className="spinner"></span>
                  Wird verarbeitet...
                </>
              ) : (
                'Dokumente generieren (PDF)'
              )}
            </button>
            {!requiredOk && (
              <div className="status-message error" style={{ marginTop: '8px' }}>
                Es fehlen Pflichtspalten in der CSV für die gewählte Vorlage.
              </div>
            )}
          </div>
        </section>
      )}

      {message && (
        <div className={`status-message ${message.startsWith('Fehler') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  );
}