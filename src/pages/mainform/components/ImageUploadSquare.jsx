import React, { useRef, useState } from 'react';
import { Modal, toast } from "@heroui/react";
import { validateUploadFile } from "../../../lib/fileValidation";
import ImageEditorCanvas from './ImageEditorCanvas';

const ImageUploadSquare = ({ onImageSelect, previewImage, label = "Upload Proof Image" }) => {
  const fileInputRef = useRef(null);
  const [error, setError]         = useState('');
  const [editingImage, setEditingImage] = useState(null);
  const [openEditor, setOpenEditor]     = useState(false);
  const [isSaving, setIsSaving]         = useState(false);

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const result = validateUploadFile(file, "image");
    if (!result.valid) {
      setError(result.error || "Invalid image file.");
      toast.danger(result.error || "Invalid image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError('');
    setEditingImage(file);
    setOpenEditor(true);
  };

  const handleClick        = () => fileInputRef.current?.click();
  const handleRemoveImage  = (e) => {
    e.stopPropagation();
    onImageSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditorDone = async (blob) => {
    if (!blob) return;
    setIsSaving(true);
    try {
      const dataUrl = await fileToDataUrl(blob);
      onImageSelect(dataUrl);
    } catch (uploadError) {
      
      setError('Failed to process the image. Please try again.');
    } finally {
      setIsSaving(false);
      setOpenEditor(false);
      setEditingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditorCancel = () => {
    setOpenEditor(false);
    setEditingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full h-full">
      {/* Label */}
      <p className="text-[12px] font-semibold text-foreground mb-2">
        {label} <span className="text-danger">*</span>
      </p>

      {/* Upload zone */}
      <div
        onClick={handleClick}
        className={`w-full aspect-square rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden flex items-center justify-center
          ${previewImage
            ? "border-accent/40 bg-muted/10"
            : "border-border hover:border-accent/60 bg-muted/20 hover:bg-accent/5 group"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />

        {previewImage ? (
          <div className="relative w-full h-full group">
            <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-accent/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z"/>
                </svg>
              </div>
              <p className="text-white text-[11px] font-bold">Tap to change</p>
            </div>
            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-danger/80 flex items-center justify-center transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-4 pointer-events-none">
            <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border group-hover:bg-accent/10 group-hover:border-accent/30 flex items-center justify-center transition-all duration-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-accent transition-colors">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            {/* <div className="text-center">
              <p className="text-[13px] font-semibold text-foreground group-hover:text-accent transition-colors">Click to upload</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">or drag and drop</p>
            </div> */}
          </div>
        )}
      </div>

      {/* Saving state */}
      {isSaving && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-accent/8 border border-accent/20">
          <svg className="w-4 h-4 animate-spin text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-[11px] font-medium text-accent">Processing image...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 mt-2 px-3 py-2 rounded-xl bg-danger/8 border border-danger/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-danger flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <p className="text-[11px] font-medium text-danger">{error}</p>
        </div>
      )}

      {/* Editor Modal */}
      <Modal isOpen={openEditor} onOpenChange={(o) => { if (!o) handleEditorCancel(); }}>
        <Modal.Backdrop>
          <Modal.Container placement="center" size="full">
            <Modal.Dialog className="w-full max-w-[660px] bg-transparent shadow-none">
              <ImageEditorCanvas
                src={editingImage}
                onDone={handleEditorDone}
                onCancel={handleEditorCancel}
                setOpen={setOpenEditor}
                editingType="proof"
                setEditingType={() => {}}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};

export default ImageUploadSquare;
