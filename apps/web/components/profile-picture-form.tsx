'use client';

import { useEffect, useRef, useState } from 'react';

type UploadAction = (formData: FormData) => Promise<void>;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CROP_SIZE = 240;

export default function ProfilePictureForm({ uploadAction }: { uploadAction: UploadAction }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(nextFile: File | undefined) {
    setError('');
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError('The image must be 5 MB or smaller.');
      return;
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCropOpen(true);
  }

  function cancelCrop() {
    setCropOpen(false);
    setFile(null);
    setPreviewUrl(null);
    setImageSize({ width: 0, height: 0 });
    setError('');
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!previewUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setOffset((current) => ({ x: current.x + dx, y: current.y + dy }));
  }

  function stopDragging() {
    drag.current = null;
  }

  async function createCroppedFile(): Promise<File | null> {
    if (!file || !imageRef.current || !imageSize.width || !imageSize.height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    const scale = baseScale * zoom;
    const x = (CROP_SIZE - imageSize.width * scale) / 2 + offset.x;
    const y = (CROP_SIZE - imageSize.height * scale) / 2 + offset.y;
    const outputScale = canvas.width / CROP_SIZE;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      imageRef.current,
      x * outputScale,
      y * outputScale,
      imageSize.width * scale * outputScale,
      imageSize.height * scale * outputScale,
    );

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ? new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' }) : null;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError('Choose an image first.');
      return;
    }

    setError('');
    setUploading(true);
    const croppedFile = await createCroppedFile();
    if (!croppedFile) {
      setUploading(false);
      setError('The image could not be prepared. Please try again.');
      return;
    }

    const formData = new FormData();
    formData.append('picture', croppedFile);
    try {
      await Promise.race([
        uploadAction(formData),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Upload timed out')), 45_000);
        }),
      ]);
    } catch (uploadError) {
      setUploading(false);
      setError(uploadError instanceof Error && uploadError.message === 'Upload timed out'
        ? 'Upload is taking too long. Please check the API and storage connection, then try again.'
        : 'Upload failed. Please try again.');
    }
  }

  return (
    <form onSubmit={submit} className="profile-avatar-actions">
      <label className="button ghost profile-picture-button">
        {file ? 'Choose another photo' : 'Change photo'}
        <input
          name="picture"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
      </label>

      {error && <small className="profile-picture-error" role="alert">{error}</small>}
      <small>JPG, PNG or WebP · max 5 MB</small>

      {cropOpen && previewUrl && (
        <div className="profile-picture-modal-backdrop" role="presentation">
          <div className="profile-picture-modal" role="dialog" aria-modal="true" aria-labelledby="profile-picture-modal-title" aria-busy={uploading}>
            <div className="profile-picture-modal-header">
              <div>
                <span className="profile-picture-modal-kicker">Profile photo</span>
                <h2 id="profile-picture-modal-title">Position your photo</h2>
              </div>
              <button className="profile-picture-modal-close" type="button" onClick={cancelCrop} disabled={uploading} aria-label="Close photo editor">×</button>
            </div>
            <div
              className="profile-picture-crop"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              role="img"
              aria-label="Drag to position your profile photo"
            >
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Profile photo preview"
                onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                style={{ transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height) * zoom || 1})` }}
              />
              <span className="profile-picture-crop-guide" aria-hidden="true" />
            </div>
            <label className="profile-picture-zoom">
              <span>Zoom</span>
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
            <small>Drag the image to position it inside the rounded square.</small>
            <div className="profile-picture-modal-actions">
              <button className="button ghost" type="button" onClick={cancelCrop} disabled={uploading}>Cancel</button>
              <button className="button profile-picture-submit" type="submit" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Use this photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
