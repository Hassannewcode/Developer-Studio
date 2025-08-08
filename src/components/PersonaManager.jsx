/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useState, useEffect, useCallback, useRef} from 'react'
import c from 'clsx'
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import useStore from '../lib/store.js'
import models from '../lib/models.js'
import {
  addPersona,
  updatePersona,
  deletePersona,
  importPersonas,
  exportPersona,
  addApi,
  updateApi,
  deleteApi,
  addCodeFile,
  updateCodeFile,
  deleteCodeFile,
  bulkCreateItems,
  generateApiDefinition,
  checkCodeWithAI,
} from '../lib/actions.js'

const textModels = Object.entries(models).filter(
  ([, model]) => model.type === 'text'
)

const LANGUAGES = [
  'javascript',
  'python',
  'typescript',
  'html',
  'css',
  'json',
  'sql',
  'shell',
  'java',
  'go',
  'rust',
  'csharp',
  'markdown',
  'yaml',
];

const ProfileForm = ({persona, onSave, onCancel}) => {
  const apis = useStore(state => state.apis)
  const codeFiles = useStore(state => state.codeFiles)
  const [formData, setFormData] = useState({
    name: '',
    icon: 'person',
    systemInstruction: '',
    model: 'gemini-2.5-flash',
    temperature: 0.4,
    topP: 0.95,
    topK: 64,
    apiId: null,
    codeFileIds: [],
  })

  useEffect(() => {
    setFormData({
      name: '',
      icon: 'person',
      systemInstruction: '',
      model: 'gemini-2.5-flash',
      temperature: 0.4,
      topP: 0.95,
      topK: 64,
      apiId: null,
      codeFileIds: [],
      ...persona,
    })
  }, [persona])

  const handleChange = e => {
    const {name, value} = e.target
    setFormData(prev => ({...prev, [name]: value}))
  }

  const handleSliderChange = e => {
    const {name, valueAsNumber} = e.target
    setFormData(prev => ({...prev, [name]: valueAsNumber}))
  }

  const handleCodeFileChange = fileId => {
    setFormData(prev => {
      const newCodeFileIds = prev.codeFileIds.includes(fileId)
        ? prev.codeFileIds.filter(id => id !== fileId)
        : [...prev.codeFileIds, fileId];
      return {...prev, codeFileIds: newCodeFileIds};
    });
  };

  const handleSubmit = e => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="studio-form">
      <h3>{persona ? 'Edit' : 'Create'} AI Profile</h3>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name">Profile Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Sarcastic Code Reviewer"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="icon">Icon</label>
          <input
            type="text"
            id="icon"
            name="icon"
            value={formData.icon}
            onChange={handleChange}
            placeholder="Symbol name"
            required
          />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="systemInstruction">System Instruction</label>
        <textarea
          id="systemInstruction"
          name="systemInstruction"
          value={formData.systemInstruction}
          onChange={handleChange}
          placeholder="Define the AI's personality, expertise, and rules..."
          rows="4"
          required
        />
      </div>

      <div className="form-field">
        <label>Attached Code Files (for context)</label>
        {codeFiles.length > 0 ? (
          <div className="form-grid-checkboxes">
            {codeFiles.map(file => (
              <div className="checkbox-field" key={file.id}>
                <input
                  type="checkbox"
                  id={`code-file-${file.id}`}
                  checked={formData.codeFileIds.includes(file.id)}
                  onChange={() => handleCodeFileChange(file.id)}
                />
                <label htmlFor={`code-file-${file.id}`}>{file.name}</label>
              </div>
            ))}
          </div>
        ) : (
          <p
            className="empty-list-message"
            style={{padding: '10px 0', textAlign: 'left', margin: 0}}
          >
            No code files available. Create them in the 'Code' tab.
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="apiId">Attached API (Optional)</label>
        <select
          id="apiId"
          name="apiId"
          value={formData.apiId || ''}
          onChange={handleChange}
        >
          <option value="">None</option>
          {apis.map(api => (
            <option key={api.id} value={api.id}>
              {api.name} ({api.type})
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="model">Base Model</label>
        <select
          id="model"
          name="model"
          value={formData.model}
          onChange={handleChange}
        >
          {textModels.map(([key, model]) => (
            <option key={key} value={key}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-grid-sliders">
        <div className="form-field slider-field">
          <label>Creativity (Temp): {formData.temperature.toFixed(1)}</label>
          <input
            type="range"
            name="temperature"
            min="0"
            max="1"
            step="0.1"
            value={formData.temperature}
            onChange={handleSliderChange}
          />
        </div>
        <div className="form-field slider-field">
          <label>Top-P: {formData.topP.toFixed(2)}</label>
          <input
            type="range"
            name="topP"
            min="0"
            max="1"
            step="0.05"
            value={formData.topP}
            onChange={handleSliderChange}
          />
        </div>
        <div className="form-field slider-field">
          <label>Top-K: {formData.topK}</label>
          <input
            type="range"
            name="topK"
            min="1"
            max="100"
            step="1"
            value={formData.topK}
            onChange={handleSliderChange}
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary">
          Save Profile
        </button>
      </div>
    </form>
  )
}

const ApiForm = ({api, onSave, onCancel}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'tools',
    description: '',
    definition: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData({
      name: '',
      type: 'tools',
      description: '',
      definition: '',
      ...api,
    });
    setError('');
  }, [api]);

  const handleChange = e => {
    const {name, value} = e.target;
    if (name === 'definition' || name === 'description') setError('');
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handleGenerate = async () => {
    if (!formData.description || isGenerating) return;
    setIsGenerating(true);
    setError('');
    const result = await generateApiDefinition(formData.description, formData.type);
    if (result.success) {
      setFormData(prev => ({...prev, definition: result.definition}));
    } else {
      setError(result.message);
    }
    setIsGenerating(false);
  };

  const handleSubmit = e => {
    e.preventDefault();
    try {
      if (formData.definition) {
        JSON.parse(formData.definition);
      } else {
        setError('API Definition cannot be empty. Please generate one with AI.');
        return;
      }
      setError('');
      onSave(formData);
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="studio-form">
      <h3>{api ? 'Edit' : 'Create'} API</h3>
      <div className="form-field">
        <label htmlFor="api-name">API Name</label>
        <input
          type="text"
          id="api-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Recipe Lookup API"
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="api-type">API Type</label>
        <select
          id="api-type"
          name="type"
          value={formData.type}
          onChange={handleChange}
        >
          <option value="tools">Function Calling (Tools)</option>
          <option value="schema">Response Schema (JSON Mode)</option>
        </select>
      </div>
      
      <div className="form-field">
        <label htmlFor="api-description">Describe the API you want to create</label>
        <textarea
          id="api-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., a tool to get the current weather for a given city and unit (celsius or fahrenheit)"
          rows="3"
        />
        <button
          type="button"
          className="button ai-action"
          onClick={handleGenerate}
          disabled={isGenerating || !formData.description}
        >
          {isGenerating ? 
            <><span className="icon loader">progress_activity</span> Generating...</> :
            <><span className="icon">auto_awesome</span> Generate Definition with AI</>
          }
        </button>
      </div>

      <div className="form-field">
        <label htmlFor="api-definition">API Definition (JSON)</label>
        <textarea
          id="api-definition"
          name="definition"
          value={formData.definition}
          onChange={handleChange}
          className={c({ 'invalid-schema': error.includes('Invalid JSON') })}
          placeholder="Generated JSON will appear here. You can edit it manually."
          rows="10"
          required
        />
        {error && <p className="schema-error-message">{error}</p>}
      </div>
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary">
          Save API
        </button>
      </div>
    </form>
  )
}

const CodeFileForm = ({codeFile, onSave, onCancel}) => {
  const [formData, setFormData] = useState({
    name: '',
    language: 'javascript',
    content: '',
  });
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    setFormData({
      name: '',
      language: 'javascript',
      content: '',
      ...codeFile,
    })
    setCheckResult(null);
  }, [codeFile]);

  const handleChange = e => {
    const {name, value} = e.target;
    setFormData(prev => ({...prev, [name]: value}));
    if (name === 'content') {
        setCheckResult(null);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSave(formData);
  };
  
  const handleCheckCode = async () => {
    if (!formData.content || isChecking) return;
    setIsChecking(true);
    setCheckResult(null);
    const result = await checkCodeWithAI(formData.content, formData.language);
    setCheckResult(result);
    setIsChecking(false);
  };

  return (
    <form onSubmit={handleSubmit} className="studio-form">
      <h3>{codeFile ? 'Edit' : 'Create'} Code File</h3>
      <div className="form-field">
        <label htmlFor="code-name">File Name</label>
        <input
          type="text"
          id="code-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., utils.js"
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="code-language">Language</label>
        <select
          id="code-language"
          name="language"
          value={formData.language}
          onChange={handleChange}
        >
          {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="code-content">Content</label>
        <textarea
          id="code-content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          placeholder="Write your code here..."
          rows="15"
          required
        />
      </div>
      
      <div className="form-field">
        <button
          type="button"
          className="button ai-action"
          onClick={handleCheckCode}
          disabled={isChecking || !formData.content}
        >
          {isChecking ? 
            <><span className="icon loader">progress_activity</span> Checking...</> :
            <><span className="icon">spellcheck</span> Check for Errors with AI</>
          }
        </button>
        {checkResult && (
            <div className="code-check-result">
                {checkResult === 'OK' ? (
                    <p className="code-check-result-success">
                        <span className="icon">check_circle</span>
                        AI analysis found no errors.
                    </p>
                ) : (
                    <div className="code-check-result-errors">
                        <h5><span className="icon">error</span> AI found potential issues:</h5>
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(checkResult)) }} />
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary">
          Save File
        </button>
      </div>
    </form>
  )
}

const BulkCreateView = ({itemType, onCancel, onCreated}) => {
  const { isBulkCreating } = useStore();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt || isBulkCreating) return;
    const result = await bulkCreateItems(prompt, itemType);
    if (result.success) {
      onCreated(result.count);
    } else {
      alert(`Bulk creation failed: ${result.message}`);
    }
  };
  
  const getPromptPlaceholder = () => {
    switch(itemType) {
        case 'profiles':
            return 'e.g., a sarcastic code reviewer, a cheerful UI/UX designer, and a formal SQL admin';
        case 'apis':
            return 'e.g., an API to get the weather, an API to search for books by author';
        case 'code':
            return 'e.g., a javascript file with common array utilities, a python script to parse CSV files';
        default:
            return '';
    }
  }

  return (
    <div className="bulk-create-view">
      {isBulkCreating && (
        <div className="bulk-create-loader">
          <span className="icon loader">progress_activity</span>
          <p>AI is generating your items...</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="studio-form">
        <h3>Bulk Create {itemType.charAt(0).toUpperCase() + itemType.slice(1)} with AI</h3>
        <div className="form-field">
          <label htmlFor="bulk-prompt">Describe what you want to create</label>
          <textarea
            id="bulk-prompt"
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={getPromptPlaceholder()}
            rows="5"
            required
          />
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={!prompt || isBulkCreating}>
            <span className="icon">auto_awesome</span> Create
          </button>
        </div>
      </form>
    </div>
  );
};


const StudioManager = ({onClose}) => {
  const {personas, apis, codeFiles} = useStore()
  const [activeTab, setActiveTab] = useState('profiles')
  const [editingItem, setEditingItem] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [viewMode, setViewMode] = useState('list'); // 'list', 'form', or 'bulk'
  
  const fileInputRef = useRef(null);

  const handleKeyDown = useCallback(e => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSave = (itemData) => {
    if (editingItem && editingItem.id) {
        if (activeTab === 'profiles') updatePersona({...editingItem, ...itemData});
        else if (activeTab === 'apis') updateApi({...editingItem, ...itemData});
        else if (activeTab === 'code') updateCodeFile({...editingItem, ...itemData});
    } else {
        if (activeTab === 'profiles') addPersona(itemData);
        else if (activeTab === 'apis') addApi(itemData);
        else if (activeTab === 'code') addCodeFile(itemData);
    }
    setEditingItem(null);
    setViewMode('list');
  };

  const handleEdit = item => {
    setEditingItem(item);
    setViewMode('form');
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this item?')) {
        if (activeTab === 'profiles') deletePersona(id);
        else if (activeTab === 'apis') deleteApi(id);
        else if (activeTab === 'code') deleteCodeFile(id);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  }

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          importPersonas(data); // Only supports persona import for now
        } catch (error) {
          console.error("Failed to parse imported file", error);
          alert("Import failed: Could not parse JSON file.");
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = null;
  };
  
  const handleBulkCreated = (count) => {
      alert(`${count} ${activeTab} created successfully!`);
      setViewMode('list');
  };

  const renderList = () => {
    let items, itemType, itemIcon, handleDeleteFn, handleEditFn;

    switch (activeTab) {
        case 'apis':
            items = apis;
            itemType = 'API';
            itemIcon = (item) => <span className={c('chip', item.type)}>{item.type}</span>;
            handleDeleteFn = deleteApi;
            handleEditFn = updateApi;
            break;
        case 'code':
            items = codeFiles;
            itemType = 'Code File';
            itemIcon = (item) => <span className="chip code">{item.language}</span>;
            handleDeleteFn = deleteCodeFile;
            handleEditFn = updateCodeFile;
            break;
        default:
            items = personas;
            itemType = 'AI Profile';
            itemIcon = (item) => <span className="icon profile-icon">{item.icon}</span>;
            handleDeleteFn = deletePersona;
            handleEditFn = updatePersona;
    }
    
    return (
        <>
            <div className="studio-list-actions">
                <button className="button primary" onClick={() => setViewMode('form')}>
                    <span className="icon">add</span> Create New {itemType}
                </button>
                 <button className="button" onClick={() => setViewMode('bulk')}>
                    <span className="icon auto_awesome">auto_awesome</span> Bulk Create with AI
                </button>
                {activeTab === 'profiles' && (
                    <>
                        <button className="button" onClick={handleImportClick}>
                            <span className="icon">file_upload</span> Import Profiles
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" style={{ display: 'none' }} />
                    </>
                )}
            </div>
            <div className="studio-list">
                {items.length > 0 ? (
                    items.map(item => (
                        <div key={item.id} className="studio-list-item" onClick={() => handleEdit(item)}>
                            <div className="studio-list-item-name">
                                {itemIcon(item)}
                                <span>{item.name}</span>
                            </div>
                            <div className="studio-list-item-actions">
                                {activeTab === 'profiles' && (
                                    <button className="iconButton" onClick={(e) => {e.stopPropagation(); exportPersona(item.id)}} title="Export Profile">
                                        <span className="icon">file_download</span>
                                    </button>
                                )}
                                <button className="iconButton" onClick={(e) => { e.stopPropagation(); handleEdit(item) }} title="Edit">
                                    <span className="icon">edit</span>
                                </button>
                                <button className="iconButton" onClick={(e) => handleDelete(e, item.id)} title="Delete">
                                    <span className="icon">delete</span>
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="empty-list-message">No {itemType}s yet. Create one to get started!</p>
                )}
            </div>
        </>
    );
  };
  
  const renderForm = () => {
    const handleCancel = () => {
      setEditingItem(null);
      setViewMode('list');
    };

    switch (activeTab) {
      case 'profiles':
        return <ProfileForm persona={editingItem} onSave={handleSave} onCancel={handleCancel} />;
      case 'apis':
        return <ApiForm api={editingItem} onSave={handleSave} onCancel={handleCancel} />;
      case 'code':
        return <CodeFileForm codeFile={editingItem} onSave={handleSave} onCancel={handleCancel} />;
      default:
        return null;
    }
  };
  
  const renderBulkCreate = () => (
    <BulkCreateView 
        itemType={activeTab}
        onCancel={() => setViewMode('list')}
        onCreated={handleBulkCreated}
    />
  );
  
  const renderContent = () => {
    switch (viewMode) {
        case 'form':
            return renderForm();
        case 'bulk':
            return renderBulkCreate();
        case 'list':
        default:
            return renderList();
    }
  };

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    setViewMode('list');
    setEditingItem(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><span className="icon">star</span> AI Studio Manager</h2>
          <button className="iconButton" onClick={onClose}><span className="icon">close</span></button>
        </div>
        <div className="modal-tabs">
          <button className={c('modal-tab', { active: activeTab === 'profiles' })} onClick={() => handleTabClick('profiles')}>AI Profiles</button>
          <button className={c('modal-tab', { active: activeTab === 'apis' })} onClick={() => handleTabClick('apis')}>APIs</button>
          <button className={c('modal-tab', { active: activeTab === 'code' })} onClick={() => handleTabClick('code')}>Code</button>
        </div>
        <div className="tab-content">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default StudioManager;
