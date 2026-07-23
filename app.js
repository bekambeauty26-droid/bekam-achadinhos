const URL_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTn_Krigi_cB04M37KeWFDY4nvSjkVQl2TylZgEshlpX5g__E7DhCol6_B7xeQunRJvTv_ms5ilucu4/pub?gid=1244445931&single=true&output=csv";

const LIMITE_POR_CATEGORIA = 2;

const mensagem = document.getElementById("mensagem");
const gradeCategorias = document.getElementById("gradeCategorias");

function normalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function prepararLink(valor) {
  const link = String(valor ?? "").trim();

  if (
    link.startsWith("https://") ||
    link.startsWith("http://")
  ) {
    return link;
  }

  return "#";
}

function formatarPreco(valor) {
  const preco = String(valor ?? "").trim();

  if (!preco) {
    return "Consulte a oferta";
  }

  if (/^r\$/i.test(preco)) {
    return preco;
  }

  const numero = preco
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!numero) {
    return "Consulte a oferta";
  }

  return `R$ ${numero}`;
}

function lerCSV(texto) {
  const linhas = [];

  let linhaAtual = [];
  let campoAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i];
    const proximo = texto[i + 1];

    if (
      caractere === '"' &&
      dentroDeAspas &&
      proximo === '"'
    ) {
      campoAtual += '"';
      i++;
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = !dentroDeAspas;
      continue;
    }

    if (
      caractere === "," &&
      !dentroDeAspas
    ) {
      linhaAtual.push(campoAtual);
      campoAtual = "";
      continue;
    }

    if (
      (caractere === "\n" ||
        caractere === "\r") &&
      !dentroDeAspas
    ) {
      if (
        caractere === "\r" &&
        proximo === "\n"
      ) {
        i++;
      }

      linhaAtual.push(campoAtual);

      if (
        linhaAtual.some(
          campo => campo.trim() !== ""
        )
      ) {
        linhas.push(linhaAtual);
      }

      linhaAtual = [];
      campoAtual = "";
      continue;
    }

    campoAtual += caractere;
  }

  linhaAtual.push(campoAtual);

  if (
    linhaAtual.some(
      campo => campo.trim() !== ""
    )
  ) {
    linhas.push(linhaAtual);
  }

  return linhas;
}

function criarObjetos(linhas) {
  if (linhas.length < 2) {
    return [];
  }

  const cabecalhos = linhas[0].map(
    cabecalho => normalizarTexto(cabecalho)
  );

  return linhas.slice(1).map(linha => {
    const produto = {};

    cabecalhos.forEach(
      (cabecalho, indice) => {
        produto[cabecalho] =
          linha[indice] ?? "";
      }
    );

    return produto;
  });
}

function ordenarProdutos(produtos) {
  return [...produtos].sort((a, b) => {
    const ordemA =
      Number(String(a.ordem).replace(",", ".")) ||
      999999;

    const ordemB =
      Number(String(b.ordem).replace(",", ".")) ||
      999999;

    return ordemA - ordemB;
  });
}

function agruparPorCategoria(produtos) {
  const grupos = new Map();

  produtos.forEach(produto => {
    const categoriaOriginal =
      String(produto.categoria ?? "").trim() ||
      "Outros achadinhos";

    const chave =
      normalizarTexto(categoriaOriginal);

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        nome: categoriaOriginal,
        produtos: []
      });
    }

    grupos
      .get(chave)
      .produtos
      .push(produto);
  });

  return Array.from(grupos.values());
}

function criarCardProduto(produto) {
  const nome =
    String(produto.produto ?? "").trim() ||
    "Produto selecionado";

  const imagem =
    String(produto.imagem ?? "").trim();

  const preco =
    formatarPreco(
      produto.preco ?? produto["preço"]
    );

  const link =
    prepararLink(produto.link);

  const imagemHTML = imagem
    ? `
      <img
        src="${escaparHTML(imagem)}"
        alt="${escaparHTML(nome)}"
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="this.parentElement.classList.add('imagem-com-erro'); this.remove();">
    `
    : `
      <span class="sem-imagem">
        Sem imagem
      </span>
    `;

  const botaoHTML = link !== "#"
    ? `
      <a
        class="botao-oferta"
        href="${escaparHTML(link)}"
        target="_blank"
        rel="noopener noreferrer">
        VER OFERTA
      </a>
    `
    : `
      <span class="botao-oferta botao-desativado">
        VER OFERTA
      </span>
    `;

  return `
    <article class="card-produto">

      <div class="imagem-produto">
        ${imagemHTML}
      </div>

      <div class="dados-produto">

        <h3 class="nome-produto">
          ${escaparHTML(nome)}
        </h3>

        <div class="preco-produto">
          ${escaparHTML(preco)}
        </div>

        ${botaoHTML}

      </div>

    </article>
  `;
}

function criarBlocoCategoria(grupo) {
  const produtosLimitados =
    ordenarProdutos(grupo.produtos)
      .slice(0, LIMITE_POR_CATEGORIA);

  const cards =
    produtosLimitados
      .map(criarCardProduto)
      .join("");

  return `
    <section class="bloco-categoria">

      <h2 class="titulo-categoria">
        ${escaparHTML(grupo.nome)}
      </h2>

      <div class="lista-produtos">
        ${cards}
      </div>

    </section>
  `;
}

async function carregarProdutos() {
  try {
    mensagem.style.display = "block";
    mensagem.textContent =
      "Carregando produtos...";

    const resposta = await fetch(
      `${URL_CSV}&atualizacao=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `Erro ao carregar a planilha: ${resposta.status}`
      );
    }

    const textoCSV =
      await resposta.text();

    const linhas =
      lerCSV(textoCSV);

    const produtos =
      criarObjetos(linhas);

    const produtosAtivos =
      produtos.filter(produto => {
        const ativo =
          normalizarTexto(produto.ativo);

        return (
          ativo === "sim" ||
          ativo === "s" ||
          ativo === "true" ||
          ativo === "1"
        );
      });

    if (produtosAtivos.length === 0) {
      mensagem.textContent =
        "Nenhum produto ativo encontrado.";

      gradeCategorias.innerHTML = "";
      return;
    }

    const grupos =
      agruparPorCategoria(produtosAtivos);

    gradeCategorias.innerHTML =
      grupos
        .map(criarBlocoCategoria)
        .join("");

    mensagem.style.display = "none";

  } catch (erro) {
    console.error(erro);

    mensagem.textContent =
      "Não foi possível carregar os produtos no momento.";

    gradeCategorias.innerHTML = "";
  }
}

carregarProdutos();
