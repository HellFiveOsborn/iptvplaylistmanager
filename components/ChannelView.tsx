import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Channel, Category } from '../types';
import { Trash2, Edit2, Plus, Search, ExternalLink, Image as ImageIcon, Video, X, GripVertical, Copy, Loader2, PlayCircle, AlertTriangle } from 'lucide-react';

interface ChannelViewProps {
  channels: Channel[];
  categories: Category[];
  onAdd: (c: Channel) => void;
  onUpdate: (id: string, c: Channel) => void;
  onDelete: (id: string) => void;
  onReorder: (channels: Channel[]) => void;
}

const EMPTY_CHANNEL: Channel = {
  id: '',
  name: '',
  logo: '',
  url: [''],
  guide: '',
  category: '',
  country: 'bra'
};

// --- Video Player Component ---
const VideoPlayerModal = ({ urls, onClose }: { urls: string[]; onClose: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const currentUrl = urls[currentSourceIndex];

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Reset error on url change
        setError(null);

        // Check for HLS support
        if (currentUrl.endsWith('.m3u8') || currentUrl.includes('.m3u8')) {
            // @ts-ignore
            if (window.Hls && window.Hls.isSupported()) {
                // @ts-ignore
                const hls = new window.Hls();
                hls.loadSource(currentUrl);
                hls.attachMedia(video);
                hls.on(
                    // @ts-ignore
                    window.Hls.Events.MANIFEST_PARSED, 
                    () => { video.play().catch(e => console.log("Autoplay blocked", e)); }
                );
                hls.on(
                    // @ts-ignore
                    window.Hls.Events.ERROR, 
                    (event: any, data: any) => {
                        if (data.fatal) {
                             setError("Erro fatal no HLS stream. Tente abrir diretamente.");
                        }
                    }
                );
                return () => {
                    hls.destroy();
                };
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS (Safari)
                video.src = currentUrl;
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(e => console.log("Autoplay blocked", e));
                });
            } else {
                 setError("Seu navegador não suporta reprodução HLS nativa.");
            }
        } else {
            // Standard MP4 or other
            video.src = currentUrl;
            video.play().catch(e => console.log("Autoplay blocked", e));
        }
    }, [currentUrl]);

    // Simple heuristic for iframe embeds vs direct streams
    const isEmbed = !currentUrl.includes('.m3u8') && !currentUrl.includes('.mp4') && !currentUrl.includes('.ts') && (currentUrl.includes('embed') || currentUrl.includes('player') || !currentUrl.match(/\.\w{3,4}$/));

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
             <div className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800 shrink-0">
                    <div className="flex flex-col gap-1 min-w-0 flex-1 mr-4">
                        <span className="text-sm font-mono text-slate-400 truncate">{currentUrl}</span>
                        {urls.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {urls.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSourceIndex(idx)}
                                        className={`px-2 py-0.5 text-xs rounded transition-colors whitespace-nowrap ${
                                            currentSourceIndex === idx 
                                            ? 'bg-primary text-white' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        Fonte {idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="aspect-video w-full bg-black flex items-center justify-center relative flex-1">
                    {error ? (
                        <div className="text-center p-6">
                             <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                             <p className="text-white mb-2">{error}</p>
                             <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                                 Tentar abrir link direto
                             </a>
                        </div>
                    ) : isEmbed ? (
                        <iframe 
                            key={currentUrl} // Force re-render on url change
                            src={currentUrl} 
                            className="w-full h-full border-0" 
                            allowFullScreen 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <video 
                            ref={videoRef} 
                            controls 
                            className="w-full h-full" 
                            crossOrigin="anonymous"
                            onError={() => setError("Erro ao carregar vídeo. O formato pode não ser suportado ou o link está offline.")}
                        />
                    )}
                </div>
             </div>
        </div>
    );
};


export const ChannelView: React.FC<ChannelViewProps> = ({ channels, categories, onAdd, onUpdate, onDelete, onReorder }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Channel>(EMPTY_CHANNEL);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Preview Player State
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(null);

  // EPG Preview State
  const [epgPreview, setEpgPreview] = useState<any>(null);
  const [isLoadingEpg, setIsLoadingEpg] = useState(false);
  // Use ReturnType<typeof setTimeout> to correspond to the environment (browser uses number)
  const epgDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag and Drop Refs (Main List)
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Drag and Drop Refs (URL List)
  const dragUrlItem = useRef<number | null>(null);
  const dragOverUrlItem = useRef<number | null>(null);

  // --- EPG Fetch Logic ---
  useEffect(() => {
    if (!isModalOpen || !formData.guide) {
      setEpgPreview(null);
      setIsLoadingEpg(false);
      return;
    }

    if (epgDebounceRef.current) {
      clearTimeout(epgDebounceRef.current);
    }

    epgDebounceRef.current = setTimeout(async () => {
      // Basic validation to avoid fetching incomplete URLs
      if (!formData.guide.startsWith('http')) return;

      setIsLoadingEpg(true);
      const targetUrl = `https://guiacanais.alwaysdata.net/?url=${encodeURIComponent(formData.guide)}`;

      try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setEpgPreview(data);
      } catch (error) {
        console.warn("Direct fetch failed, trying proxy...", error);
        try {
            // Fallback to CORS proxy (allorigins.win)
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Proxy network response was not ok');
            const data = await response.json();
            setEpgPreview(data);
        } catch (proxyError) {
            console.error("EPG Fetch error", proxyError);
            setEpgPreview({ erro: "Erro ao conectar com a API." });
        }
      } finally {
        setIsLoadingEpg(false);
      }
    }, 1000); // 1 second debounce

    return () => {
      if (epgDebounceRef.current) clearTimeout(epgDebounceRef.current);
    };
  }, [formData.guide, isModalOpen]);

  // --- Helpers ---
  const handleSlugify = (text: string) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '')           
      .replace(/[^\w]+/g, '');
  };

  const openModal = (channel?: Channel) => {
    if (channel) {
      setEditingId(channel.id);
      setFormData(JSON.parse(JSON.stringify(channel))); // Deep copy
    } else {
      setEditingId(null);
      setFormData({ ...EMPTY_CHANNEL, category: categories[0]?.id || '' });
    }
    setIsModalOpen(true);
  };

  const duplicateChannel = (channel: Channel) => {
    setEditingId(null); // Treat as a new entry
    setFormData({
      ...JSON.parse(JSON.stringify(channel)),
      id: `${channel.id}-copy`,
      name: `${channel.name} (Cópia)`
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(EMPTY_CHANNEL);
    setEditingId(null);
    setEpgPreview(null);
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.url];
    newUrls[index] = value;
    setFormData({ ...formData, url: newUrls });
  };

  const addUrlField = () => {
    setFormData({ ...formData, url: [...formData.url, ''] });
  };

  const removeUrlField = (index: number) => {
    const newUrls = formData.url.filter((_, i) => i !== index);
    setFormData({ ...formData, url: newUrls });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name || formData.url.every(u => !u)) {
      alert('Preencha os campos obrigatórios (ID, Nome e pelo menos uma URL).');
      return;
    }

    const cleanedData = {
      ...formData,
      url: formData.url.filter(u => u.trim() !== '')
    };

    if (editingId) {
      onUpdate(editingId, cleanedData);
    } else {
      if (channels.some(c => c.id === cleanedData.id)) {
        alert('Este ID de canal já existe.');
        return;
      }
      onAdd(cleanedData);
    }
    closeModal();
  };

  // Drag Handlers (Main List)
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    // Visually nice ghost image could be set here, but default is usually fine
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault(); 
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    // Create new array
    const _channels = [...channels];
    const draggedItemContent = _channels[dragItem.current];
    
    // Remove dragged item
    _channels.splice(dragItem.current, 1);
    
    // Insert at new position
    _channels.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    onReorder(_channels);
  };

  // Drag Handlers (URL List)
  const handleUrlDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragUrlItem.current = position;
    e.currentTarget.classList.add('opacity-50');
  };

  const handleUrlDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverUrlItem.current = position;
    e.preventDefault();
  };

  const handleUrlDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    if (dragUrlItem.current === null || dragOverUrlItem.current === null) return;
    if (dragUrlItem.current === dragOverUrlItem.current) return;

    const newUrls = [...formData.url];
    const draggedItemContent = newUrls[dragUrlItem.current];
    newUrls.splice(dragUrlItem.current, 1);
    newUrls.splice(dragOverUrlItem.current, 0, draggedItemContent);

    setFormData({ ...formData, url: newUrls });

    dragUrlItem.current = null;
    dragOverUrlItem.current = null;
  };

  const filteredChannels = useMemo(() => {
    return channels.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [channels, searchTerm]);

  // Disable drag if filtering
  const canDrag = searchTerm === '';

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Canais</h2>
          <p className="text-slate-400 mt-1">Gerencie a lista de reprodução e fontes.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Canal
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Buscar canais por nome, id ou categoria..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
        />
        {searchTerm && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-medium">
             Ordenação desativada durante a busca
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {filteredChannels.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {searchTerm ? 'Nenhum canal encontrado.' : 'Nenhum canal cadastrado.'}
          </div>
        ) : (
          filteredChannels.map((channel, index) => (
            <div 
              key={channel.id} 
              draggable={canDrag}
              onDragStart={(e) => canDrag && handleDragStart(e, index)}
              onDragEnter={(e) => canDrag && handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()} // Necessary to allow dropping
              className={`bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:border-slate-600 transition-colors group ${canDrag ? 'cursor-move' : ''}`}
            >
              {/* Drag Handle */}
              {canDrag && (
                <div className="hidden md:flex text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing self-center">
                  <GripVertical className="w-5 h-5" />
                </div>
              )}

              {/* Logo */}
              <div className="w-16 h-16 shrink-0 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-border">
                {channel.logo ? (
                  <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/64?text=ERROR')} />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-white truncate">{channel.name}</h3>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{channel.country.toUpperCase()}</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">{
                    categories.find(c => c.id === channel.category)?.name || channel.category
                  }</span>
                </div>
                <div className="text-xs text-slate-500 font-mono mb-2">ID: {channel.id}</div>
                <div className="flex flex-wrap gap-2">
                  {channel.url.map((url, i) => (
                     <div key={i} className="flex items-center text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded max-w-[200px] truncate" title={url}>
                       <Video className="w-3 h-3 mr-1 inline" /> Source {i + 1}
                     </div>
                  ))}
                  {channel.guide && (
                     <a href={channel.guide} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-400 hover:text-blue-300 px-2 py-1">
                       <ExternalLink className="w-3 h-3 mr-1" /> Guia
                     </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 md:mt-0 self-end md:self-center ml-auto">
                 {channel.url.length > 0 && (
                    <button 
                      onClick={() => setPreviewUrls(channel.url)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-slate-700 rounded-lg transition-colors"
                      title="Visualizar Fonte"
                    >
                      <PlayCircle className="w-5 h-5" />
                    </button>
                 )}
                <button 
                  onClick={() => duplicateChannel(channel)}
                  className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Duplicar"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => openModal(channel)}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    if(window.confirm(`Apagar ${channel.name}?`)) onDelete(channel.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Video Preview Modal */}
      {previewUrls && (
         <VideoPlayerModal urls={previewUrls} onClose={() => setPreviewUrls(null)} />
      )}

      {/* Modal / Slide-over Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-surface w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingId ? 'Editar Canal' : 'Novo Canal'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Nome</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => {
                         const val = e.target.value;
                         setFormData(prev => ({
                           ...prev, 
                           name: val,
                           id: !editingId ? handleSlugify(val) : prev.id
                         }))
                      }}
                      className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-white focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">ID (Único)</label>
                    <input
                      type="text"
                      required
                      value={formData.id}
                      onChange={(e) => setFormData({...formData, id: e.target.value})}
                      readOnly={!!editingId}
                      className={`w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-white outline-none ${editingId ? 'opacity-50' : 'focus:ring-primary'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-white focus:ring-primary outline-none"
                    >
                      <option value="" disabled>Selecione...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">País</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-white focus:ring-primary outline-none"
                      placeholder="bra"
                    />
                  </div>
                </div>

                {/* Media Info */}
                <div className="space-y-4">
                   <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">URL do Logo</label>
                    <div className="flex gap-2">
                        <input
                        type="url"
                        value={formData.logo}
                        onChange={(e) => setFormData({...formData, logo: e.target.value})}
                        className="flex-1 bg-slate-900 border border-border rounded-lg px-3 py-2 text-white focus:ring-primary outline-none text-xs font-mono"
                        placeholder="https://..."
                        />
                        <div className="w-10 h-10 bg-slate-900 rounded border border-border flex items-center justify-center shrink-0">
                             {formData.logo ? <img src={formData.logo} className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-slate-600"/>}
                        </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">URL do Guia (EPG)</label>
                    <input
                      type="url"
                      value={formData.guide}
                      onChange={(e) => setFormData({...formData, guide: e.target.value})}
                      className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-white focus:ring-primary outline-none text-xs font-mono"
                      placeholder="https://..."
                    />
                    
                    {/* EPG Preview Section */}
                    {(isLoadingEpg || epgPreview) && (
                        <div className="mt-2 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm animate-in fade-in slide-in-from-top-1">
                            {isLoadingEpg ? (
                                <div className="flex items-center text-slate-400 text-xs">
                                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                    Buscando informações do guia...
                                </div>
                            ) : epgPreview?.erro ? (
                                 <div className="text-red-400 text-xs flex items-center">
                                    <X className="w-3 h-3 mr-1" />
                                    {epgPreview.erro}
                                 </div>
                            ) : epgPreview?.programacao ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-700 pb-1">
                                        <span className="font-semibold text-primary">{epgPreview.canal !== 'Desconhecido' ? epgPreview.canal : 'Guia Encontrado'}</span>
                                        <span>{epgPreview.total_programas || 0} programas</span>
                                    </div>
                                    {epgPreview.programacao.length === 0 ? (
                                        <div className="text-slate-500 text-xs italic">
                                            Nenhum programa encontrado.
                                        </div>
                                    ) : (
                                        epgPreview.programacao.slice(0, 3).map((prog: any, i: number) => (
                                            <div key={i} className="flex gap-3 items-start">
                                                <div className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 border border-slate-700">
                                                    {prog.hora}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-slate-200 truncate font-medium text-xs">{prog.titulo}</p>
                                                    <p className="text-slate-500 text-[10px] truncate">{prog.categoria} • {prog.data_cabecalho}</p>
                                                </div>
                                                {prog.ao_vivo && (
                                                    <span className="ml-auto text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded uppercase font-bold tracking-wider">Ao Vivo</span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic URLs */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">Streams / URLs</label>
                    <button type="button" onClick={addUrlField} className="text-xs text-primary hover:text-primaryHover font-medium flex items-center">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar URL
                    </button>
                </div>
                {formData.url.map((url, index) => (
                  <div 
                    key={index}
                    draggable
                    onDragStart={(e) => handleUrlDragStart(e, index)}
                    onDragEnter={(e) => handleUrlDragEnter(e, index)}
                    onDragEnd={handleUrlDragEnd}
                    onDragOver={(e) => e.preventDefault()} 
                    className="flex gap-2 animate-in fade-in duration-200 items-center"
                  >
                    <div className="cursor-grab text-slate-600 hover:text-slate-400 p-1 active:cursor-grabbing">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      placeholder="https://m3u8-link..."
                      className="flex-1 bg-slate-900 border border-border rounded-lg px-3 py-2 text-white focus:ring-primary outline-none text-xs font-mono"
                    />
                    {formData.url.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeUrlField(index)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-border">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-6 py-2.5 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-lg transition-all font-medium shadow-lg shadow-indigo-500/20"
                >
                  Salvar Canal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};