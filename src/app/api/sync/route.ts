import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      connected: false,
      message: "DATABASE_URL não configurada. Operando em modo offline / localStorage.",
    });
  }

  try {
    // Testa conectividade rápida
    await prisma.$queryRaw`SELECT 1`;

    const [
      veiculosRaw,
      clientesRaw,
      modelosRaw,
      vendasRaw,
      documentosRaw,
      usersRaw,
    ] = await Promise.all([
      prisma.veiculo.findMany({
        include: {
          fotos: { orderBy: { ordem: "asc" } },
          despesas: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cliente.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.modeloDocumento.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.venda.findMany({
        include: {
          veiculo: { include: { fotos: true, despesas: true } },
          cliente: true,
          parcelas: { orderBy: { numero: "asc" } },
          abatimentos: { orderBy: { data: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.documentoGerado.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.user.findMany({
        include: { credential: true },
        orderBy: { criadoEm: "asc" },
      }),
    ]);

    const veiculos = veiculosRaw.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      despesas: v.despesas.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
      custoTotal: v.valorAquisicao + v.despesas.reduce((acc, d) => acc + (d.valor || 0), 0),
    }));

    const clientes = clientesRaw.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const modelos = modelosRaw.map((m) => ({
      ...m,
      updatedAt: m.updatedAt.toISOString(),
    }));

    const vendas = vendasRaw.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      veiculo: v.veiculo
        ? {
            ...v.veiculo,
            createdAt: v.veiculo.createdAt.toISOString(),
            updatedAt: v.veiculo.updatedAt.toISOString(),
          }
        : undefined,
      cliente: v.cliente
        ? {
            ...v.cliente,
            createdAt: v.cliente.createdAt.toISOString(),
            updatedAt: v.cliente.updatedAt.toISOString(),
          }
        : undefined,
    }));

    const documentosGerados = documentosRaw.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    }));

    const users = usersRaw.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      cargo: u.cargo,
      role: u.role as "ADMIN" | "GERENTE" | "VENDEDOR",
      telefone: u.telefone || undefined,
      ativo: u.ativo,
      ultimoAcesso: u.ultimoAcesso ? u.ultimoAcesso.toISOString() : undefined,
      criadoEm: u.criadoEm.toISOString(),
    }));

    const credentials = usersRaw
      .filter((u) => u.credential)
      .map((u) => ({
        userId: u.id,
        email: u.email,
        passwordHash: u.credential!.passwordHash,
      }));

    return NextResponse.json({
      connected: true,
      data: {
        veiculos,
        clientes,
        modelos,
        vendas,
        documentosGerados,
        users,
        credentials,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao sincronizar com PostgreSQL:", msg);
    return NextResponse.json({
      connected: false,
      error: msg,
      message: "Falha na conexão com o banco de dados. Usando armazenamento local.",
    });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL não configurada.",
    });
  }

  try {
    const body = await req.json();
    const { action, data, id, parentId } = body;

    if (action === "seed_migration") {
      // Migração inicial em lote do localStorage para o PostgreSQL
      const { veiculos, clientes, modelos, vendas, documentosGerados, users, credentials } = data || {};

      if (Array.isArray(users)) {
        for (const u of users) {
          const cred = Array.isArray(credentials) ? credentials.find((c: { userId: string }) => c.userId === u.id) : null;
          await prisma.user.upsert({
            where: { id: u.id },
            update: {
              nome: u.nome,
              email: u.email,
              cargo: u.cargo,
              role: u.role,
              telefone: u.telefone,
              ativo: u.ativo ?? true,
            },
            create: {
              id: u.id,
              nome: u.nome,
              email: u.email,
              cargo: u.cargo,
              role: u.role,
              telefone: u.telefone,
              ativo: u.ativo ?? true,
              criadoEm: u.criadoEm ? new Date(u.criadoEm) : new Date(),
              credential: cred
                ? {
                    create: {
                      email: u.email,
                      passwordHash: cred.passwordHash,
                    },
                  }
                : undefined,
            },
          });
        }
      }

      if (Array.isArray(clientes)) {
        for (const c of clientes) {
          await prisma.cliente.upsert({
            where: { id: c.id },
            update: { ...c, createdAt: undefined, updatedAt: undefined },
            create: {
              id: c.id,
              tipoPessoa: c.tipoPessoa,
              nome: c.nome,
              cpfCnpj: c.cpfCnpj,
              telefone: c.telefone,
              cidade: c.cidade,
              estadoUf: c.estadoUf,
              estadoCivil: c.estadoCivil,
              profissao: c.profissao,
              endereco: c.endereco,
              observacoes: c.observacoes,
            },
          });
        }
      }

      if (Array.isArray(modelos)) {
        for (const m of modelos) {
          await prisma.modeloDocumento.upsert({
            where: { id: m.id },
            update: { ...m, updatedAt: undefined },
            create: {
              id: m.id,
              titulo: m.titulo,
              conteudo: m.conteudo,
              isPadrao: m.isPadrao ?? false,
            },
          });
        }
      }

      if (Array.isArray(veiculos)) {
        for (const v of veiculos) {
          await prisma.veiculo.upsert({
            where: { id: v.id },
            update: {
              categoria: v.categoria,
              marca: v.marca,
              modelo: v.modelo,
              versao: v.versao,
              anoFabricacao: Number(v.anoFabricacao),
              anoModelo: Number(v.anoModelo),
              cor: v.cor,
              dataEntrada: v.dataEntrada,
              valorAquisicao: Number(v.valorAquisicao),
              precoAnunciado: Number(v.precoAnunciado),
              valorFipe: v.valorFipe ? Number(v.valorFipe) : null,
              codigoFipe: v.codigoFipe,
              mesReferenciaFipe: v.mesReferenciaFipe,
              status: v.status,
              observacoes: v.observacoes,
              placa: v.placa,
              renavam: v.renavam,
              chassi: v.chassi,
              quilometragem: v.quilometragem ? Number(v.quilometragem) : null,
              combustivel: v.combustivel,
              cambio: v.cambio,
              fotoCapa: v.fotoCapa,
            },
            create: {
              id: v.id,
              categoria: v.categoria,
              marca: v.marca,
              modelo: v.modelo,
              versao: v.versao,
              anoFabricacao: Number(v.anoFabricacao),
              anoModelo: Number(v.anoModelo),
              cor: v.cor,
              dataEntrada: v.dataEntrada,
              valorAquisicao: Number(v.valorAquisicao),
              precoAnunciado: Number(v.precoAnunciado),
              valorFipe: v.valorFipe ? Number(v.valorFipe) : null,
              codigoFipe: v.codigoFipe,
              mesReferenciaFipe: v.mesReferenciaFipe,
              status: v.status,
              observacoes: v.observacoes,
              placa: v.placa,
              renavam: v.renavam,
              chassi: v.chassi,
              quilometragem: v.quilometragem ? Number(v.quilometragem) : null,
              combustivel: v.combustivel,
              cambio: v.cambio,
              fotoCapa: v.fotoCapa,
            },
          });

          if (Array.isArray(v.despesas)) {
            for (const d of v.despesas) {
              await prisma.despesaVeiculo.upsert({
                where: { id: d.id },
                update: {
                  descricao: d.descricao,
                  tipoDespesa: d.tipoDespesa,
                  valor: Number(d.valor),
                  dataDespesa: d.dataDespesa,
                  fornecedorNome: d.fornecedorNome,
                  notaFiscal: d.notaFiscal,
                },
                create: {
                  id: d.id,
                  veiculoId: v.id,
                  descricao: d.descricao,
                  tipoDespesa: d.tipoDespesa,
                  valor: Number(d.valor),
                  dataDespesa: d.dataDespesa,
                  fornecedorNome: d.fornecedorNome,
                  notaFiscal: d.notaFiscal,
                },
              });
            }
          }

          if (Array.isArray(v.fotos)) {
            await prisma.fotoVeiculo.deleteMany({ where: { veiculoId: v.id } });
            for (let i = 0; i < v.fotos.length; i++) {
              const f = v.fotos[i];
              await prisma.fotoVeiculo.create({
                data: {
                  id: f.id || `f-${v.id}-${i}`,
                  veiculoId: v.id,
                  url: f.url,
                  isCapa: Boolean(f.isCapa),
                  ordem: typeof f.ordem === "number" ? f.ordem : i,
                },
              });
            }
          }
        }
      }

      if (Array.isArray(vendas)) {
        for (const vd of vendas) {
          await prisma.venda.upsert({
            where: { id: vd.id },
            update: {
              dataVenda: vd.dataVenda,
              valorVenda: Number(vd.valorVenda),
              custoTotal: Number(vd.custoTotal),
              margemLucro: Number(vd.margemLucro),
              formaPagamento: vd.formaPagamento,
              valorEntrada: Number(vd.valorEntrada),
              valorFinanciado: Number(vd.valorFinanciado),
              bancoFinanciador: vd.bancoFinanciador,
              valorTroca: vd.valorTroca ? Number(vd.valorTroca) : null,
              saldoDevedorInicial: vd.saldoDevedorInicial ? Number(vd.saldoDevedorInicial) : null,
              anotacoesCaderno: vd.anotacoesCaderno,
              observacoes: vd.observacoes,
            },
            create: {
              id: vd.id,
              veiculoId: vd.veiculoId,
              clienteId: vd.clienteId,
              dataVenda: vd.dataVenda,
              valorVenda: Number(vd.valorVenda),
              custoTotal: Number(vd.custoTotal),
              margemLucro: Number(vd.margemLucro),
              formaPagamento: vd.formaPagamento,
              valorEntrada: Number(vd.valorEntrada),
              valorFinanciado: Number(vd.valorFinanciado),
              bancoFinanciador: vd.bancoFinanciador,
              valorTroca: vd.valorTroca ? Number(vd.valorTroca) : null,
              veiculoTrocaId: vd.veiculoTrocaId,
              saldoDevedorInicial: vd.saldoDevedorInicial ? Number(vd.saldoDevedorInicial) : null,
              anotacoesCaderno: vd.anotacoesCaderno,
              observacoes: vd.observacoes,
            },
          });

          if (Array.isArray(vd.parcelas)) {
            for (const p of vd.parcelas) {
              await prisma.parcelaReceber.upsert({
                where: { id: p.id },
                update: {
                  numero: Number(p.numero),
                  valor: Number(p.valor),
                  dataVencimento: p.dataVencimento,
                  pago: Boolean(p.pago),
                  dataPagamento: p.dataPagamento,
                  observacao: p.observacao,
                },
                create: {
                  id: p.id,
                  vendaId: vd.id,
                  numero: Number(p.numero),
                  valor: Number(p.valor),
                  dataVencimento: p.dataVencimento,
                  pago: Boolean(p.pago),
                  dataPagamento: p.dataPagamento,
                  observacao: p.observacao,
                },
              });
            }
          }

          if (Array.isArray(vd.abatimentos)) {
            for (const a of vd.abatimentos) {
              await prisma.abatimentoReceber.upsert({
                where: { id: a.id },
                update: {
                  valor: Number(a.valor),
                  data: a.data,
                  observacao: a.observacao,
                  parcelaId: a.parcelaId,
                },
                create: {
                  id: a.id,
                  vendaId: vd.id,
                  valor: Number(a.valor),
                  data: a.data,
                  observacao: a.observacao,
                  parcelaId: a.parcelaId,
                },
              });
            }
          }
        }
      }

      if (Array.isArray(documentosGerados)) {
        for (const doc of documentosGerados) {
          await prisma.documentoGerado.upsert({
            where: { id: doc.id },
            update: {
              titulo: doc.titulo,
              conteudoFinal: doc.conteudoFinal,
              pdfUrl: doc.pdfUrl,
            },
            create: {
              id: doc.id,
              modeloId: doc.modeloId,
              clienteId: doc.clienteId,
              veiculoId: doc.veiculoId,
              outorgadoId: doc.outorgadoId,
              vendaId: doc.vendaId,
              titulo: doc.titulo,
              conteudoFinal: doc.conteudoFinal,
              pdfUrl: doc.pdfUrl,
            },
          });
        }
      }

      return NextResponse.json({ success: true, message: "Migração e sincronização concluídas!" });
    }

    // Ações individuais de mutação
    if (action === "save_veiculo") {
      const v = data;
      await prisma.veiculo.upsert({
        where: { id: v.id },
        update: {
          categoria: v.categoria,
          marca: v.marca,
          modelo: v.modelo,
          versao: v.versao,
          anoFabricacao: Number(v.anoFabricacao),
          anoModelo: Number(v.anoModelo),
          cor: v.cor,
          dataEntrada: v.dataEntrada,
          valorAquisicao: Number(v.valorAquisicao),
          precoAnunciado: Number(v.precoAnunciado),
          valorFipe: v.valorFipe ? Number(v.valorFipe) : null,
          codigoFipe: v.codigoFipe,
          mesReferenciaFipe: v.mesReferenciaFipe,
          status: v.status,
          observacoes: v.observacoes,
          placa: v.placa,
          renavam: v.renavam,
          chassi: v.chassi,
          quilometragem: v.quilometragem ? Number(v.quilometragem) : null,
          combustivel: v.combustivel,
          cambio: v.cambio,
          fotoCapa: v.fotoCapa,
        },
        create: {
          id: v.id,
          categoria: v.categoria,
          marca: v.marca,
          modelo: v.modelo,
          versao: v.versao,
          anoFabricacao: Number(v.anoFabricacao),
          anoModelo: Number(v.anoModelo),
          cor: v.cor,
          dataEntrada: v.dataEntrada,
          valorAquisicao: Number(v.valorAquisicao),
          precoAnunciado: Number(v.precoAnunciado),
          valorFipe: v.valorFipe ? Number(v.valorFipe) : null,
          codigoFipe: v.codigoFipe,
          mesReferenciaFipe: v.mesReferenciaFipe,
          status: v.status,
          observacoes: v.observacoes,
          placa: v.placa,
          renavam: v.renavam,
          chassi: v.chassi,
          quilometragem: v.quilometragem ? Number(v.quilometragem) : null,
          combustivel: v.combustivel,
          cambio: v.cambio,
          fotoCapa: v.fotoCapa,
        },
      });

      if (Array.isArray(v.fotos)) {
        await prisma.fotoVeiculo.deleteMany({ where: { veiculoId: v.id } });
        for (let i = 0; i < v.fotos.length; i++) {
          const f = v.fotos[i];
          await prisma.fotoVeiculo.create({
            data: {
              id: f.id || `f-${v.id}-${i}`,
              veiculoId: v.id,
              url: f.url,
              isCapa: Boolean(f.isCapa),
              ordem: typeof f.ordem === "number" ? f.ordem : i,
            },
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "delete_veiculo") {
      await prisma.veiculo.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_despesa") {
      const d = data;
      await prisma.despesaVeiculo.upsert({
        where: { id: d.id },
        update: {
          descricao: d.descricao,
          tipoDespesa: d.tipoDespesa,
          valor: Number(d.valor),
          dataDespesa: d.dataDespesa,
          fornecedorNome: d.fornecedorNome,
          notaFiscal: d.notaFiscal,
        },
        create: {
          id: d.id,
          veiculoId: parentId,
          descricao: d.descricao,
          tipoDespesa: d.tipoDespesa,
          valor: Number(d.valor),
          dataDespesa: d.dataDespesa,
          fornecedorNome: d.fornecedorNome,
          notaFiscal: d.notaFiscal,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_despesa") {
      await prisma.despesaVeiculo.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_cliente") {
      const c = data;
      await prisma.cliente.upsert({
        where: { id: c.id },
        update: {
          tipoPessoa: c.tipoPessoa,
          nome: c.nome,
          cpfCnpj: c.cpfCnpj,
          telefone: c.telefone,
          cidade: c.cidade,
          estadoUf: c.estadoUf,
          estadoCivil: c.estadoCivil,
          profissao: c.profissao,
          endereco: c.endereco,
          observacoes: c.observacoes,
        },
        create: {
          id: c.id,
          tipoPessoa: c.tipoPessoa,
          nome: c.nome,
          cpfCnpj: c.cpfCnpj,
          telefone: c.telefone,
          cidade: c.cidade,
          estadoUf: c.estadoUf,
          estadoCivil: c.estadoCivil,
          profissao: c.profissao,
          endereco: c.endereco,
          observacoes: c.observacoes,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_cliente") {
      await prisma.cliente.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_modelo") {
      const m = data;
      await prisma.modeloDocumento.upsert({
        where: { id: m.id },
        update: {
          titulo: m.titulo,
          conteudo: m.conteudo,
          isPadrao: m.isPadrao ?? false,
        },
        create: {
          id: m.id,
          titulo: m.titulo,
          conteudo: m.conteudo,
          isPadrao: m.isPadrao ?? false,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_modelo") {
      await prisma.modeloDocumento.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_venda") {
      const vd = data;
      await prisma.venda.upsert({
        where: { id: vd.id },
        update: {
          dataVenda: vd.dataVenda,
          valorVenda: Number(vd.valorVenda),
          custoTotal: Number(vd.custoTotal),
          margemLucro: Number(vd.margemLucro),
          formaPagamento: vd.formaPagamento,
          valorEntrada: Number(vd.valorEntrada),
          valorFinanciado: Number(vd.valorFinanciado),
          bancoFinanciador: vd.bancoFinanciador,
          valorTroca: vd.valorTroca ? Number(vd.valorTroca) : null,
          saldoDevedorInicial: vd.saldoDevedorInicial ? Number(vd.saldoDevedorInicial) : null,
          anotacoesCaderno: vd.anotacoesCaderno,
          observacoes: vd.observacoes,
        },
        create: {
          id: vd.id,
          veiculoId: vd.veiculoId,
          clienteId: vd.clienteId,
          dataVenda: vd.dataVenda,
          valorVenda: Number(vd.valorVenda),
          custoTotal: Number(vd.custoTotal),
          margemLucro: Number(vd.margemLucro),
          formaPagamento: vd.formaPagamento,
          valorEntrada: Number(vd.valorEntrada),
          valorFinanciado: Number(vd.valorFinanciado),
          bancoFinanciador: vd.bancoFinanciador,
          valorTroca: vd.valorTroca ? Number(vd.valorTroca) : null,
          veiculoTrocaId: vd.veiculoTrocaId,
          saldoDevedorInicial: vd.saldoDevedorInicial ? Number(vd.saldoDevedorInicial) : null,
          anotacoesCaderno: vd.anotacoesCaderno,
          observacoes: vd.observacoes,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_venda") {
      await prisma.venda.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_parcela") {
      const { parcela, vendaId } = data;
      await prisma.parcelaReceber.upsert({
        where: { id: parcela.id },
        update: {
          numero: Number(parcela.numero),
          valor: Number(parcela.valor),
          dataVencimento: parcela.dataVencimento,
          pago: Boolean(parcela.pago),
          dataPagamento: parcela.dataPagamento,
          observacao: parcela.observacao,
        },
        create: {
          id: parcela.id,
          vendaId: vendaId || parentId,
          numero: Number(parcela.numero),
          valor: Number(parcela.valor),
          dataVencimento: parcela.dataVencimento,
          pago: Boolean(parcela.pago),
          dataPagamento: parcela.dataPagamento,
          observacao: parcela.observacao,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_parcela") {
      await prisma.parcelaReceber.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_abatimento") {
      const { abatimento, vendaId } = data;
      await prisma.abatimentoReceber.upsert({
        where: { id: abatimento.id },
        update: {
          valor: Number(abatimento.valor),
          data: abatimento.data,
          observacao: abatimento.observacao,
          parcelaId: abatimento.parcelaId,
        },
        create: {
          id: abatimento.id,
          vendaId: vendaId || parentId,
          valor: Number(abatimento.valor),
          data: abatimento.data,
          observacao: abatimento.observacao,
          parcelaId: abatimento.parcelaId,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_abatimento") {
      await prisma.abatimentoReceber.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_documento") {
      const doc = data;
      await prisma.documentoGerado.upsert({
        where: { id: doc.id },
        update: {
          titulo: doc.titulo,
          conteudoFinal: doc.conteudoFinal,
          pdfUrl: doc.pdfUrl,
        },
        create: {
          id: doc.id,
          modeloId: doc.modeloId,
          clienteId: doc.clienteId,
          veiculoId: doc.veiculoId,
          outorgadoId: doc.outorgadoId,
          vendaId: doc.vendaId,
          titulo: doc.titulo,
          conteudoFinal: doc.conteudoFinal,
          pdfUrl: doc.pdfUrl,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_documento") {
      await prisma.documentoGerado.delete({ where: { id } }).catch(() => null);
      return NextResponse.json({ success: true });
    }

    if (action === "save_user") {
      const u = data;
      await prisma.user.upsert({
        where: { id: u.id },
        update: {
          nome: u.nome,
          email: u.email,
          cargo: u.cargo,
          role: u.role,
          telefone: u.telefone,
          ativo: u.ativo,
        },
        create: {
          id: u.id,
          nome: u.nome,
          email: u.email,
          cargo: u.cargo,
          role: u.role,
          telefone: u.telefone,
          ativo: u.ativo,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "save_credential") {
      const { userId, email, passwordHash } = data;
      await prisma.credential.upsert({
        where: { userId },
        update: { email, passwordHash },
        create: { userId, email, passwordHash },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na rota POST /api/sync:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
