import { initBotId } from "botid/client/core";

// Cobre os endpoints públicos sem autenticação mais expostos a spam/flood:
// registrarLead (captura de instalação, global no root layout, qualquer
// rota) e enviarCandidatura (candidatura a vaga). Wildcard cobre as duas
// sem precisar fixar uma lista de rotas que muda conforme o app cresce.
initBotId({
  protect: [{ path: "/*", method: "POST" }],
});
