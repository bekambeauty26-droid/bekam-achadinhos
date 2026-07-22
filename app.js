/* =========================================
   ACHADINHOS DA BEKINHA
   Leitura da planilha e criação dos produtos
========================================= */

const URL_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTn_Krigi_cB04M37KeWFDY4nvSjkVQl2TylZgEshlpX5g__E7DhCol6_B7xeQunRJvTv_ms5ilucu4/pub?gid=1244445931&single=true&output=csv";

/*
  Coloque posteriormente os links corretos abaixo.
  Por enquanto, podem permanecer com "#".
*/

const URL_CATALOGO = "#";
const URL_GRUPO_VIP = "#";

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
  configurarLinksFinais();

  try {
    const resposta = await fetch(URL_CSV, {
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(
        `Não foi possível acessar a planilha. Erro: ${resposta.status}`
      );
    }

    const textoCSV = await resposta.text();
    const linhas = lerCSV(textoCSV);

    if (linhas.length < 2) {
      throw new Error("A planilha está vazia ou sem produtos.");
    }

    const produtos = transformarEmProdutos(linhas);
    const produtosAtivos = filtrarEOrdenarProdutos(produtos);

    exibirCategorias(produtosAtivos);
  } catch (erro) {
    console.error(erro);
    exibirErro(
      "Não foi possível carregar os produtos neste momento. Tente atualizar a página."
    );
  }
}

/* =========================================
   CONFIGURAÇÃO DOS BOTÕES FINAIS
========================================= */

function configurarLinksFinais() {
  const linkCatalogo = document.getElementById("link-catalogo");
  const linkGrupoVIP = document.getElementById("link-grupo-vip");

  configurarLink(linkCatalogo, URL_CATALOGO);
  configurarLink(linkGrupoVIP, URL_GRUPO_VIP);
}

function configurarLink(elemento, url) {
  if (!elemento) {
    return;
  }

  if (url && url !== "#") {
    elemento.href = url;
    elemento.target = "_blank";
    elemento.rel = "noopener noreferrer";
  } else {
    elemento.href = "#";
    elemento.addEventListener("click", function (evento) {
      evento.preventDefault();
    });
  }
}

/* =========================================
   LEITURA DO CSV
========================================= */

function lerCSV(texto) {
  const linhas = [];
  let linhaAtual = [];
  let campoAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i];
    const proximoCaractere = texto[i + 1];

    if (caractere === '"') {
      if (dentroDeAspas && proximoCaractere === '"') {
        campoAtual += '"';
        i++;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }

      continue;
    }

    if (caractere === "," && !dentroDeAspas) {
      linhaAtual.push(campoAtual.trim());
      campoAtual = "";
      continue;
    }

    if (
      (caractere === "\n" || caractere === "\r") &&
      !dentroDeAspas
    ) {
      if (caractere === "\r" && proximoCaractere === "\n") {
        i++;
      }

      linhaAtual.push(campoAtual.trim());

      const possuiConteudo = linhaAtual.some(
        (campo) => campo.trim() !== ""
      );

      if (possuiConteudo) {
        linhas.push(linhaAtual);
      }

      linhaAtual = [];
      campoAtual = "";
      continue;
    }

    campoAtual += caractere;
  }

  if (campoAtual !== "" || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual.trim());

    const possuiConteudo = linhaAtual.some(
      (campo) => campo.trim() !== ""
    );

    if (possuiConteudo) {
      linhas.push(linhaAtual);
    }
  }

  return linhas;
}

/* =========================================
   TRANSFORMAÇÃO DA PLANILHA
========================================= */

function transformarEmProdutos(linhas) {
  const cabecalhos = linhas[0].map(normalizarTexto);

  return linhas.slice(1).map((linha) => {
    const produto = {};

    cabecalhos.forEach((cabecalho, indice) => {
      produto[cabecalho] = (linha[indice] || "").trim();
    });

    return {
      id: produto.id || "",
      nome: produto.produto || "",
      preco: produto.preco || "",
      imagem: produto.imagem || "",
      link: produto.link || "",
      descricao: produto.descricao || "",
      categoria: produto.categoria || "Outros achadinhos",
      destaque: produto.destaque || "",
      ativo: produto.ativo || "",
      marketplace: produto.marketplace || "",
      ordem: produto.ordem || ""
    };
  });
}

function filtrarEOrdenarProdutos(produtos) {
  return produtos
    .filter((produto) => {
      const ativo = normalizarTexto(produto.ativo);

      return (
        ativo === "sim" &&
        produto.nome !== "" &&
        produto.categoria !== ""
      );
    })
    .sort((produtoA, produtoB) => {
      const ordemA = converterOrdem(produtoA.ordem);
      const ordemB = converterOrdem(produtoB.ordem);

      return ordemA - ordemB;
    });
}

