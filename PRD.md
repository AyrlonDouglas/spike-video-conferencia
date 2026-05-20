## Problema

A nova versão da Api.Saúde necessita suportar consultas online entre “Profissional de Saúde” e “Paciente”, garantindo estabilidade, escalabilidade e capacidade de expansão para outros produtos do ecossistema Clin&Co.

Atualmente a solução depende do “Go Rooms” da Twilio, porém existe necessidade de avaliar:

- escalabilidade financeira
- desacoplamento da solução
- reaproveitamento entre produtos
- flexibilidade arquitetural
- capacidade operacional da feature
- problemas técnicos de “desencontros” nas consultas

Além disso, o ecossistema já possui experiência com a utilização da GetStream para funcionalidades realtime.

---

## Hipótese

### H1 — Solução acoplada à Api.Saúde

Implementar a capability de vídeo diretamente na Api.Saúde pode reduzir complexidade inicial e acelerar a entrega do MVP, porém pode aumentar acoplamento técnico e dificultar reutilização futura por outros produtos.

---

### H2 — Solução desacoplada/shared capability

Criar uma capability desacoplada de vídeo pode aumentar reutilização entre produtos, reduzir lock-in e facilitar expansão futura, porém pode aumentar complexidade inicial e custo arquitetural.

---

### H3 — Reutilização de provider realtime já conhecido

A utilização de um provider já adotado pelo ecossistema pode reduzir curva de aprendizado operacional e acelerar integração.

---

## Objetivos

- Permitir realização de consultas online entre profissionais de saúde e paciente
- Garantir estabilidade mínima da sessão de vídeo
- Reduzir dependência de implementação específica da Api.Saúde
- Possibilitar reutilização da capability por outros produtos
- Possuir viabilidade financeira para crescimento operacional

---

## Cenários

### Cenário 1: Médico e Paciente se conectando em uma chamada

> O médico entrar na chamada de vídeo e aguardar o paciente entrar na chamada, com isso, os dois estarão em uma consulta online - com uma vigência de em média 60 minutos e no final os dois finalizarão a chamada;

### Cenário 2: Médico e/ou Paciente não se conectar

> O médico ou o Paciente entrar na chamada e aguardar o outro entrar - neste cenário um dos dois não entra - desta forma, um deles finalizará a chamada e sairá sem realização do atendimento

### Cenário 3: Médico e Paciente se conectam e um deles deverá se reconectar

> O médico e o Paciente estarão na chamada e um dos dois terá um problema que fará ele se desconectar da chamada - desta forma, deverá ser possível continuar a chamada a partir de uma reconexão

### Cenário 4: Médico encerrar a chamada

> O médico entra na chamada aguarda o seu tempo limite de consulta, o médico deverá conseguir finalizar a chamada,  indicando que o paciente não vai conseguir mais entrar na chamada (será vetado de entrar na consulta após a finalização)

---

## Riscos

### Arquitetura

- criar solução excessivamente acoplada à Api.Saúde
- dificultar reutilização futura

### Operação

- instabilidade em reconexão
- gerenciamento inconsistente de sessão
- timeout incorreto

### Financeiro

- crescimento não sustentável do custo por minuto
- cobrança por participante/sessão

### Produto

- dificuldade de suporte operacional
- dependência de comportamento do provider

