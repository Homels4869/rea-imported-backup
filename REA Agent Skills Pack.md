# REA Agent Skills Pack

Pacote multiplataforma de skills do projeto [REA — Reverse Engineer Anything](https://github.com/Lucas-Belucci-Bellini/rea), preparado para **Claude Code**, **Codex** e **ChatGPT**.

## Conteúdo

| Skill | Para que serve |
|---|---|
| `reverse-engineer-anything` | Investigar apps, binários e comportamento em runtime com REA; prioriza evidências, limitações e conclusões verificáveis. |
| `rea-tool-design` | Projetar ou alterar ferramentas, contratos CLI/MCP, capacidades de providers e semântica de Evidence no REA. |
| `rea-changelog-update` | Preparar changelogs e notas de release rastreáveis a partir do histórico Git e de contribuições verificadas. |
| `rea-ci-tests-audit` | Auditar confiabilidade, cobertura e custo de CI/testes sem enfraquecer os gates. |

Cada pasta em `skills/` contém `SKILL.md` e os arquivos de referência necessários.

## Claude Code

Extraia o ZIP e copie as pastas de `skills/` para `~/.claude/skills/` (skills pessoais) ou para `<projeto>/.claude/skills/` (somente naquele projeto). Exemplo no macOS/Linux, a partir da raiz extraída:

```bash
mkdir -p ~/.claude/skills
cp -R skills/* ~/.claude/skills/
```

Se já houver uma pasta com o mesmo nome, compare/mescle antes de substituir.

## Codex

Copie as pastas para `~/.agents/skills/` (pessoais) ou `<projeto>/.agents/skills/` (escopo do projeto):

```bash
mkdir -p ~/.agents/skills
cp -R skills/* ~/.agents/skills/
```

O Codex pode precisar reiniciar/recarregar a sessão para detectar skills recém-instaladas.

## Instalação rápida (Claude Code e/ou Codex)

O script `install.sh` instala apenas o destino selecionado e cria backup datado de pastas existentes antes de atualizá-las:

```bash
./install.sh claude
./install.sh codex
./install.sh both
```

Para destinos de projeto, defina `CLAUDE_SKILLS_DIR` e/ou `CODEX_SKILLS_DIR` com o caminho completo antes de executar. O script não altera configuração MCP nem instala o REA; ele somente copia as skills.

## ChatGPT

ChatGPT não lê automaticamente os diretórios `SKILL.md` locais usados por Claude Code/Codex. Use a adaptação incluída:

1. Crie um **Projeto** no ChatGPT (ou um GPT personalizado, se disponível na sua conta).
2. Abra `chatgpt/CHATGPT-INSTRUCTIONS.md` e cole o conteúdo nas instruções do Projeto/GPT. Se o campo tiver limite menor, use o arquivo como referência de conhecimento e cole a seção “Instruções essenciais”.
3. Envie ao Projeto/GPT os arquivos da pasta `skills/reverse-engineer-anything/` como conhecimento. Se for usar tarefas de manutenção do REA, envie também as pastas das skills especializadas correspondentes.
4. Para análise com ferramentas, conecte o servidor MCP do REA ao cliente/sessão ChatGPT quando esse recurso estiver disponível na sua conta. A skill contém instruções; ela não instala nem fornece o servidor MCP.

As instruções adaptadas preservam as regras centrais da skill de engenharia reversa e indicam como consultar as referências. O uso de MCP depende da disponibilidade e configuração no cliente ChatGPT.

## Requisitos e limites

- O pack contém instruções; não inclui o binário/servidor REA nem instala Hopper, Ghidra, IDA, adb ou outros providers.
- Para chamar ferramentas MCP, configure o REA separadamente conforme o guia oficial de instalação do repositório.
- A disponibilidade de recursos depende do cliente, host, provider instalado e versão do REA. Siga os schemas efetivamente anunciados pela sessão.
- Skills de changelog, desenho de ferramentas e auditoria CI são voltadas a quem desenvolve/mantém o próprio REA; para uso normal do REA, comece por `reverse-engineer-anything`.
