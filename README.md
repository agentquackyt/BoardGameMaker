# Boardgame Maker
## The idea
A few months ago, I created a card game and actually send it in. While my game itself was rejected by the publisher, I still had the passion to create more cool games. However I relized something: There is not a single open source all-in-one solution for creating games from the ground up, a misstand i want to change with this project.

It is important to mention, that this project will have limitations, probably even a lot, and will not be suitable to build actual release card and boardgames. But this is not my mission. I want to make it simple for everyone to create own cardgame prototypes, which you can print yourself and play with your friends.

## The current state
Almost 11h into the project (which will probably the first flavortown version) I have created the first suitable version of the card designer (which will be the core component for now, because every game needs cards). This is a first step, I plan to implement the ability to "program" the game logic using "Blockly" components (the blocks that are used by e.g. Scratch), fine tuned for board and card games. Then, based of the logic specified, you should be able to generate the game instructions using a finetuned, prompted Google Gemini API model (because they provide a free tier and the best developer portal). 

## How does the Card designer work? (Tutorial)
### Starting a new project
In the top right corner there is a menu 'File>New deck'. Right after that click the name next to "Card Designer" on the top-left and change the name in the modal.
Projects are autosaved as drafts (e.g. if you reload the page by accident), but should be saved properly under 'File>Save' or with CMD/STRG+S

### Getting started with templates
Every card has a template with holds the layout and possible variables. Therefore "Card" refers to a template object with data, while "Template" refers to the styling itself.

1. Click on the document tab on the left side
2. By default, there will be a template called "Layout 1". Click edit to modify the template.
3. You can now change the name and add variables by comma seperating them.
4. Then click on Apply

You may now use variables in the notation '{VARIABLE_NAME}' in the Elements content field, to make it dynamic.

## Techstack
I try to have as few dependencies as possible. For now, only the Bun runtime and the "blockly" npm package are required (as well as sub dependenies by those). All services are served by a simple Bun Serve dev server:

```ts
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
```

## AI declaration
AI has been used in the form of Github Copilot (e.g. Inline Completions). AI has NOT been used for the README or the devlogs