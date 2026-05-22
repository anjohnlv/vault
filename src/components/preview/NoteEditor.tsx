import { useEffect, useState, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { php } from '@codemirror/lang-php';
import { cpp } from '@codemirror/lang-cpp';
import { sass } from '@codemirror/lang-sass';
import { Button } from '../ui/Button';

interface NoteEditorProps {
  blob: Blob;
  onSave: (content: string) => Promise<void>;
  mimeType?: string;
  fileName?: string;
}

function getLanguageByFileName(fileName?: string) {
  if (!fileName) return undefined;
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
  switch (ext) {
    case 'js': return javascript();
    case 'mjs': case 'cjs': return javascript();
    case 'jsx': return javascript({ jsx: true });
    case 'ts': return javascript({ typescript: true });
    case 'tsx': return javascript({ typescript: true, jsx: true });
    case 'json': return json();
    case 'html': case 'htm': return html();
    case 'css': return css();
    case 'md': case 'mdx': return markdown();
    case 'xml': case 'svg': case 'plist': return xml();
    case 'py': case 'pyw': return python();
    case 'java': return java();
    case 'rs': return rust();
    case 'go': return go();
    case 'sql': return sql();
    case 'yaml': case 'yml': return yaml();
    case 'php': return php();
    case 'c': case 'cpp': case 'cc': case 'cxx': case 'h': case 'hpp': case 'hh': return cpp();
    case 'scss': case 'sass': return sass();
    default: return undefined;
  }
}

function getLanguage(mimeType?: string, fileName?: string) {
  if (mimeType) {
    if (['text/javascript', 'application/javascript', 'text/typescript'].includes(mimeType)) {
      return javascript({ typescript: mimeType === 'text/typescript' });
    }
    if (mimeType === 'application/json') return json();
    if (mimeType === 'text/html') return html();
    if (mimeType === 'text/css') return css();
    if (mimeType === 'text/markdown') return markdown();
    if (['application/xml', 'text/xml'].includes(mimeType)) return xml();
    if (mimeType === 'text/x-python' || mimeType === 'text/x-script.python') return python();
    if (mimeType === 'text/x-java') return java();
    if (mimeType === 'text/x-rust') return rust();
    if (mimeType === 'text/x-go') return go();
    if (['text/x-sql', 'application/sql'].includes(mimeType)) return sql();
    if (['text/x-yaml', 'text/vnd.yaml'].includes(mimeType)) return yaml();
    if (mimeType === 'text/x-php') return php();
    if (['text/x-c', 'text/x-c++'].includes(mimeType)) return cpp();
  }
  return getLanguageByFileName(fileName);
}

export function NoteEditor({ blob, onSave, mimeType, fileName }: NoteEditorProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number>(0);
  const dirtyRef = useRef(false);

  useEffect(() => {
    blob.text().then((t) => {
      setText(t);
      setDirty(false);
      dirtyRef.current = false;
    });
  }, [blob]);

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (dirtyRef.current) {
        setSaving(true);
        await onSave(text);
        setSaving(false);
        setDirty(false);
        dirtyRef.current = false;
      }
    }, 30000);
  }, [text, onSave]);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (dirtyRef.current) e.preventDefault();
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  const handleChange = (value: string) => {
    setText(value);
    setDirty(true);
    dirtyRef.current = true;
    debouncedSave();
  };

  const handleManualSave = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    await onSave(text);
    setSaving(false);
    setDirty(false);
    dirtyRef.current = false;
  };

  return (
    <div className="note-editor">
      <div className="note-editor__header">
        <span className="note-editor__status">
          {saving ? '保存中...' : dirty ? '未保存' : '已保存'}
        </span>
        <Button size="sm" onClick={handleManualSave} disabled={!dirty || saving}>
          保存
        </Button>
      </div>
      <div className="note-editor__body">
        <CodeMirror
          value={text}
          onChange={handleChange}
          extensions={(() => {
            const ext = getLanguage(mimeType, fileName);
            return ext ? [ext] : [];
          })()}
          theme={oneDark}
          height="60vh"
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            autocompletion: false,
          }}
        />
      </div>
    </div>
  );
}
