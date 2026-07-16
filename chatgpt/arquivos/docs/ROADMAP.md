# ROADMAP - EXPRESS MANAGER

## VISÃO DO PROJETO

O Express Manager será uma plataforma inteligente para gestão de entregas, onde toda a regra de negócio estará centralizada no sistema e a Inteligência Artificial atuará como uma atendente virtual da empresa.

A IA nunca será responsável pelas regras do negócio.
Ela apenas utilizará os Cores do sistema para tomar decisões e responder clientes.

---

# FASE 1 — Base do Sistema ✅

- [x] Cadastro de Clientes
- [x] Cadastro de Motoboys
- [x] Cadastro de Teles
- [x] Dashboard inicial
- [x] Login
- [x] Banco PostgreSQL
- [x] Prisma
- [x] Integração Google Maps
- [x] Cálculo automático de rotas
- [x] Cálculo automático de valores

---

# FASE 2 — Arquitetura Inteligente (Em andamento)

## Services

- [x] Separação das regras das páginas

## Core Distribuição

- [x] Score do Motoboy
- [x] Escolha automática do melhor motoboy

## Core Financeiro

- [x] Regras financeiras centralizadas

## Core Logística

- [x] Estrutura inicial

## Orquestrador

- [x] Estrutura criada
- [x] Padronização de respostas
- [ ] Assumir completamente a criação de teles
- [ ] Centralizar chamadas dos Cores

---

# FASE 3 — Inteligência Operacional

## Distribuição Inteligente

- [ ] Sugestão automática de motoboy
- [ ] Distribuição automática
- [ ] Balanceamento de carga
- [ ] Score baseado em produtividade
- [ ] Score baseado na localização

## Logística Inteligente

- [ ] Simulação de encaixe de entregas
- [ ] Melhor sequência de paradas
- [ ] Redução automática de quilômetros
- [ ] Estimativa de horário de chegada
- [ ] Cálculo de tempo extra

## Financeiro Inteligente

- [ ] Alertas de recebimentos
- [ ] Fechamentos automáticos
- [ ] Fluxo de caixa
- [ ] Indicadores financeiros

---

# FASE 4 — Aplicativo do Motoboy

- [ ] Login do motoboy
- [ ] Receber teles
- [ ] Aceitar/Rejeitar corrida
- [ ] Atualizar status
- [ ] Compartilhar localização
- [ ] Histórico
- [ ] Extrato financeiro
- [ ] Prestação de contas

---

# FASE 5 — Central de Atendimento Inteligente

Objetivo:

A IA será uma atendente da Express Manager.

Ela responderá clientes, criará teles, calculará valores e consultará informações do sistema.

Sempre utilizará o Orquestrador.

## Atendimento

- [ ] Atendimento via WhatsApp
- [ ] Atendimento pelo site
- [ ] Atendimento interno

## Fluxo

Cliente
↓

IA

↓

Orquestrador

↓

Cores

↓

Banco

## Capacidades

- [ ] Calcular orçamento
- [ ] Criar tele
- [ ] Consultar andamento
- [ ] Informar motoboy
- [ ] Informar horário previsto
- [ ] Consultar pagamentos
- [ ] Consultar histórico

---

# FASE 6 — Atendimento Humano Integrado

A IA nunca substituirá completamente o atendimento humano.

Sempre existirá a possibilidade de intervenção manual.

## Painel

- [ ] Lista de conversas
- [ ] IA atendendo
- [ ] Aguardando humano
- [ ] Humano atendendo
- [ ] Finalizadas

## Recursos

- [ ] Assumir atendimento
- [ ] Devolver atendimento para IA
- [ ] Histórico completo
- [ ] Sugestões da IA
- [ ] Motivo do encaminhamento

---

# FASE 7 — IA Aprendendo com a Operação

- [ ] Registrar decisões do gestor
- [ ] Identificar padrões
- [ ] Sugerir respostas
- [ ] Melhorar distribuição
- [ ] Melhorar encaixes
- [ ] Melhorar previsão de tempo
- [ ] Melhorar precificação

---

# FASE 8 — Inteligência Empresarial

## Dashboard

- [ ] Clientes mais lucrativos
- [ ] Motoboys mais produtivos
- [ ] Horários de maior movimento
- [ ] Tempo médio de entrega
- [ ] Receita por região
- [ ] Receita por cliente

## IA Analítica

- [ ] Previsão de faturamento
- [ ] Sugestão de novos clientes
- [ ] Alertas de problemas
- [ ] Sugestões operacionais

---

# PRINCÍPIOS DO PROJETO

## 1.

Toda regra de negócio deve existir apenas uma vez.

## 2.

A IA nunca decide regras de negócio.

Ela utiliza os Cores do sistema.

## 3.

O painel e a IA utilizam exatamente o mesmo Orquestrador.

## 4.

Sempre será possível assumir qualquer atendimento manualmente.

## 5.

Toda funcionalidade nova deve substituir código antigo ou entregar valor ao usuário.

## 6.

Alterar apenas um componente crítico por vez, validar o funcionamento e somente então avançar.

## OBJETIVO FINAL

Criar a plataforma de gestão de entregas mais inteligente do Brasil, onde:

- a operação funciona normalmente sem IA;
- a IA reduz drasticamente o trabalho operacional;
- o gestor mantém controle total do negócio;
- toda decisão crítica pode ser revisada ou assumida manualmente.