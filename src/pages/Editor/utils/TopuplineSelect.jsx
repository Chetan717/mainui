import React, { useState, useEffect } from "react";
import { Modal, Button } from "@heroui/react";

export default function TopuplineSelect({
  frames,
  onFrameSelect,
  setIsOpen,
  isOpen,
}) {

  const [selectedFrame, setSelectedFrame] = useState(null);

  useEffect(() => {
    if (frames?.length > 0 && !selectedFrame) {
      setSelectedFrame(frames[0]);
      onFrameSelect?.(frames[0]);
    }
  }, [frames]);

  const handleSelect = (frame) => {
    setSelectedFrame(frame);
    onFrameSelect?.(frame);
  };
  return (
    <Modal isOpen={isOpen || false}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.Header>
              <Modal.Heading>Select Frames</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="grid grid-cols-2 gap-3">
                {frames?.map((frame) => {
                  const isSelected = selectedFrame?.id === frame.id;
                  return (
                    <button
                      key={frame.id}
                      onClick={() => handleSelect(frame)}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all
                          ${isSelected ? "border-accent" : "border-border"}`}
                    >
                      <img
                        src={frame.value}
                        alt={`Frame ${frame.id}`}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full"
                slot="close"
              >
                Continue
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
