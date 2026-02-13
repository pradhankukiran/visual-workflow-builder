import { useState, useCallback, useRef, useMemo, type ChangeEvent } from 'react';
import clsx from 'clsx';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  readOnly?: boolean;
}

function countLines(text: string): number {
  return Math.max(text.split('\n').length, 1);
}

export default function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  placeholder = '// Write your code here...',
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const lineCount = useMemo(() => countLines(value || ''), [value]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Tab inserts 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart, selectionEnd } = textarea;

        if (e.shiftKey) {
          // Outdent: remove leading 2 spaces from current line
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const linePrefix = value.substring(lineStart, lineStart + 2);
          if (linePrefix === '  ') {
            const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
            onChange(newValue);
            requestAnimationFrame(() => {
              textarea.selectionStart = Math.max(selectionStart - 2, lineStart);
              textarea.selectionEnd = Math.max(selectionEnd - 2, lineStart);
            });
          }
        } else {
          // Indent
          const newValue =
            value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
          });
        }
      }

      // Enter auto-indents
      if (e.key === 'Enter') {
        e.preventDefault();
        const { selectionStart } = textarea;
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const line = value.substring(lineStart, selectionStart);
        const indent = line.match(/^(\s*)/)?.[1] ?? '';

        // Extra indent after { or (
        const lastChar = value[selectionStart - 1];
        const extraIndent = lastChar === '{' || lastChar === '(' || lastChar === '[' ? '  ' : '';

        const newValue =
          value.substring(0, selectionStart) +
          '\n' +
          indent +
          extraIndent +
          value.substring(selectionStart);
        onChange(newValue);
        requestAnimationFrame(() => {
          const newPos = selectionStart + 1 + indent.length + extraIndent.length;
          textarea.selectionStart = textarea.selectionEnd = newPos;
        });
      }
    },
    [value, onChange],
  );

  return (
    <div
      className={clsx(
        'relative rounded-lg overflow-hidden border',
        isFocused ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
        'transition-all-fast',
      )}
    >
      {/* Language badge */}
      <div
        className={clsx(
          'absolute top-2 right-2 z-10',
          'px-1.5 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wider',
          'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
          'border border-[var(--color-border)]',
          'select-none opacity-60',
        )}
      >
        {language}
      </div>

      <div className="flex overflow-auto max-h-[400px]">
        {/* Line numbers */}
        <div
          className={clsx(
            'flex flex-col items-end shrink-0 py-3 px-2.5',
            'bg-[#1e1e2e] text-[#585b70]',
            'select-none border-r border-[#313244]',
            'text-[11px] leading-5 font-mono',
          )}
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>

        {/* Code area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={clsx(
            'flex-1 min-w-0 p-3 m-0',
            'bg-[#1e1e2e] text-[#cdd6f4]',
            'font-mono text-xs leading-5',
            'resize-none outline-none',
            'placeholder:text-[#585b70]',
            'caret-[#cdd6f4]',
            readOnly && 'cursor-default',
          )}
          style={{ minHeight: '120px', tabSize: 2 }}
          aria-label={`${language} code editor`}
        />
      </div>
    </div>
  );
}
