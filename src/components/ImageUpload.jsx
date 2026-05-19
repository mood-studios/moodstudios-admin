import { useEffect, useRef, useState } from 'react';

export default function ImageUpload({
  label = 'Service image',
  value,
  previewUrl,
  onFileSelect,
  onUrlChange,
  onRemove,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const showPreview = previewUrl || value;

  const pickFiles = (files) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFiles(e.dataTransfer.files);
  };

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <fieldset className="image-upload">
      <legend>{label}</legend>

      {showPreview ? (
        <figure className="image-upload__preview">
          <img src={previewUrl || value} alt="Preview" />
          <button type="button" className="image-upload__remove" onClick={onRemove}>
            Remove image
          </button>
        </figure>
      ) : (
        <button
          type="button"
          className={`image-upload__drop${dragOver ? ' image-upload__drop--active' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span className="image-upload__icon">+</span>
          <strong>Add image</strong>
          <span>Click or drag a photo here</span>
          <small>JPG, PNG, WebP · max 10 MB</small>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="image-upload__input"
        onChange={(e) => pickFiles(e.target.files)}
      />

      {showPreview && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => inputRef.current?.click()}>
          Replace image
        </button>
      )}

      <details className="image-upload__url">
        <summary>Or paste image URL</summary>
        <input
          type="url"
          value={value || ''}
          placeholder="https://…"
          onChange={(e) => onUrlChange(e.target.value)}
        />
      </details>
    </fieldset>
  );
}
