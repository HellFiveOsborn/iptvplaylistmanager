import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Tv, FileJson, Menu, Upload, Play } from 'lucide-react';
import { CategoryView } from './components/CategoryView';
import { ChannelView } from './components/ChannelView';
import { ExportView } from './components/ExportView';
import { ImportView } from './components/ImportView';
import { PlaylistData, ViewState, Category, Channel } from './types';

const EMPTY_DATA: PlaylistData = {
  channels: [],
  categories: []
};

const App: React.FC = () => {
  const [data, setData] = useState<PlaylistData>(() => {
    const saved = localStorage.getItem('iptv-manager-data');
    return saved ? JSON.parse(saved) : EMPTY_DATA;
  });

  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('iptv-manager-data');
    return saved ? 'channels' : 'import';
  });
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('iptv-manager-data', JSON.stringify(data));
  }, [data]);

  // --- Actions ---

  const handleImport = (newData: PlaylistData) => {
    const sanitizedData: PlaylistData = {
      channels: Array.isArray(newData.channels) ? newData.channels : [],
      categories: Array.isArray(newData.categories) ? newData.categories : []
    };
    setData(sanitizedData);
    setCurrentView('channels');
    alert('Dados importados com sucesso!');
  };

  // Categories
  const addCategory = (category: Category) => {
    setData(prev => ({ ...prev, categories: [...prev.categories, category] }));
  };

  const updateCategory = (id: string, updatedCategory: Category) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? updatedCategory : c)
    }));
  };

  const deleteCategory = (id: string) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }));
  };

  const reorderCategories = (newCategories: Category[]) => {
    setData(prev => ({ ...prev, categories: newCategories }));
  };

  // Channels
  const addChannel = (channel: Channel) => {
    setData(prev => ({ ...prev, channels: [...prev.channels, channel] }));
  };

  const updateChannel = (id: string, updatedChannel: Channel) => {
    setData(prev => ({
      ...prev,
      channels: prev.channels.map(c => c.id === id ? updatedChannel : c)
    }));
  };

  const deleteChannel = (id: string) => {
    setData(prev => ({
      ...prev,
      channels: prev.channels.filter(c => c.id !== id)
    }));
  };

  const reorderChannels = (newChannels: Channel[]) => {
    setData(prev => ({ ...prev, channels: newChannels }));
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors mb-2 ${
        currentView === view
          ? 'bg-primary text-white font-medium shadow-lg shadow-indigo-500/20'
          : 'text-slate-400 hover:bg-surface hover:text-slate-200'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-slate-100 font-sans selection:bg-primary selection:text-white">
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform duration-200 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">IPTV Manager</h1>
        </div>

        <nav className="p-4 mt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-4">Menu</div>
          <NavItem view="channels" icon={Tv} label="Canais" />
          <NavItem view="categories" icon={LayoutDashboard} label="Categorias" />
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-4 px-4">Dados</div>
          <NavItem view="import" icon={Upload} label="Importar" />
          <NavItem view="export" icon={FileJson} label="Exportar JSON" />
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-border">
          <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300 mb-1">Status</p>
            <div className="flex justify-between mb-1">
              <span>Canais:</span>
              <span className="text-primary">{data.channels.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Categorias:</span>
              <span className="text-primary">{data.categories.length}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-border bg-surface flex items-center px-4 justify-between">
          <h1 className="font-bold text-lg">IPTV Manager</h1>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            {currentView === 'categories' && (
              <CategoryView 
                categories={data.categories} 
                onAdd={addCategory} 
                onUpdate={updateCategory}
                onDelete={deleteCategory}
                onReorder={reorderCategories}
              />
            )}
            {currentView === 'channels' && (
              <ChannelView 
                channels={data.channels} 
                categories={data.categories}
                onAdd={addChannel}
                onUpdate={updateChannel}
                onDelete={deleteChannel}
                onReorder={reorderChannels}
              />
            )}
            {currentView === 'import' && (
              <ImportView onImport={handleImport} />
            )}
            {currentView === 'export' && (
              <ExportView data={data} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;