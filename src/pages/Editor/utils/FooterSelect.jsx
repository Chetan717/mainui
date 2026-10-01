import React, { useState, useEffect } from "react";
import { Modal, Button } from "@heroui/react";

export default function FooterSelect({
  graphicsMap,
  frames,
  selectedFooterFrame,
  setSelectedFooterFrame,
  onFrameSelectFooter,
  isOpenFtr,
  setIsOpenFtr,
}) {
  useEffect(() => {
    if (frames?.length > 0 && !selectedFooterFrame) {
      setSelectedFooterFrame(frames[0]);
      onFrameSelectFooter?.(frames[0]);
    }
  }, [frames]);

  const handleSelect = (frame) => {
    setSelectedFooterFrame(frame);
    onFrameSelectFooter?.(frame);
  };
  return (
    <Modal isOpen={isOpenFtr}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.Header>
              <Modal.Heading>Select Frames</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-2 justify-center items-center">
                {frames?.map((frame) => {
                  const isSelected = selectedFooterFrame?.id === frame.id;
                  return (
                    <div
                      key={frame.id}
                      onClick={() => handleSelect(frame)}
                      className={`rounded-xl  h-[60px] p-1 flex justify-center items-center border-2
                          ${isSelected ? "border-accent" : ""}`}
                    >
                      <img
                        src={frame.value}
                        alt={`Frame ${frame.id}`}
                        className="w-full h-[55px] object-contain"
                      />
                    </div>
                  );
                })}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                onClick={() => setIsOpenFtr(false)}
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
