# Priority Amazonia

Versão pública do cartaz interativo **PRIORITY AMAZONIA**, construída com p5.js.

## Configuração publicada

- Densidade: `1.2`
- Atração: `0.3`
- Texto e fumaça: preto
- Fundo: branco
- Rolagem vertical liberada com `touch-action: pan-y`
- Sem painel ou controles visuais

O lettering inteiro é formado por partículas. Somente os pontos acima da área de transição liberam fumaça, que acompanha o ponteiro. Os valores publicados são fixos para manter a composição consistente dentro do iframe.

## Uso em iframe

Use a URL do GitHub Pages como valor de `src`. Para ocupar o contêiner sem borda:

```html
<iframe
  src="https://feebarba.github.io/priority-amazonia/"
  title="Priority Amazonia"
  style="display:block;width:100%;height:600px;border:0;touch-action:pan-y"
  loading="lazy"
></iframe>
```

## Arquivos

- `index.html`: estrutura mínima do cartaz.
- `style.css`: layout responsivo e comportamento de toque.
- `sketch.js`: partículas, fumaça, cursor e cores.
- `lettering.svg`: contornos originais do cartaz.
