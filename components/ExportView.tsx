import React, { useState } from 'react';
import { PlaylistData } from '../types';
import { Copy, Check, Download, AlertTriangle } from 'lucide-react';

interface ExportViewProps {
  data: PlaylistData;
}

export const ExportView: React.FC<ExportViewProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 4);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playlist_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Validation warnings
  const warnings: string[] = [];
  if (data.channels.length === 0) warnings.push('A lista de canais está vazia.');
  if (data.categories.length === 0) warnings.push('A lista de categorias está vazia.');
  
  const orphanedChannels = data.channels.filter(ch => !data.categories.some(cat => cat.id === ch.category));
  if (orphanedChannels.length > 0) {
    warnings.push(`${orphanedChannels.length} canais possuem categorias inválidas (IDs de categoria inexistentes).`);
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Exportar</h2>
        <p className="text-slate-400 mt-1">Obtenha o JSON final para sua aplicação.</p>
      </div>

      {warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-yellow-500 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            <span>Atenção</span>
          </div>
          <ul className="list-disc list-inside text-sm text-yellow-200/80 space-y-1">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b border-border bg-slate-900/50">
           <div className="text-xs font-mono text-slate-500 px-2">playlist.json</div>
           <div className="flex gap-2">
             <button
                onClick={handleCopy}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  copied 
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
             >
                {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
             </button>
             <button
                onClick={handleDownload}
                className="flex items-center px-3 py-1.5 bg-primary hover:bg-primaryHover text-white rounded-md text-sm font-medium transition-colors"
             >
                <Download className="w-4 h-4 mr-1.5" />
                Baixar .json
             </button>
           </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#0d1117] p-4">
          <pre className="font-mono text-xs sm:text-sm text-slate-300 leading-relaxed">
            <code>{jsonString}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};