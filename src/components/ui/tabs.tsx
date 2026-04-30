"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "border-border relative flex h-12 w-full items-stretch gap-1 border-b",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "text-muted-foreground relative inline-flex h-12 items-center justify-center gap-1.5 px-3 text-[15px] font-medium whitespace-nowrap",
        "transition-colors duration-150 ease-out motion-reduce:transition-none",
        "focus-visible:ring-ring/40 focus-visible:rounded-md focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:text-foreground/80",
        "data-selected:text-foreground data-selected:font-semibold",
        className
      )}
      {...props}
    />
  );
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "bg-primary absolute -bottom-px h-0.5 rounded-full",
        "left-(--active-tab-left) w-(--active-tab-width)",
        "transition-[left,width] duration-220 ease-out motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out outline-none",
        "motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator };
