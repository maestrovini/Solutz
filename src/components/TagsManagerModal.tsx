import React, { useState } from 'react';
import { X, Trash2, Edit2 } from 'lucide-react';
import { api } from '../api';
import { ClientTag } from '../types';
import { cn } from '../utils/cn';

interface TagsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTags: ClientTag[];
}

export function TagsManagerModal({ isOpen, onClose, allTags }: TagsManagerModalProps) {
  const [editingTag, setEditingTag] = useState<ClientTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3b82f6');
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const presetColors = [
    { name: 'Vermelho', py: '#ef4444' },
    { name: 'Laranja', py: '#f97316' },
    { name: 'Amarelo', py: '#f59e0b' },
    { name: 'Verde', py: '#10b981' },
    { name: 'Azul', py: '#3b82f6' },
    { name: 'Índigo', py: '#6366f1' },
    { name: 'Púrpura', py: '#8b5cf6' },
    { name: 'Rosa', py: '#ec4899' },
    { name: 'Cinza', py: '#6b7280' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      setError('Nome da tag é obrigatório');
      return;
    }

    try {
      if (editingTag) {
        await api.update('tags', editingTag.id!, {
          name: tagName.trim(),
          color: tagColor
        });
      } else {
        await api.create('tags', {
          name: tagName.trim(),
          color: tagColor
        });
      }
      setTagName('');
      setEditingTag(null);
      setError('');
    } catch (err: any) {
      console.error("Erro ao salvar tag:", err);
      let errorMsg = 'Erro ao salvar tag';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.error) {
            errorMsg = `Erro ao salvar tag: ${parsed.error}`;
          } else {
            errorMsg = `Erro ao salvar tag: ${err.message}`;
          }
        } catch (_) {
          errorMsg = `Erro ao salvar tag: ${err.message}`;
        }
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      setError(errorMsg);
    }
  };

  const handleEdit = (tag: ClientTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-[#f5f5f0] text-black w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-black/5 flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-black/5 flex items-center justify-between animate-fade-in">
          <div>
            <h3 className="text-lg font-black tracking-tight">Gerenciar Tags Customizadas</h3>
            <p className="text-xs text-black/40 font-bold uppercase tracking-wider mt-0.5">Tags de Clientes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <form onSubmit={handleSave} className="bg-white p-5 border border-black/10 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-black/40 uppercase tracking-widest">
              {editingTag ? 'Editar Tag' : 'Nova Tag'}
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Nome da Tag</label>
                <input
                  type="text"
                  placeholder="Ex: Lead Quente, Pronto para Financiamento"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/5 text-[#1a1a1a] rounded-xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all text-sm font-bold placeholder:text-black/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Selecione uma Cor</label>
                <div className="grid grid-cols-5 gap-2">
                  {presetColors.map((color) => (
                    <button
                      type="button"
                      key={color.py}
                      onClick={() => setTagColor(color.py)}
                      className={cn(
                        "w-full aspect-square rounded-lg border flex items-center justify-center transition-all cursor-pointer",
                        tagColor === color.py ? "border-black scale-105 shadow-xs" : "border-transparent opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: color.py }}
                      title={color.name}
                    >
                      {tagColor === color.py && (
                        <div className="w-2 h-2 bg-white rounded-full shadow-xs" />
                      )}
                    </button>
                  ))}
                  <div className="relative">
                    <input
                      type="color"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      title="Cor personalizada"
                    />
                    <div 
                      className="w-full aspect-square rounded-lg border border-transparent opacity-80 hover:opacity-100 flex items-center justify-center text-xs font-black"
                      style={{ backgroundColor: tagColor }}
                    >
                      🎨
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-bold">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {editingTag && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTag(null);
                    setTagName('');
                    setTagColor('#3b82f6');
                  }}
                  className="px-4 py-2 bg-black/5 hover:bg-black/10 text-black/60 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#333] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                {editingTag ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-black/40 uppercase tracking-widest pl-1">Tags Existentes</h4>
            <div className="space-y-2">
              {allTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-3 bg-white border border-black/10 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full inline-block shadow-xs shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm font-bold text-[#1a1a1a]">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {deleteConfirmId === tag.id ? (
                      <div className="flex items-center gap-1.5 animate-fade-in shrink-0">
                        <button
                          onClick={async () => {
                            try {
                              await api.delete('tags', tag.id!);
                              setDeleteConfirmId(null);
                            } catch (err) {
                              console.error("Erro ao excluir tag:", err);
                            }
                          }}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-black/5 hover:bg-black/10 text-black/60 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(tag)}
                          className="p-1.5 hover:bg-black/5 text-black/50 hover:text-black rounded-lg transition-all cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(tag.id!)}
                          className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {allTags.length === 0 && (
                <div className="text-center py-8 text-xs font-bold text-black/30 bg-white border border-black/10 rounded-2xl uppercase tracking-widest">
                  Nenhuma tag criada
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
