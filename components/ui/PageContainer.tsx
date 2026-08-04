export default function PageContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8fb] p-4 transition-colors dark:bg-slate-950 md:p-8">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}
