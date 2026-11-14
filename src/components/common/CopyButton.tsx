import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text?: string | null;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Salin',
  showLabel = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const cleanText = (text || '').trim();
  if (!cleanText || cleanText === '-') return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanText);
      } else {
        throw new Error('Clipboard fallback');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = cleanText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Berhasil disalin!' : label}
      aria-label={copied ? 'Berhasil disalin!' : label}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold transition-all cursor-pointer shrink-0 ${
        copied
          ? 'bg-emerald-600/30 border-emerald-400/70 text-emerald-300'
          : 'bg-[#2a1529] hover:bg-[#3a1c38] border-pink-500/30 hover:border-pink-400/60 text-pink-200 hover:text-white'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{showLabel ? 'Tersalin' : 'OK'}</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 shrink-0" />
          {showLabel && <span>Copy</span>}
        </>
      )}
    </button>
  );
};
