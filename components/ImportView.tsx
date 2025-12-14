import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, FileCode, Link as LinkIcon, Loader2 } from 'lucide-react';
import { PlaylistData } from '../types';

interface ImportViewProps {
  onImport: (data: PlaylistData) => void;
}

export const ImportView: React.FC<ImportViewProps> = ({ onImport }) => {
  const [jsonText, setJsonText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'paste' | 'file' | 'url'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('iptv-manager-last-url');
    if (savedUrl) {
      setUrlInput(savedUrl);
    }
  }, []);

  const validateAndImport = (parsedData: any) => {
    if (!parsedData || typeof parsedData !== 'object') {
      setError('Formato inválido. O JSON deve ser um objeto.');
      return;
    }

    if (!Array.isArray(parsedData.channels)) {
      setError('JSON inválido: propriedade "channels" está faltando ou não é uma lista.');
      return;
    }

    if (!Array.isArray(parsedData.categories)) {
      setError('JSON inválido: propriedade "categories" está faltando ou não é uma lista.');
      return;
    }

    // Success
    setError(null);
    onImport(parsedData as PlaylistData);
  };

  const handleTextImport = () => {
    try {
      if (!jsonText.trim()) {
        setError('A caixa de texto está vazia.');
        return;
      }
      const parsed = JSON.parse(jsonText);
      validateAndImport(parsed);
    } catch (e) {
      setError('Erro ao analisar JSON. Verifique a sintaxe.');
    }
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      setError('Por favor, insira uma URL válida.');
      return;
    }

    // Save to localStorage
    localStorage.setItem('iptv-manager-last-url', urlInput);

    setIsLoading(true);
    setError(null);

    try {
      // Try direct fetch first
      let response = await fetch(urlInput);
      
      // If direct fetch fails (likely CORS), try proxy
      if (!response.ok) {
        console.warn('Direct fetch failed, trying proxy...');
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput)}`;
        response = await fetch(proxyUrl);
      }

      if (!response.ok) {
        throw new Error(`Falha na requisição: ${response.statusText}`);
      }

      const text = await response.text();
      const parsed = JSON.parse(text);
      validateAndImport(parsed);

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao importar da URL: ${err.message}. Verifique se o link é público e contém um JSON válido.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        validateAndImport(parsed);
      } catch (err) {
        setError('Erro ao ler o arquivo. Certifique-se de que é um JSON válido.');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Importar Dados</h2>
        <p className="text-slate-400 mt-1">Carregue um arquivo JSON existente, cole o código ou use um link externo.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-lg">
        {/* Tabs */}
        <div className="flex border-b border-border bg-slate-900/50">
          <button
            onClick={() => { setActiveTab('url'); setError(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${activeTab === 'url' ? 'text-primary bg-surface border-t-2 border-t-primary' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <LinkIcon className="w-4 h-4" />
            Link JSON
          </button>
          <button
            onClick={() => { setActiveTab('paste'); setError(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${activeTab === 'paste' ? 'text-primary bg-surface border-t-2 border-t-primary' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <FileCode className="w-4 h-4" />
            Colar JSON
          </button>
          <button
            onClick={() => { setActiveTab('file'); setError(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${activeTab === 'file' ? 'text-primary bg-surface border-t-2 border-t-primary' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <Upload className="w-4 h-4" />
            Upload Arquivo
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {activeTab === 'url' && (
             <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-300">URL do Arquivo JSON</label>
                 <div className="flex gap-2">
                   <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://exemplo.com/playlist.json"
                      className="flex-1 bg-slate-900 border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                   />
                 </div>
                 <p className="text-xs text-slate-500">A URL será salva automaticamente para o próximo uso.</p>
               </div>
               <div className="flex justify-end">
                 <button
                    onClick={handleUrlImport}
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center"
                 >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                    Importar Link
                 </button>
               </div>
             </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{ "channels": [...], "categories": [...] }'
                className="w-full h-64 bg-slate-900 border border-border rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleTextImport}
                  className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Carregar JSON
                </button>
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="py-12 text-center space-y-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors bg-slate-900/30">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Selecione um arquivo .json</h3>
                <p className="text-sm text-slate-500 mt-1">O arquivo deve seguir a estrutura padrão do painel.</p>
              </div>
              <div className="pt-4">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json,application/json"
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-border"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Escolher Arquivo
                  </label>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 text-xs text-blue-200/60 leading-relaxed">
        <strong>Nota:</strong> A importação substituirá todos os dados atuais (canais e categorias). Certifique-se de ter um backup se necessário.
      </div>
    </div>
  );
};