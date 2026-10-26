import type { ComponentProps } from "react";

export function Table({
  className = "",
  children,
  label,
  ...props
}: ComponentProps<"table"> & { label: string }) {
  return (
    <div
      className="ui-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table {...props} className={`ui-table ${className}`}>
        {children}
      </table>
    </div>
  );
}
export function TableCaption(props: ComponentProps<"caption">) {
  return <caption {...props} />;
}
export function TableHeader(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}
export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}
export function TableFooter(props: ComponentProps<"tfoot">) {
  return <tfoot {...props} />;
}
export function TableRow(props: ComponentProps<"tr">) {
  return <tr {...props} />;
}
export function TableHead({ scope = "col", ...props }: ComponentProps<"th">) {
  return <th scope={scope} {...props} />;
}
export function TableCell(props: ComponentProps<"td">) {
  return <td {...props} />;
}
