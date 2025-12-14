import React, { useState, useRef } from 'react';
import { Category } from '../types';
import { Trash2, Edit2, Plus, Save, GripVertical } from 'lucide-react';

interface CategoryViewProps {
  categories: Category[];
  onAdd: (c: Category) => void;
  onUpdate: (id: string, c: Category) => void;
  onDelete: (id: string) => void;
  onReorder: (categories: Category[]) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({ categories, onAdd, onUpdate, onDelete, onReorder }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Drag refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Form State
  const [formData, setFormData] = useState<Category>({ id: '', name: '' });

  const handleSlugify = (text: string) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           
      .replace(/[^\w\-]+/g, '')       
      .replace(/\-\-+/g, '-')         
      .replace(/^-+/, '')             
      .replace(/-+$/, '');            
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      id: isAdding ? handleSlugify(name) : prev.id
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    if (editingId) {
      onUpdate(editingId, formData);
      setEditingId(null);
    } else {
      if (categories.some(c => c.id === formData.id)) {
        alert('Este ID de categoria já existe. Escolha outro.');
        return;
      }
      onAdd(formData);
      setIsAdding(false);
    }
    setFormData({ id: '', name: '' });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData(cat);
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ id: '', name: '' });
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, position: number) => {
    dragItem.current = position;
    e.currentTarget.classList.add('opacity-50', 'bg-slate-800');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'bg-slate-800');
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const _categories = [...categories];
    const draggedItemContent = _categories[dragItem.current];
    _categories.splice(dragItem.current, 1);
    _categories.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    onReorder(_categories);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Categorias</h2>
          <p className="text-slate-400 mt-1">Gerencie os grupos de canais da sua lista.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({id: '', name: ''}); }}
          className="flex items-center px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          disabled={isAdding}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </button>
      </div>

      {isAdding && (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-lg font-semibold mb-4 text-white">
            {editingId ? 'Editar Categoria' : 'Adicionar Categoria'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nome da Categoria</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Ex: Documentários"
                className="w-full bg-slate-900 border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">ID (Slug)</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                readOnly={!!editingId}
                className={`w-full bg-slate-900 border border-border rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <p className="text-xs text-slate-500">O ID é usado para vincular canais. Evite espaços e acentos.</p>
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={cancelForm}
                className="px-4 py-2 text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex items-center px-6 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 border-b border-border">
              <th className="p-4 w-10"></th>
              <th className="p-4 font-semibold text-slate-300 text-sm">Nome</th>
              <th className="p-4 font-semibold text-slate-300 text-sm">ID</th>
              <th className="p-4 font-semibold text-slate-300 text-sm text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            ) : (
              categories.map((cat, index) => (
                <tr 
                  key={cat.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="hover:bg-slate-700/30 transition-colors group cursor-default"
                >
                  <td className="p-4 text-slate-600 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="p-4 text-white font-medium">{cat.name}</td>
                  <td className="p-4 text-slate-400 font-mono text-xs">{cat.id}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(cat)}
                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
                            onDelete(cat.id);
                          }
                        }}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};