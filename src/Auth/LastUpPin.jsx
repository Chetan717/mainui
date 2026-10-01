import { Check } from "@gravity-ui/icons";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  InputOTP,
} from "@heroui/react";
import { useNavigate } from "react-router";
import { useState } from "react";

export function LastUpPin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("send");

  const onSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = {};

    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

  };

  return (
    <div className="flex flex-col gap-10 justify-center items-center h-screen">
      <Form className="flex w-[290px] flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2 w-full">
          <Label className="font-bold text-[#5865f2]">Enter New Pin</Label>

          <InputOTP name="newpin" maxLength={4}>
            <InputOTP.Group className="gap-8">
              <InputOTP.Slot
                className="size-12 border-2 border-border"
                index={0}
              />
              <InputOTP.Slot
                className="size-12 border-2 border-border"
                index={1}
              />
              <InputOTP.Slot
                className="size-12 border-2 border-border"
                index={2}
              />
              <InputOTP.Slot
                className="size-12 border-2 border-border"
                index={3}
              />
            </InputOTP.Group>
          </InputOTP>
        </div>

        <Button onClick={() => {
          navigate("/login");
        }}  className="w-[290px] size-12" type="submit">
          {/* <Check /> */}
          Update Pin
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-[290px] size-12"
        //   onClick={() => setTab("verify")}
        >
          Back
        </Button>
      </Form>
    </div>
  );
}
