import React from 'react';
import { DetectedBubble } from '@/types/manga';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TyperItemCardProps {
  item: DetectedBubble;
  onChange: (updatedText: string, category: string) => void;
}

export const TyperItemCard: React.FC<TyperItemCardProps> = ({ item, onChange }) => {
  const categories = [
    { value: 'dialogue', label: 'حوار ""' },
    { value: 'thought', label: 'أفكار ()' },
    { value: 'scream', label: 'صراخ ::' },
    { value: 'sfx', label: 'مؤثرات SFX:' },
    { value: 'system', label: 'نظام []' },
    { value: 'narrator', label: 'كلام خارجي OT:' },
  ];

  const handleCategoryChange = (newCategory: string) => {
    let cleanText = item.translatedText
      .replace(/^::\s*/, '')
      .replace(/^\(\)\s*/, '')
      .replace(/^""\s*/, '')
      .replace(/^SFX:\s*/, '')
      .replace(/^OT:\s*/, '')
      .replace(/^\[\]\s*/, '');

    let prefix = '';
    switch (newCategory) {
      case 'scream':
      case 'anger':
        prefix = ':: ';
        break;
      case 'thought':
        prefix = '() ';
        break;
      case 'dialogue':
      case 'whisper':
        prefix = '"" ';
        break;
      case 'sfx':
        prefix = 'SFX: ';
        break;
      case 'system':
      case 'phone':
        prefix = '[] ';
        break;
      case 'narrator':
      case 'other':
        prefix = 'OT: ';
        break;
      default:
        prefix = '"" ';
    }

    onChange(`${prefix}${cleanText}`, newCategory);
  };

  return (
    <div className="p-4 border rounded-lg bg-card shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground font-mono">ID: #{item.id}</span>
        <div className="w-40">
          <Select value={item.category || 'dialogue'} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {item.originalText && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded dir-ltr text-left font-mono">
          {item.originalText}
        </div>
      )}

      <textarea
        className="w-full p-2 text-sm border rounded-md bg-background resize-y min-h-[70px] focus:outline-none focus:ring-1 focus:ring-primary"
        dir="auto"
        value={item.translatedText}
        onChange={(e) => onChange(e.target.value, item.category)}
      />
    </div>
  );
};