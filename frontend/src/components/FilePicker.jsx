import React, { useRef } from 'react';
import { Folder, File } from 'lucide-react';

export default function FilePicker({ value, onChange, placeholder, selectType = 'file', accept }) {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (selectType === 'directory') {
      // For directories, we return the list of files
      // The parent component should handle uploading/processing
      onChange(Array.from(files));
    } else {
      onChange(files[0]);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Determine the appropriate attributes based on selectType
  const inputProps = selectType === 'directory'
    ? { webkitdirectory: 'true', directory: 'true', multiple: true }
    : { accept };

  const hasValue = value
    ? (selectType === 'directory' && Array.isArray(value)
      ? value.length > 0
      : typeof value === 'string' ? true : value !== null)
    : false;

  const displayText = value
    ? (selectType === 'directory' && Array.isArray(value)
      ? `${value.length} file(s) selected`
      : typeof value === 'string' ? value : value?.name)
    : '';

  return (
    <div className="file-picker-container" style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={displayText}
          readOnly
          placeholder={placeholder}
          style={{ flex: 1, cursor: 'pointer' }}
          onClick={handleClick}
        />
        <button
          type="button"
          onClick={handleClick}
          style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}
          className="secondary"
        >
          {selectType === 'directory' ? <Folder size={18} /> : <File size={18} />}
          Browse
        </button>
        <input
          ref={inputRef}
          type="file"
          {...inputProps}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
