export default function PageHeader({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-4xl">
        {titulo}
      </h1>

      {descricao && (
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {descricao}
        </p>
      )}
    </div>
  );
}
