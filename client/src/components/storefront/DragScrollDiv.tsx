import { useDragScroll } from "@/hooks/use-drag-scroll";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DragScrollDiv({ children, className = "", style, ...rest }: Props) {
  const ref = useDragScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={className} style={style} {...rest}>
      {children}
    </div>
  );
}
