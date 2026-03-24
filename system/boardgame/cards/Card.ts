import { BlockInterface, type BlocklyDescriptionAI } from "../abstract/BlockInterface";

type CardStyle = "image" | "color" | "default";

interface CardStyleInterface {
    type: CardStyle;
    background: string;
    textColor: string;
    additionalStyles?: Record<string, string>;
}

type CardLayoutElementType = "text" | "image";
interface CardLayoutElement {
    type: CardLayoutElementType;
    posX: number;
    posY: number;
    width: number;
    height: number;
    content: string;
    centered?: boolean;
    style?: CardStyleInterface;
}

interface CardSpecification {
    uuid: string;
    height: number;
    width: number;

    layout: CardLayoutElement[];

    front: CardStyleInterface;
    back: CardStyleInterface;
}

class Card {
    readonly _spec: CardSpecification;
    readonly _data: Record<string, any>;

    constructor(spec: CardSpecification, data: Record<string, any>) {
        this._spec = spec;
        this._data = data;
    }

    getDescriptionForAI(): BlocklyDescriptionAI {
        return {
            type: "dataholder.card",
            description: "A card with a front and back side, used in board games. The card can have various layouts and styles.",
            properties: {
                uuid: "Unique identifier for the card",
                height: "Height of the card in mm",
                width: "Width of the card in mm",
                layout: "Array of layout elements that define the content using a key and define the style of the element",
                front: "Style information for the front side of the card",
                back: "Style information for the back side of the card"
            }
        }
    }

    
    public getSpecifications() : CardSpecification {
        return this._spec;
    }

    public getData() : Record<string, any> {
        return this._data;
    }

    private applyStyles(element: HTMLElement, styles?: Record<string, string>) {
        if (!styles) {
            return;
        }

        for (const [key, value] of Object.entries(styles)) {
            element.style.setProperty(key, value);
        }
    }

    private resolveContent(content: string) {
        return content.replace(/\{([^}]+)\}/g, (_match, token: string) => {
            const value = this._data[token.trim()];

            if (value === null || value === undefined) {
                return "";
            }

            return String(value);
        });
    }
    
    public getRender() : HTMLElement {
        const cardElement = document.createElement("div");
        cardElement.classList.add("boardgame-element", "card");
        cardElement.dataset.uuid = this._spec.uuid;
        cardElement.style.position = "relative";
        cardElement.style.display = "block";
        cardElement.style.overflow = "hidden";
        cardElement.style.boxSizing = "border-box";
        cardElement.style.borderRadius = "3mm";
        cardElement.style.border = "0.35mm solid rgba(0, 0, 0, 0.12)";
        cardElement.style.boxShadow = "0 1mm 3mm rgba(0, 0, 0, 0.15)";
        cardElement.style.width = `${this._spec.width}mm`;
        cardElement.style.height = `${this._spec.height}mm`;
        cardElement.style.backgroundColor = this._spec.front.background;
        cardElement.style.color = this._spec.front.textColor;
        this.applyStyles(cardElement, this._spec.front.additionalStyles);

        // Render layout elements
        for (const element of this._spec.layout) {
            const elementDiv = document.createElement("div");
            elementDiv.classList.add("card-layout-element");
            elementDiv.style.position = "absolute";
            elementDiv.style.left = `${element.posX}mm`;
            elementDiv.style.top = `${element.posY}mm`;
            elementDiv.style.width = `${element.width}mm`;
            elementDiv.style.height = `${element.height}mm`;
            elementDiv.style.boxSizing = "border-box";
            elementDiv.style.overflow = "hidden";

            if (element.centered) {
                elementDiv.style.transform = "translate(-50%, -50%)";
                elementDiv.style.display = "flex";
                elementDiv.style.alignItems = "center";
                elementDiv.style.justifyContent = "center";
                elementDiv.style.textAlign = "center";
            }

            if (element.type === "text") {
                elementDiv.textContent = this.resolveContent(element.content);
            } else if (element.type === "image") {
                const img = document.createElement("img");
                img.src = this.resolveContent(element.content);
                img.alt = this.resolveContent(element.content);
                img.style.display = "block";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "contain";
                elementDiv.appendChild(img);
            }

            if (element.style) {
                elementDiv.style.backgroundColor = element.style.background;
                elementDiv.style.color = element.style.textColor;
                this.applyStyles(elementDiv, element.style.additionalStyles);
            }
            cardElement.appendChild(elementDiv);
        }

        return cardElement;
    }
}

export { Card, type CardSpecification, type CardStyleInterface, type CardLayoutElement };