import type { ButtonProps } from "./Button";
import Button from "./Button";

export type SecondaryButtonProps = Omit<ButtonProps, "variant">;

export default function SecondaryButton({
  children,
  type = "button",
  ...props
}: SecondaryButtonProps) {
  return (
    <Button
      type={type}
      variant="secondary"
      {...props}
    >
      {children}
    </Button>
  );
}