function converterOrdem(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 999999;
}

/* =========================================
   ORGANIZAÇÃO POR CATEGORIA
========================================= */

function agruparPorCategoria(produtos) {
  const categorias = new Map();

  produtos.forEach((produto) => {
    const nomeCategoria = produto.categoria.trim();

    if (!categorias.has(nomeCategoria)) {
      categorias.set(nomeCategoria, []);
    }

    /*
      Mostra no máximo dois produtos por categoria.
    */

    if (categorias.get(nomeCategoria).length < 2) {
      categorias.get(nomeCategoria).push(produto);
    }
  });

  return categorias;
}

/* =========================================
   EXIBIÇÃO DOS PRODUTOS
========================================= */

function exibirCategorias(produtos) {
  const areaCategorias = document.getElementById("categorias");

  if (!areaCategorias) {
    return;
  }

  if (produtos.length === 0) {
    areaCategorias.innerHTML = `
      <p class="mensagem-erro">
        Nenhum produto ativo foi encontrado na planilha.
      </p>
    `;

    return;
  }

  const categorias = agruparPorCategoria(produtos);

  let html = "";

  categorias.forEach((listaProdutos, nomeCategoria) => {
    html += `
      <section class="categoria-bloco">

        <h3 class="categoria-titulo">
          ${escaparHTML(nomeCategoria)}
        </h3>

        <div class="categoria-produtos">
          ${listaProdutos.map(criarCardProduto).join("")}
        </div>

      </section>
    `;
  });

  areaCategorias.innerHTML = html;
  configurarErrosDeImagem();
}

function criarCardProduto(produto) {
  const nome = escaparHTML(produto.nome);
  const preco = escaparHTML(formatarPreco(produto.preco));
  const imagem = prepararURL(produto.imagem);
  const link = prepararURL(produto.link);

  const imagemHTML = imagem
    ? `
      <img
        class="produto-imagem"
        src="${escaparAtributo(imagem)}"
        alt="${escaparAtributo(produto.nome)}"
        loading="lazy"
      >
    `
    : `
      <div class="produto-sem-imagem">
        Produto
      </div>
    `;

  const botaoHTML = link
    ? `
      <a
        class="produto-botao"
        href="${escaparAtributo(link)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Ver oferta
      </a>
    `
    : `
      <span class="produto-botao produto-botao-inativo">
        Oferta indisponível
      </span>
    `;

  return `
    <article class="produto-card">

      <div class="produto-imagem-area">
        ${imagemHTML}
      </div>

      <div class="produto-conteudo">

        <h4 class="produto-nome">
          ${nome}
        </h4>

        <p class="produto-preco">
          ${preco}
        </p>

        ${botaoHTML}

      </div>

    </article>
  `;
}

/* =========================================
   TRATAMENTO DE PREÇO E LINKS
========================================= */

function formatarPreco(preco) {
  const valor = preco.trim();

  if (!valor) {
    return "Consulte a oferta";
  }

  if (valor.toLowerCase().includes("r$")) {
    return valor;
  }

  return `R$ ${valor}`;
}

function prepararURL(url) {
  const valor = url.trim();

  if (!valor) {
    return "";
  }

  try {
    const endereco = new URL(valor);

    if (
      endereco.protocol === "https:" ||
      endereco.protocol === "http:"
    ) {
      return endereco.href;
    }
  } catch (erro) {
    return "";
  }

  return "";
}

/* =========================================
   IMAGENS COM ERRO
========================================= */

function configurarErrosDeImagem() {
  const imagens = document.querySelectorAll(".produto-imagem");

  imagens.forEach((imagem) => {
    imagem.addEventListener("error", function () {
      const areaImagem = imagem.closest(".produto-imagem-area");

      if (areaImagem) {
        areaImagem.innerHTML = `
          <div class="produto-sem-imagem">
            Imagem indisponível
          </div>
        `;
      }
    });
  });
}

/* =========================================
   MENSAGEM DE ERRO
========================================= */

function exibirErro(mensagem) {
  const areaCategorias = document.getElementById("categorias");

  if (!areaCategorias) {
    return;
  }

  areaCategorias.innerHTML = `
    <p class="mensagem-erro">
      ${escaparHTML(mensagem)}
    </p>
  `;
}

/* =========================================
   SEGURANÇA E NORMALIZAÇÃO
========================================= */

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escaparHTML(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escaparAtributo(texto) {
  return escaparHTML(texto);
}
