"use client";

import Link from "next/link";
import { Search, MessageCircle, Bell, Truck, Heart, User, Package, Calendar, Fuel, FileText, Plus } from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function Dashboard() {
  const { teles, motoboys } = useExpressManager();

  function converterValor(valor: string) {
    return Number(valor.replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function dataDaTele(criadoEm: string) {
    return criadoEm.split(",")[0];
  }

  const hoje = new Date().toLocaleDateString("pt-BR");

  const telesHoje = teles.filter((tele) => dataDaTele(tele.criadoEm) === hoje);

  const faturamentoHoje = telesHoje.reduce(
    (total, tele) => total + converterValor(tele.valor),
    0
  );

  const telesEmAndamento = teles.filter(
    (tele) => tele.status !== "Entregue"
  );

  const entregasMes = teles.filter((tele) => {
    const data = dataDaTele(tele.criadoEm);
    const [, mes, ano] = data.split("/");
    const agora = new Date();

    return (
      Number(mes) === agora.getMonth() + 1 &&
      Number(ano) === agora.getFullYear()
    );
  });

  const topClientes = Object.values(
    teles.reduce((acc: any, tele: any) => {
      if (!acc[tele.solicitante]) {
        acc[tele.solicitante] = {
          nome: tele.solicitante,
          quantidade: 0,
          total: 0,
        };
      }

      acc[tele.solicitante].quantidade += 1;
      acc[tele.solicitante].total += converterValor(tele.valor);

      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 3) as any[];

  const contasAReceber = teles
    .filter((tele: any) => !tele.recebimento || tele.recebimento === "pendente")
    .reduce((total, tele) => total + converterValor(tele.valor), 0);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#0f172a]">
      <section className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Olá, Henrique! 👋</h1>
            <p className="text-slate-500 mt-2">
              Aqui está o resumo da sua operação hoje.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="w-[330px] h-16 bg-white rounded-2xl shadow-sm flex items-center px-6 gap-3">
              <Search className="text-slate-500" />
              <span className="text-slate-500">Buscar...</span>
            </div>

            <CircleButton icon={<MessageCircle />} />
            <CircleButton icon={<Bell />} alert />
            <div className="w-16 h-16 rounded-full bg-slate-300" />
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card
            title="Faturamento hoje"
            value={`R$ ${formatarValor(faturamentoHoje)}`}
            icon={<Truck />}
            percent=""
          />

          <Card
            title="Teles realizadas"
            value={`${telesHoje.length}`}
            icon={<Heart />}
            percent=""
          />

          <Card
            title="Motoboys ativos"
            value={`${motoboys.length}`}
            icon={<User />}
            subtitle="Cadastrados"
          />

          <Card
            title="Entregas este mês"
            value={`${entregasMes.length}`}
            icon={<Package />}
            progress
          />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <Panel title="Teles em andamento" button="Ver todas">
            {telesEmAndamento.slice(0, 5).map((tele: any, index: number) => (
              <Tele
                key={tele.id}
                code={`EM${String(index + 1).padStart(6, "0")}`}
                from={tele.solicitante}
                to={tele.nomeCliente}
                boy={tele.motoboy || "Sem motoboy"}
                time={tele.status}
                color={
                  tele.status === "Aguardando cliente"
                    ? "orange"
                    : tele.status === "Aguardando motoboy disponível"
                    ? "blue"
                    : "green"
                }
              />
            ))}

            {telesEmAndamento.length === 0 && (
              <p className="text-slate-500 text-sm">
                Nenhuma tele em andamento.
              </p>
            )}

            <Link href="/teles" className="block text-center mt-5 text-sm">
              Ver todas as operações
            </Link>
          </Panel>

          <Panel title="Faturamento dos últimos 7 dias" button="7 dias">
            <h2 className="text-3xl font-bold mt-2">
              R$ {formatarValor(faturamentoHoje)}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Total exibido com base nas teles cadastradas hoje.
            </p>

            <div className="h-52 flex items-end justify-between text-slate-500 text-sm mt-8">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
                <div key={d} className="flex flex-col items-center gap-3">
                  <div
                    className="w-3 rounded-full bg-emerald-600"
                    style={{ height: `${40 + i * 15}px` }}
                  />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Panel title="Próximas coletas" button="Ver todas">
            {telesEmAndamento.slice(0, 3).map((tele: any) => (
              <Collect
                key={tele.id}
                time={tele.status}
                title={tele.solicitante}
                address={tele.endereco}
                boy={tele.motoboy || "Sem motoboy"}
              />
            ))}

            {telesEmAndamento.length === 0 && (
              <p className="text-slate-500 text-sm">
                Nenhuma coleta pendente.
              </p>
            )}
          </Panel>

          <Panel title="Top clientes" button="Ver ranking">
            {topClientes.map((cliente: any, index: number) => (
              <Client
                key={cliente.nome}
                pos={String(index + 1)}
                name={cliente.nome}
                teles={`${cliente.quantidade} teles`}
                value={`R$ ${formatarValor(cliente.total)}`}
              />
            ))}

            {topClientes.length === 0 && (
              <p className="text-slate-500 text-sm">
                Nenhum cliente com teles ainda.
              </p>
            )}
          </Panel>

          <Panel title="Avisos importantes" button="Ver todos">
            <Notice
              icon={<Calendar />}
              title="Operação do dia"
              text={`${telesHoje.length} teles cadastradas hoje.`}
            />

            <Notice
              icon={<Fuel />}
              title="Motoboys"
              text={`${motoboys.length} motoboys cadastrados.`}
              orange
            />

            <Notice
              icon={<FileText />}
              title="Contas a receber"
              text={`Você tem R$ ${formatarValor(contasAReceber)} a receber.`}
              blue
            />
          </Panel>
        </div>
      </section>

      <Link
        href="/nova-tele"
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center"
      >
        <Plus size={34} />
      </Link>
    </main>
  );
}

function CircleButton({ icon, alert }: any) {
  return (
    <div className="relative w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
      {icon}
      {alert && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
          3
        </span>
      )}
    </div>
  );
}

function Card({ title, value, icon, percent, subtitle, progress }: any) {
  return (
    <div className="bg-white rounded-3xl p-7 shadow-sm h-40">
      <div className="flex gap-5 items-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p>{title}</p>
          <h2 className="text-3xl font-bold mt-2">{value}</h2>
          {percent && (
            <span className="text-sm text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
              ↗ {percent}
            </span>
          )}
          {subtitle && <p className="text-emerald-600 mt-4 text-sm">{subtitle}</p>}
        </div>
      </div>
      {progress && (
        <div className="h-2 bg-slate-100 rounded-full mt-8">
          <div className="h-2 w-[24%] bg-emerald-600 rounded-full" />
        </div>
      )}
    </div>
  );
}

function Panel({ title, button, children }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
        <button className="border border-slate-200 rounded-xl px-4 py-2 text-sm">
          {button}
        </button>
      </div>
      {children}
    </div>
  );
}

function Tele({ code, from, to, boy, time, color }: any) {
  const colorMap: any = {
    green: "bg-emerald-100 text-emerald-700",
    orange: "bg-orange-100 text-orange-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-4">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center ${colorMap[color]}`}
      >
        <Truck />
      </div>
      <div className="flex-1">
        <strong>{code}</strong>
        <p className="text-sm text-slate-600">
          {from} → {to}
        </p>
      </div>
      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm">
        {boy}
      </span>
      <span
        className={
          color === "orange"
            ? "text-orange-500"
            : color === "blue"
            ? "text-blue-600"
            : "text-emerald-600"
        }
      >
        {time}
      </span>
    </div>
  );
}

function Collect({ time, title, address, boy, orange, blue }: any) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span
        className={`px-3 py-2 rounded-lg ${
          orange
            ? "bg-orange-100 text-orange-600"
            : blue
            ? "bg-blue-100 text-blue-600"
            : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {time}
      </span>
      <div className="flex-1">
        <strong>{title}</strong>
        <p className="text-sm text-slate-500">{address}</p>
      </div>
      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm">
        {boy}
      </span>
    </div>
  );
}

function Client({ pos, name, teles, value }: any) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-4">
      <span className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold">
        {pos}
      </span>
      <div className="flex-1">
        <strong>{name}</strong>
        <p className="text-sm text-slate-500">{teles}</p>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function Notice({ icon, title, text, orange, blue }: any) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center ${
          orange
            ? "bg-orange-100 text-orange-600"
            : blue
            ? "bg-blue-100 text-blue-600"
            : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {icon}
      </div>
      <div>
        <strong>{title}</strong>
        <p className="text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}