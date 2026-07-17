# CDN de Integração: Agendamento Capef

Este repositório armazena os arquivos de integração do sistema de agendamento da **Capef**. O objetivo é disponibilizar via CDN os scripts necessários para o funcionamento do front-end nos ambientes Webflow.

## 🚀 Funcionalidades
*   **Gestão de Calendário:** Integração com feriados dinâmicos via `removerFeriadosDaLista`.
*   **Performance:** Uso de requisições em paralelo (`Promise.all`) para carregamento otimizado.
*   **Segurança:** Implementação de  mascaramento de campos (CPF/Telefone).

## 📁 Estrutura do Projeto
*   `agendamento.js`: Script principal de integração.
*   `README.md`: Documentação.

## ⚙️ Configurações Importantes
*   **Endpoints(HML):** O script consome APIs hospedadas em `apiagendamento.capef.com.br` e `apiarearestritagenericainthm.capef.com.br`.
*   **CORS:** Certifique-se de que o backend esteja configurado para aceitar requisições de origem cruzada para os domínios da Capef.
*   **Segurança:** As credenciais de autenticação (`authUserName`, `authPassword`) são gerenciadas internamente para comunicação com a API de tokens.

## 🛠️ Manutenção e Desenvolvimento
### Como atualizar o script:
1. Faça as alterações no arquivo `agendamento.js`.
2. Realize o commit e envie para a branch principal (`main`).
3. O link da CDN (via [jsDelivr](https://www.jsdelivr.com/)) atualizará automaticamente conforme a versão (tag ou branch).

### Notas de Performance:
*   O script utiliza `requestIdleCallback` para garantir que o carregamento da página não seja bloqueado (otimização de TBT).
*   Foram aplicadas tags `preconnect` para as APIs para reduzir o tempo de latência de rede.
