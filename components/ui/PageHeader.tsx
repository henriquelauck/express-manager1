export default function PageHeader({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl md:text-4xl font-bold">
        {titulo}
      </h1>

      {descricao && (
        <p className="text-slate-500 mt-2">
          {descricao}
        </p>
      )}
    </div>
  );
}