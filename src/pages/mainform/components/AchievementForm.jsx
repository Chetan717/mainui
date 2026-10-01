import React, { useState } from "react";
import { Label, Button, Modal } from "@heroui/react";
import ImageUploadWithBgRemove from "./ImageUploadWithBgRemove";
import ImageEditorCanvas from "./ImageEditorCanvas";
import { sanitizeAmount, sanitizeName } from "../utils/inputSanitize";

import {toast} from "@heroui/react"

const toBase64 = (blob) =>
  new Promise((res) => {
    if (!blob) return res(null);
    if (typeof blob === "string") return res(blob);
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result);
    reader.readAsDataURL(blob);
  });

export default function AchievementForm({ onSaved }) {
  const [mainImage, setMainImage] = useState(null);
  const [features, setFeatures] = useState([null, null, null]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState({});

  const [editingImage, setEditingImage] = useState(null);
  const [editingType, setEditingType] = useState("main");
  const [onImageDone, setOnImageDone] = useState(null);
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("achieve_form");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.mainImage) setMainImage(data.mainImage);
        if (data.features && Array.isArray(data.features)) setFeatures(data.features);
        if (data.name) setName(data.name);
        if (data.price) setPrice(data.price);
      }
    } catch (err) {
      
    }
  }, []);

  const handleMainImageReady = (image) => {
    setMainImage(image);
    setErrors((prev) => {
      if (!prev.mainImage) return prev;
      const next = { ...prev };
      delete next.mainImage;
      return next;
    });
  };

  const handleFeatureImageReady = (index, image) => {
    setFeatures((prev) =>
      prev.map((feature, featureIndex) =>
        featureIndex === index ? image : feature,
      ),
    );
  };

  const validate = () => {
    const e = {};
    if (!mainImage) e.mainImage = "Upload achievement image";
    if (!name.trim()) e.name = "Name is required";
    if (!price.toString().trim()) e.price = "Price / Level is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.danger("Please fill all required fields");
      return;
    }
    const payload = {
      mainImage: await toBase64(mainImage),
      name,
      price,
      features: await Promise.all(features.map((f) => toBase64(f))),
    };
    try {
      localStorage.setItem("achieve_form", JSON.stringify(payload));
      toast.success("Achievement details saved!");
      onSaved?.();
    } catch (err) {
      toast.danger("Error saving achievement data");
      
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Achievement Image */}
      <div>
        <p className="text-[11px] font-semibold text-foreground/60 mb-2">Achievement Image <span className="text-danger">*</span></p>
        <ImageUploadWithBgRemove
          onImageReady={handleMainImageReady}
          setEditingImage={setEditingImage}
          setOnImageDone={setOnImageDone}
          currentImage={mainImage}
          trigger={
            <div className={`flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${errors.mainImage ? "border-danger bg-danger/5" : "border-border hover:border-accent/50 hover:bg-accent/5"}`}>
              {mainImage ? (
                <img
                  src={typeof mainImage === "string" ? mainImage : URL.createObjectURL(mainImage)}
                  alt="achievement"
                  className="h-20 w-20 object-cover rounded-xl"
                />
              ) : (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${errors.mainImage ? "bg-danger/10" : "bg-accent/10"}`}>
                    <svg className={`w-5 h-5 ${errors.mainImage ? "text-danger" : "text-accent"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75z" />
                    </svg>
                  </div>
                  <p className={`text-[12px] font-semibold ${errors.mainImage ? "text-danger" : "text-foreground"}`}>Upload Achievement Image</p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG supported</p>
                </>
              )}
            </div>
          }
          setOpen={setOpen}
          open={open}
          type="main"
          editingType={editingType}
          setEditingType={setEditingType}
          skipBackgroundRemoval
        />
        {errors.mainImage && <p className="text-[11px] text-danger mt-1">{errors.mainImage}</p>}
      </div>

      {/* Name */}
      <div>
        <label className="text-[11px] font-semibold text-foreground/60 block mb-1">
          Name of Achievement <span className="text-danger">*</span>
        </label>
        <input
          className={`w-full h-11 px-3 rounded-xl border bg-background focus:ring-2 outline-none transition-all text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 ${errors.name ? "border-danger focus:border-danger focus:ring-danger/15" : "border-border focus:border-accent focus:ring-accent/15"}`}
          value={name}
          onChange={(e) => {
            setName(sanitizeName(e.target.value));
            if (errors.name) setErrors((prev) => { const er = { ...prev }; delete er.name; return er; });
          }}
          placeholder="Enter achievement name"
          maxLength={30}
        />
        {errors.name && <p className="text-[11px] text-danger mt-1">{errors.name}</p>}
      </div>

      {/* Price */}
      <div>
        <label className="text-[11px] font-semibold text-foreground/60 block mb-1">
          Price / Level <span className="text-danger">*</span>
        </label>
        <input
          className={`w-full h-11 px-3 rounded-xl border bg-background focus:ring-2 outline-none transition-all text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 ${errors.price ? "border-danger focus:border-danger focus:ring-danger/15" : "border-border focus:border-accent focus:ring-accent/15"}`}
          value={price}
          onChange={(e) => {
            setPrice(sanitizeAmount(e.target.value));
            if (errors.price) setErrors((prev) => { const er = { ...prev }; delete er.price; return er; });
          }}
          placeholder="Enter price"
          type="number"
          maxLength={7}
        />
        {errors.price && <p className="text-[11px] text-danger mt-1">{errors.price}</p>}
      </div>

      {/* Feature Images */}
      <div>
        <p className="text-[11px] font-semibold text-foreground/60 mb-2">Feature Photos (3)</p>
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1">
              <ImageUploadWithBgRemove
                onImageReady={(img) => handleFeatureImageReady(i, img)}
                setEditingImage={setEditingImage}
                setOnImageDone={setOnImageDone}
                currentImage={features[i]}
                trigger={
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-accent/50 bg-muted/20 flex items-center justify-center cursor-pointer overflow-hidden transition-colors">
                    {features[i] ? (
                      <img
                        src={typeof features[i] === "string" ? features[i] : URL.createObjectURL(features[i])}
                        alt={`feature ${i + 1}`}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-muted-foreground/50 text-lg">+</span>
                        <span className="text-[9px] text-muted-foreground font-medium">{i + 1}</span>
                      </div>
                    )}
                  </div>
                }
                setOpen={setOpen}
                open={open}
                type="feature"
                editingType={editingType}
                setEditingType={setEditingType}
                skipBackgroundRemoval
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3.5 rounded-2xl text-white font-bold text-[14px] transition-all active:scale-[0.98] shadow-lg shadow-accent/20"
        style={{ background: "linear-gradient(135deg, #0088DA 0%, #0088DA 100%)" }}
      >
        Save Achievement
      </button>

      <Modal isOpen={open} onOpenChange={(o) => { if (!o) { setEditingImage(null); setOpen(false); } }}>
        <Modal.Backdrop>
          <Modal.Container placement="center" size="full">
            <Modal.Dialog className="w-full max-w-lg bg-transparent shadow-none">
              <ImageEditorCanvas
                src={editingImage}
                onDone={(blob) => onImageDone?.(blob)}
                onCancel={() => { setEditingImage(null); setOpen(false); }}
                setOpen={setOpen}
                editingType={editingType}
                setEditingType={setEditingType}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
