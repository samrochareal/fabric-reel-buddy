import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number;
  onValueChange: (value: number) => void;
  /** Decimal places used when showing the value (money fields use 2). */
  decimals?: number;
  min?: number;
  max?: number;
  /** Value used when the field is left empty. */
  emptyValue?: number;
};

function format(value: number, decimals: number) {
  if (!Number.isFinite(value)) return "";
  return decimals > 0 ? value.toFixed(decimals) : String(value);
}

/**
 * Numeric field that can be cleared: the digits stay editable (including an
 * empty field) while the parsed number is reported to the parent.
 */
export function NumberInput({
  value,
  onValueChange,
  decimals = 0,
  min,
  max,
  emptyValue,
  onBlur,
  ...rest
}: Props) {
  const [text, setText] = useState(() => format(value, decimals));
  const editing = useRef(false);

  useEffect(() => {
    if (editing.current) return;
    setText(format(value, decimals));
  }, [value, decimals]);

  const clamp = (n: number) => {
    let out = n;
    if (typeof min === "number") out = Math.max(min, out);
    if (typeof max === "number") out = Math.min(max, out);
    return out;
  };

  return (
    <Input
      {...rest}
      type="number"
      min={min}
      max={max}
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      value={text}
      onFocus={(e) => {
        editing.current = true;
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next.trim() === "") {
          onValueChange(clamp(emptyValue ?? 0));
          return;
        }
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onValueChange(clamp(parsed));
      }}
      onBlur={(e) => {
        editing.current = false;
        const parsed = e.target.value.trim() === "" ? (emptyValue ?? 0) : Number(e.target.value);
        const final = clamp(Number.isFinite(parsed) ? parsed : (emptyValue ?? 0));
        setText(format(final, decimals));
        onValueChange(final);
        onBlur?.(e);
      }}
    />
  );
}
