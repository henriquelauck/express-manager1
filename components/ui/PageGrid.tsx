export default function PageGrid({
  children,
  columns = 4,
}: {
  children: React.ReactNode;
  columns?: number;
}) {
  const classes = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 xl:grid-cols-5",
  };

  return (
    <div className={`grid ${classes[columns as 2 | 3 | 4 | 5]} gap-5`}>
      {children}
    </div>
  );
}