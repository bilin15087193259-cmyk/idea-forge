import React from 'react';
import { ProcessedIdea } from '../types';
import { Clock, ChevronRight, Trash2 } from 'lucide-react';

interface HistoryItemProps {
  item: ProcessedIdea;
  onSelect: (item: ProcessedIdea) => void;
  onDelete: (id: string) => void;
  isActive: boolean;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, onSelect, onDelete, isActive }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group flex items-start justify-between p-3 rounded-lg cursor-pointer transition-all border ${
        isActive
          ? 'bg-obsidian-accent/10 border-obsidian-accent/50'
          : 'bg-transparent border-transparent hover:bg-obsidian-card hover:border-obsidian-muted/30'
      }`}
    >
      <div className="flex-1 min-w-0 mr-2">
        <h4 className={`text-sm font-medium truncate ${isActive ? 'text-obsidian-accent' : 'text-gray-300'}`}>
          {item.preview}
        </h4>
        <div className="flex items-center mt-1 text-xs text-obsidian-muted">
          <Clock size={10} className="mr-1" />
          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDelete}
          className="p-1 text-obsidian-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};