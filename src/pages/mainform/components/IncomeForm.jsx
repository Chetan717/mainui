import React, { useState, useEffect } from "react";
import ImageUploadSquare from "./ImageUploadSquare";
import { sanitizeAmount, sanitizeFormValue } from "../utils/inputSanitize";
import { toast } from "@heroui/react";

const IncomeForm = ({ onSaved }) => {
  const STORAGE_KEY = "income_form";

  const [formData, setFormData] = useState({
    amount: "",
    noOfDay: "",
    typeOfIncome: "Day",
    proofImage: null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData));
      } catch (error) {
        
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    if (name === "amount") {
      sanitizedValue = sanitizeAmount(value);
    } else if (name === "noOfDay") {
      sanitizedValue = sanitizeFormValue(value, 40);
    } else {
      sanitizedValue = sanitizeFormValue(value, 40);
    }
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    if (errors[name])
      setErrors((prev) => {
        const e = { ...prev };
        delete e[name];
        return e;
      });
  };

  const handleIncomeTypeChange = (type) => {
    setFormData((prev) => ({ ...prev, typeOfIncome: type }));
  };

  const handleImageSelect = (imageData) => {
    setFormData((prev) => ({ ...prev, proofImage: imageData }));
    if (errors.proofImage)
      setErrors((prev) => {
        const e = { ...prev };
        delete e.proofImage;
        return e;
      });
  };

  const validate = () => {
    const e = {};
    if (!formData.amount || String(formData.amount).trim() === "")
      e.amount = "Amount is required";
    if (!formData.noOfDay || String(formData.noOfDay).trim() === "")
      e.noOfDay = "No. of days is required";
    if (!formData.proofImage) e.proofImage = "Proof image is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast.danger("Please fill all required fields");
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      toast.success("Income details saved!");
      onSaved?.();
    } catch (error) {
      toast.danger("Error saving form data");
      
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
      setFormData({
        amount: "",
        noOfDay: "",
        typeOfIncome: "Day",
        proofImage: null,
      });
      setErrors({});
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
        <p className="text-[13px] font-bold text-foreground">Income Details</p>
      </div>

      <div className="flex flex-row gap-1 w-full justify-center items-center">
        <div className="flex flex-col gap-3 w-[60%] ">
          {/* Amount */}
          <div>
            <label className="text-[11px] font-semibold text-foreground/60 block mb-1.5">
              Amount <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-accent/70">
                ₹
              </span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0000"
                className={`w-full h-11 pl-8 pr-3 rounded-xl border bg-background focus:ring-2 outline-none transition-all text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 ${errors.amount ? "border-danger focus:border-danger focus:ring-danger/15" : "border-border focus:border-accent focus:ring-accent/15"}`}
                min="0"
                maxLength={7}
              />
            </div>
            {errors.amount && (
              <p className="text-[11px] text-danger mt-1">{errors.amount}</p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-semibold text-foreground/60 block mb-1.5">
              No of Days <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="noOfDay"
              value={formData.noOfDay}
              onChange={handleInputChange}
              placeholder="0"
              className={`w-full h-11 px-3 rounded-xl border bg-background focus:ring-2 outline-none transition-all text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 ${errors.noOfDay ? "border-danger focus:border-danger focus:ring-danger/15" : "border-border focus:border-accent focus:ring-accent/15"}`}
              min="0"
            />
            {errors.noOfDay && (
              <p className="text-[11px] text-danger mt-1">{errors.noOfDay}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col  w-[40%] h-full  ">
      
          <div
            className={
              errors.proofImage ? "rounded-xl border-2 border-danger" : "h-full w-full"
            }
          >
            <ImageUploadSquare
              onImageSelect={handleImageSelect}
              previewImage={formData.proofImage}
              label="Proof Image"
            />
          </div>
          {errors.proofImage && (
            <p className="text-[11px] text-danger mt-1">{errors.proofImage}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-foreground/60 block mb-1.5">
          Type of Income <span className="text-danger">*</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {["Day", "Week", "Month", "Year"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleIncomeTypeChange(type)}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${
                formData.typeOfIncome === type
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "bg-muted/40 text-foreground/70 border border-border hover:border-accent/40"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      {/* Proof Image */}

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3.5 rounded-2xl text-white font-bold text-[13px] transition-all active:scale-[0.98] shadow-lg shadow-accent/20"
          style={{
            background: "linear-gradient(135deg, #0088DA 0%, #0088DA 100%)",
          }}
        >
          Save Income
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-5 py-3.5 rounded-2xl border border-border text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
export default IncomeForm;
