import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "bg-muted placeholder:text-muted-foreground flex field-sizing-content min-h-22 w-full rounded-xl border border-transparent px-4 py-3 text-[15px] leading-relaxed",
        "transition-[background-color,border-color,box-shadow] duration-150 outline-none",
        "hover:bg-muted/70",
        "focus-visible:bg-background focus-visible:border-primary focus-visible:ring-primary/15 focus-visible:ring-2",
        "disabled:bg-muted/40 disabled:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15 aria-invalid:ring-2",
        "dark:bg-muted/40 dark:hover:bg-muted/50 dark:focus-visible:bg-background/60",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
