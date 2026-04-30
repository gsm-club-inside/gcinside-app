"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input bg-background relative flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-[background-color,border-color,box-shadow] outline-none",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        "focus-visible:ring-primary/20 focus-visible:border-primary focus-visible:ring-2",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15 aria-invalid:aria-checked:border-primary aria-invalid:ring-2",
        "group-has-disabled/field:opacity-50 disabled:cursor-not-allowed disabled:opacity-50",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "dark:bg-muted/40 dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
