import React from "react";
import { Modal, Button } from "@heroui/react";

function InvoicePopup({show, setInvShow}) {
  return (
    <>
      <Modal
       isOpen={show}
       onOpenChange={(open) => { if (!open) setInvShow(false); }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[360px]">
              <Modal.Header>
                <Modal.Heading>Select Frames</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-2 justify-center items-center"></div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onClick={() => setInvShow(false)}
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
    </>
  );
}

export default InvoicePopup;
