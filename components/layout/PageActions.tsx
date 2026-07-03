type PageActionsProps = {
  children: React.ReactNode;
  className?: string;
};

export default function PageActions({
  children,
  className = "",
}: PageActionsProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {children}
    </div>
  );
}