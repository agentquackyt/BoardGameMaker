import landingHtml from "./views/landing/index.html";
import logicHtml from "./views/gamelogic/index.html";
import cardDesignerHtml from "./views/designer/card/index.html";

let server = Bun.serve({
    port: Number(process.env.PORT ?? "3001"),
    routes: {
        "/": landingHtml,
        "/logic": logicHtml,
        "/designer/card": cardDesignerHtml
    },
    fetch(req: Request) {
        return new Response("Hello World");
    }
});

console.log(Bun.color("#03c758", "ansi") + `Server running at http://localhost:${server.port}`);