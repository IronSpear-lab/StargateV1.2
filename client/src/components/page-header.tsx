import React from "react";

type PageHeaderProps = {
  heading: string;
  subheading?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeader({ heading, subheading, icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        </div>
        {subheading && (
          <p className="text-muted-foreground">{subheading}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}