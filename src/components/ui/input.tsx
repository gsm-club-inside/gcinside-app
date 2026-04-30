import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "bg-muted placeholder:text-muted-foreground flex h-11 w-full min-w-0 items-center rounded-xl border border-transparent px-4 text-[15px]",
        "transition-[background-color,border-color,box-shadow] duration-150 outline-none",
        "hover:bg-muted/70",
        "focus-visible:bg-background focus-visible:border-primary focus-visible:ring-primary/15 focus-visible:ring-2",
        "disabled:bg-muted/40 disabled:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15 aria-invalid:ring-2",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "dark:bg-muted/40 dark:hover:bg-muted/50 dark:focus-visible:bg-background/60",
        className
      )}
      {...props}
    />
  );
}

export { Input };
