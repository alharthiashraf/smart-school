import type { ButtonProps } from "./Button";
import Button from "./Button";

export type PrimaryButtonProps = Omit<ButtonProps, "variant">;

export default function PrimaryButton({
  children,
  type = "button",
  ...props
}: PrimaryButtonProps) {
  return (
    <Button
      type={type}
      variant="primary"
      {...props}
    >
      {children}
    </Button>
  );
}