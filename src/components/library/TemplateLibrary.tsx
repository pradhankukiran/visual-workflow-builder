import { useMemo } from 'react';
import TemplateCard from './TemplateCard';
import EmptyState from '@/components/shared/EmptyState';
import { WORKFLOW_TEMPLATES } from '@/constants/templates';

interface TemplateLibraryProps {
  onClose?: () => void;
}

export default function TemplateLibrary({ onClose }: TemplateLibraryProps) {
  // Create fresh workflow instances from each template factory.
  // useMemo ensures we don't regenerate IDs on every render.
  const templates = useMemo(
    () => WORKFLOW_TEMPLATES.map((t) => t.create()),
    [],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Templates
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {templates.length === 0 ? (
          <EmptyState
            icon={'\uD83D\uDCDA'}
            title="No templates yet"
            description="Pre-built workflow templates will appear here in a future update. Create your own workflows from scratch for now."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
